"""MQTT subscriber — subscribe to sensor topics and forward to the ingest API."""

import argparse
import gzip
import json
import os
import queue
import signal
import sys
import threading
import time
import uuid
from typing import Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

import requests
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

API_BASE = "http://localhost:8000"
TOPIC_PREFIX = "enviroswarm/sensors/#"


def _safe_int(env_var: str, default: int) -> int:
    try:
        return int(os.getenv(env_var, str(default)))
    except (ValueError, TypeError):
        return default


def _safe_float(env_var: str, default: float) -> float:
    try:
        return float(os.getenv(env_var, str(default)))
    except (ValueError, TypeError):
        return default


DEFAULT_MAX_QUEUE_SIZE = _safe_int("MQTT_MAX_QUEUE_SIZE", 1000)
DEFAULT_INGEST_TIMEOUT = _safe_float("MQTT_INGEST_TIMEOUT", 10)
DEFAULT_INGEST_RETRY = _safe_int("MQTT_INGEST_RETRY", 3)


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT Sub] Connected. Subscribing...")
        client.subscribe(TOPIC_PREFIX, qos=1)
    else:
        print(f"[MQTT Sub] Connection failed with code {rc}")


def _on_disconnect(client, userdata, rc):
    print(f"[MQTT Sub] Disconnected with code {rc}")


def _post_with_retry(
    session: requests.Session,
    api_base: str,
    payload: dict,
    auth_token: Optional[str],
    ingest_timeout: float,
    max_retries: int,
) -> bool:
    """POST payload to ingest API with retry, gzip, and 413 handling."""
    api_url = f"{api_base}/api/v1/ingest"
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    body = {"readings": [payload]}
    raw_json = json.dumps(body).encode("utf-8")
    if len(raw_json) > 1024:
        compressed = gzip.compress(raw_json)
        headers["Content-Encoding"] = "gzip"
        data = compressed
    else:
        data = raw_json
    headers["Content-Type"] = "application/json"
    headers["X-Idempotency-Key"] = str(uuid.uuid4())

    for attempt in range(max_retries + 1):
        try:
            resp = session.post(
                api_url,
                data=data,
                headers=headers,
                timeout=ingest_timeout,
            )
            if resp.status_code == 413:
                # Single message too large — can't split further, drop and log
                print(f"[MQTT Sub] 413 Payload Too Large (attempt {attempt + 1}), dropping message")
                return False
            if resp.status_code == 200:
                try:
                    body_json = resp.json()
                    if body_json.get("success"):
                        print("[MQTT Sub] Forwarded -> API OK")
                        return True
                    else:
                        print(f"[MQTT Sub] API success=False: {body_json.get('error', 'unknown')}")
                        return False
                except Exception:
                    print("[MQTT Sub] Forwarded -> API OK (non-JSON response)")
                    return True
            elif resp.status_code in (408, 429, 500, 502, 503, 504):
                if attempt < max_retries:
                    wait = min(2 ** attempt, 8)
                    print(f"[MQTT Sub] API error {resp.status_code}, retrying in {wait}s...")
                    time.sleep(wait)
                    continue
                else:
                    print(f"[MQTT Sub] API error {resp.status_code}: {resp.text[:200]}")
                    return False
            else:
                print(f"[MQTT Sub] API error {resp.status_code}: {resp.text[:200]}")
                return False
        except requests.RequestException as e:
            if attempt < max_retries:
                wait = min(2 ** attempt, 8)
                print(f"[MQTT Sub] API request failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
                time.sleep(wait)
            else:
                print(f"[MQTT Sub] API request failed after {max_retries + 1} attempts: {e}")
                return False
    return False


def _start_worker(
    session: requests.Session,
    api_base: str,
    auth_token: Optional[str],
    max_queue_size: int = DEFAULT_MAX_QUEUE_SIZE,
    ingest_timeout: float = DEFAULT_INGEST_TIMEOUT,
    max_retries: int = DEFAULT_INGEST_RETRY,
) -> tuple:
    """Start a background worker thread that drains a queue and POSTs to the API."""
    q: queue.Queue = queue.Queue(maxsize=max_queue_size)
    stop_event = threading.Event()

    def worker():
        """Worker thread loop with resilience against unhandled exceptions."""
        try:
            while not stop_event.is_set():
                try:
                    payload = q.get(timeout=0.5)
                except queue.Empty:
                    continue

                try:
                    _post_with_retry(
                        session, api_base, payload, auth_token, ingest_timeout, max_retries
                    )
                except Exception as e:
                    print(f"[MQTT Sub] Unhandled worker error during POST: {e}")
                finally:
                    try:
                        q.task_done()
                    except Exception:
                        pass
        except Exception as e:
            print(f"[MQTT Sub] FATAL worker thread error, thread exiting: {e}")

    t = threading.Thread(target=worker, daemon=True)
    t.start()

    def watcher():
        """Watch the worker thread and respawn it if it dies."""
        nonlocal t
        while not stop_event.is_set():
            t.join(timeout=1.0)
            if not stop_event.is_set() and not t.is_alive():
                print("[MQTT Sub] Worker thread died, respawning...")
                t = threading.Thread(target=worker, daemon=True)
                t.start()
            time.sleep(1.0)

    watcher_thread = threading.Thread(target=watcher, daemon=True)
    watcher_thread.start()
    return q, stop_event, t


def _on_message_factory(q: queue.Queue):
    """Build an on_message callback bound to the given queue."""
    def _on_message(client, userdata, msg):
        """Callback when a message arrives on a subscribed topic."""
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except UnicodeDecodeError as e:
            print(f"[MQTT Sub] Invalid UTF-8 on {msg.topic}: {e}")
            return
        except json.JSONDecodeError as e:
            print(f"[MQTT Sub] Invalid JSON on {msg.topic}: {e}")
            return

        try:
            q.put_nowait(payload)
        except queue.Full:
            print(f"[MQTT Sub] Queue full (maxsize={q.maxsize}), dropping message on {msg.topic}")

    return _on_message


def _drain_and_shutdown(q: queue.Queue, worker_thread: threading.Thread, client, timeout: float = 30.0):
    """Gracefully drain the queue and shut down the worker thread."""
    print(f"[MQTT Sub] Draining queue ({q.qsize()} items remaining)...")
    drain_start = time.monotonic()
    while not q.empty() and time.monotonic() - drain_start < timeout:
        time.sleep(0.05)
    remaining = time.monotonic() - drain_start
    worker_thread.join(timeout=max(0.0, timeout - remaining))
    client.loop_stop()
    client.disconnect()
    print("[MQTT Sub] Shutdown complete.")


def start_subscriber(
    broker_host: str = "localhost",
    broker_port: int = 1883,
    api_base: str = "http://localhost:8000",
    topic_prefix: str = "enviroswarm/sensors/#",
    client_id: Optional[str] = None,
    auth_token: Optional[str] = None,
    run_duration_seconds: Optional[float] = None,
    max_queue_size: int = DEFAULT_MAX_QUEUE_SIZE,
    ingest_timeout: float = DEFAULT_INGEST_TIMEOUT,
    max_retries: int = DEFAULT_INGEST_RETRY,
) -> None:
    """Start the MQTT subscriber and optionally run for a fixed duration.

    Args:
        broker_host: MQTT broker hostname.
        broker_port: MQTT broker port.
        api_base: Base URL of the backend API.
        topic_prefix: MQTT topic wildcard to subscribe to.
        client_id: Optional MQTT client ID.
        auth_token: JWT or API key for the ingest endpoint.
        run_duration_seconds: If provided, stop after this many seconds.
        max_queue_size: Max inbound queue size before backpressure (drop + log).
        ingest_timeout: HTTP timeout for each ingest POST.
        max_retries: Max retries per message on transient errors.
    """
    if mqtt is None:
        raise ImportError("paho-mqtt is required. Install it: pip install paho-mqtt")

    global API_BASE, TOPIC_PREFIX
    API_BASE = api_base
    TOPIC_PREFIX = topic_prefix

    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST", "GET"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": "enviroswarm-subscriber/1.0"})

    q, stop_event, worker_thread = _start_worker(
        session, api_base, auth_token, max_queue_size, ingest_timeout, max_retries
    )

    client = mqtt.Client(
        client_id=client_id or "enviroswarm-sub-001",
        clean_session=False,
    )
    client.on_connect = _on_connect
    client.on_message = _on_message_factory(q)
    client.on_disconnect = _on_disconnect

    # Graceful shutdown on SIGTERM (Docker)
    def _signal_handler(signum, frame):
        print(f"[MQTT Sub] Received signal {signum}, shutting down gracefully...")
        stop_event.set()
        _drain_and_shutdown(q, worker_thread, client, timeout=30.0)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _signal_handler)

    try:
        client.connect(broker_host, broker_port, 60)
    except Exception as e:
        print(f"[MQTT Sub] Could not connect to broker {broker_host}:{broker_port}: {e}")
        stop_event.set()
        return

    client.loop_start()

    print(f"[MQTT Sub] Listening on {broker_host}:{broker_port} for {topic_prefix}")
    print(f"[MQTT Sub] Forwarding to {api_base}/api/v1/ingest")
    print(f"[MQTT Sub] Queue maxsize: {max_queue_size}")
    if auth_token:
        print("[MQTT Sub] Authenticated with provided token.")
    else:
        print("[MQTT Sub] WARNING: No auth_token provided. API requests may fail with 401.")

    if run_duration_seconds:
        time.sleep(run_duration_seconds)
        stop_event.set()
        _drain_and_shutdown(q, worker_thread, client, timeout=30.0)
        print("[MQTT Sub] Stopped.")
    else:
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("[MQTT Sub] Stopped by user, shutting down gracefully...")
            stop_event.set()
            _drain_and_shutdown(q, worker_thread, client, timeout=30.0)


def main():
    parser = argparse.ArgumentParser(description="ENViroSwarm MQTT Subscriber")
    parser.add_argument(
        "--broker-host",
        default=os.getenv("MQTT_BROKER_HOST", "localhost"),
        help="MQTT broker host (default: localhost or MQTT_BROKER_HOST env var)",
    )
    parser.add_argument(
        "--broker-port",
        type=int,
        default=_safe_int("MQTT_BROKER_PORT", 1883),
        help="MQTT broker port (default: 1883 or MQTT_BROKER_PORT env var)",
    )
    parser.add_argument(
        "--api-base",
        default=os.getenv("API_BASE", "http://localhost:8000"),
        help="Backend API base URL (default: http://localhost:8000 or API_BASE env var)",
    )
    parser.add_argument(
        "--topic-prefix",
        default="enviroswarm/sensors/#",
        help="MQTT topic prefix (default: enviroswarm/sensors/#)",
    )
    parser.add_argument(
        "--client-id",
        default=os.getenv("MQTT_CLIENT_ID", None),
        help="MQTT client ID",
    )
    parser.add_argument(
        "--auth-token",
        default=os.getenv("AUTH_TOKEN", None),
        help="JWT/API token for ingest endpoint",
    )
    parser.add_argument(
        "--max-queue-size",
        type=int,
        default=DEFAULT_MAX_QUEUE_SIZE,
        help=f"Max inbound queue size (default: {DEFAULT_MAX_QUEUE_SIZE})",
    )
    parser.add_argument(
        "--ingest-timeout",
        type=float,
        default=DEFAULT_INGEST_TIMEOUT,
        help=f"HTTP timeout per ingest POST (default: {DEFAULT_INGEST_TIMEOUT})",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=DEFAULT_INGEST_RETRY,
        help=f"Max retries per message (default: {DEFAULT_INGEST_RETRY})",
    )
    parser.add_argument(
        "--run-duration",
        type=float,
        default=None,
        help="If set, stop after this many seconds",
    )
    args = parser.parse_args()
    start_subscriber(
        broker_host=args.broker_host,
        broker_port=args.broker_port,
        api_base=args.api_base,
        topic_prefix=args.topic_prefix,
        client_id=args.client_id,
        auth_token=args.auth_token,
        max_queue_size=args.max_queue_size,
        ingest_timeout=args.ingest_timeout,
        max_retries=args.max_retries,
        run_duration_seconds=args.run_duration,
    )


if __name__ == "__main__":
    main()
