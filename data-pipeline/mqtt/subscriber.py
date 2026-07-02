"""MQTT subscriber — subscribe to sensor topics and forward to the ingest API."""

import uuid
import argparse
import gzip
import json
import logging
import os
import queue
import signal
import sys
import threading
import time
import datetime
import hashlib
from typing import Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

import requests

from utils import _safe_int, _safe_float

logger = logging.getLogger(__name__)

DEFAULT_MAX_QUEUE_SIZE = _safe_int("MQTT_MAX_QUEUE_SIZE", 1000)
DEFAULT_BATCH_SIZE = _safe_int("MQTT_BATCH_SIZE", 50)
DEFAULT_INGEST_TIMEOUT = _safe_float("MQTT_INGEST_TIMEOUT", 10)
DEFAULT_INGEST_RETRY = _safe_int("MQTT_INGEST_RETRY", 3)


def _persist_dead_letter(batch: list, reason: str) -> None:
    """Persist a failed batch to a dead-letter file for manual replay."""
    if not batch:
        return
    try:
        dl_dir = os.path.join(os.path.dirname(__file__), "..", "dead_letter")
        os.makedirs(dl_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        dl_path = os.path.join(dl_dir, f"dead_letter_{timestamp}_{reason}.jsonl")
        with open(dl_path, "w", encoding="utf-8") as f:
            for item in batch:
                f.write(json.dumps(item) + "\n")
        logger.error("[MQTT Sub] Persisted %s failed reading(s) to dead-letter: %s", len(batch), dl_path)
    except Exception as e:
        logger.error("[MQTT Sub] Failed to persist dead-letter batch: %s", e)


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("[MQTT Sub] Connected. Subscribing...")
        client.subscribe(userdata.get("topic_prefix", "enviroswarm/sensors/#"), qos=1)
    else:
        logger.error("[MQTT Sub] Connection failed with code %s", rc)


def _on_disconnect(client, userdata, rc):
    logger.info("[MQTT Sub] Disconnected with code %s", rc)


def _post_with_retry(
    session: requests.Session,
    api_base: str,
    payloads: list,
    auth_token: Optional[str],
    ingest_timeout: float,
    max_retries: int,
) -> bool:
    """POST a batch of payloads to ingest API with retry, gzip, and 413 handling."""
    api_url = api_base.rstrip('/') + '/api/v1/ingest'
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    body = {"readings": payloads}
    raw_json = json.dumps(body, sort_keys=True).encode("utf-8")
    if len(raw_json) > 1024:
        compressed = gzip.compress(raw_json)
        headers["Content-Encoding"] = "gzip"
        data = compressed
    else:
        data = raw_json
    headers["Content-Type"] = "application/json"
    headers["X-Idempotency-Key"] = hashlib.sha256(raw_json).hexdigest()

    for attempt in range(max_retries + 1):
        try:
            resp = session.post(
                api_url,
                data=data,
                headers=headers,
                timeout=ingest_timeout,
            )
            if resp.status_code == 413:
                if len(payloads) > 1:
                    mid = len(payloads) // 2
                    first_ok = _post_with_retry(session, api_base, payloads[:mid], auth_token, ingest_timeout, max_retries)
                    second_ok = _post_with_retry(session, api_base, payloads[mid:], auth_token, ingest_timeout, max_retries)
                    return first_ok and second_ok
                logger.warning("[MQTT Sub] 413 Payload Too Large (single message), dropping")
                return False
            if resp.status_code < 400:
                try:
                    body_json = resp.json()
                    if body_json.get("success"):
                        logger.info("[MQTT Sub] Forwarded %s reading(s) -> API OK", len(payloads))
                        return True
                    else:
                        logger.error("[MQTT Sub] API success=False: %s", body_json.get("error", "unknown"))
                        return False
                except json.JSONDecodeError:
                    logger.info("[MQTT Sub] Forwarded %s reading(s) -> API OK (non-JSON response)", len(payloads))
                    return True
            elif resp.status_code in (408, 429, 500, 502, 503, 504):
                if attempt < max_retries:
                    wait = min(2 ** attempt, 8)
                    logger.warning("[MQTT Sub] API error %s, retrying in %ss...", resp.status_code, wait)
                    time.sleep(wait)
                    continue
                else:
                    logger.error("[MQTT Sub] API error %s: %s", resp.status_code, resp.text[:200])
                    return False
            else:
                logger.error("[MQTT Sub] API error %s: %s", resp.status_code, resp.text[:200])
                return False
        except (requests.ConnectionError, requests.Timeout) as e:
            if attempt < max_retries:
                wait = min(2 ** attempt, 8)
                logger.warning("[MQTT Sub] API request failed (attempt %s), retrying in %ss: %s", attempt + 1, wait, e)
                time.sleep(wait)
            else:
                logger.error("[MQTT Sub] API request failed after %s attempts: %s", max_retries + 1, e)
                return False
        except requests.RequestException:
            raise
    return False


def _start_worker(
    session: requests.Session,
    api_base: str,
    auth_token: Optional[str],
    max_queue_size: int = DEFAULT_MAX_QUEUE_SIZE,
    batch_size: int = DEFAULT_BATCH_SIZE,
    ingest_timeout: float = DEFAULT_INGEST_TIMEOUT,
    max_retries: int = DEFAULT_INGEST_RETRY,
) -> tuple[queue.Queue, threading.Event, dict]:
    """Start a background worker thread that drains a queue and POSTs to the API in batches."""
    q: queue.Queue = queue.Queue(maxsize=max_queue_size)
    stop_event = threading.Event()

    def worker():
        """Worker thread loop with resilience against unhandled exceptions."""
        batch = []
        try:
            while not stop_event.is_set():
                try:
                    payload = q.get(timeout=0.1)
                    batch.append(payload)
                except queue.Empty:
                    if batch:
                        try:
                            ok = _post_with_retry(
                                session, api_base, batch, auth_token, ingest_timeout, max_retries
                            )
                            if not ok:
                                _persist_dead_letter(batch, "api_retry_exhausted")
                        except Exception as e:
                            logger.error("[MQTT Sub] Unhandled worker error during POST: %s", e)
                            _persist_dead_letter(batch, "worker_exception")
                        finally:
                            for _ in batch:
                                try:
                                    q.task_done()
                                except ValueError:
                                    logger.debug("task_done() failed")
                        batch = []
                    continue

                if len(batch) >= batch_size:
                    try:
                        ok = _post_with_retry(
                            session, api_base, batch, auth_token, ingest_timeout, max_retries
                        )
                        if not ok:
                            _persist_dead_letter(batch, "api_retry_exhausted")
                    except Exception as e:
                        logger.error("[MQTT Sub] Unhandled worker error during POST: %s", e)
                        _persist_dead_letter(batch, "worker_exception")
                    finally:
                        for _ in batch:
                            try:
                                q.task_done()
                            except ValueError:
                                logger.debug("task_done() failed")
                        batch = []

            # Flush remaining batch on shutdown
            if batch:
                try:
                    ok = _post_with_retry(
                        session, api_base, batch, auth_token, ingest_timeout, max_retries
                    )
                    if not ok:
                        _persist_dead_letter(batch, "api_retry_exhausted")
                except Exception as e:
                    logger.error("[MQTT Sub] Unhandled worker error during POST: %s", e)
                    _persist_dead_letter(batch, "worker_exception")
                finally:
                    for _ in batch:
                        try:
                            q.task_done()
                        except ValueError:
                            logger.debug("task_done() failed")
                    batch = []
        except BaseException as e:
            if batch:
                _persist_dead_letter(batch, f"worker_crash_{type(e).__name__}")
            logger.error("[MQTT Sub] FATAL worker thread error, thread exiting: %s", e)
            raise

    t = threading.Thread(target=worker, daemon=True)
    t.start()

    thread_ref = {"thread": t}

    def watcher():
        """Watch the worker thread and respawn it if it dies."""
        while not stop_event.is_set():
            thread_ref["thread"].join(timeout=1.0)
            if not stop_event.is_set() and not thread_ref["thread"].is_alive():
                logger.warning("[MQTT Sub] Worker thread died, respawning...")
                thread_ref["thread"] = threading.Thread(target=worker, daemon=True)
                thread_ref["thread"].start()
            time.sleep(1.0)

    watcher_thread = threading.Thread(target=watcher, daemon=True)
    watcher_thread.start()
    return q, stop_event, thread_ref


def _on_message_factory(q: queue.Queue):
    """Build an on_message callback bound to the given queue."""
    def _on_message(client, userdata, msg):
        """Callback when a message arrives on a subscribed topic."""
        def _ack_if_needed():
            if getattr(client, "manual_ack", False):
                try:
                    client.ack(msg.mid)
                except Exception as e:
                    logger.warning("[MQTT Sub] Manual ack failed for mid %s: %s", msg.mid, e)
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except UnicodeDecodeError as e:
            logger.warning("[MQTT Sub] Invalid UTF-8 on %s: %s", msg.topic, e)
            _ack_if_needed()
            return
        except json.JSONDecodeError as e:
            logger.warning("[MQTT Sub] Invalid JSON on %s: %s", msg.topic, e)
            _ack_if_needed()
            return
        if not isinstance(payload, dict):
            logger.warning("[MQTT Sub] Invalid payload type on %s: expected dict, got %s", msg.topic, type(payload).__name__)
            _ack_if_needed()
            return
        try:
            q.put_nowait(payload)
            _ack_if_needed()
        except queue.Full:
            logger.warning("[MQTT Sub] Queue full (maxsize=%s), dropping message on %s", q.maxsize, msg.topic)
            # Do not ack; broker will redeliver for QoS 1
    return _on_message


def _drain_and_shutdown(q: queue.Queue, stop_event: threading.Event, thread_ref: dict, client, session: Optional[requests.Session] = None, timeout: float = 30.0) -> None:
    """Gracefully drain the queue and shut down the worker thread."""
    logger.info("[MQTT Sub] Draining queue (%s items remaining)...", q.qsize())
    stop_event.set()
    thread_ref["thread"].join(timeout=timeout)
    if thread_ref["thread"].is_alive():
        logger.warning("[MQTT Sub] Worker thread did not exit within %ss timeout; in-flight batch may be lost.", timeout)
    try:
        client.disconnect()
    except Exception as e:
        logger.warning("[MQTT Sub] Cleanup error during disconnect: %s", e)
    try:
        client.loop_stop()
    except Exception as e:
        logger.warning("[MQTT Sub] Cleanup error during loop_stop: %s", e)
    if session is not None:
        try:
            session.close()
        except Exception as e:
            logger.warning("[MQTT Sub] Cleanup error during session close: %s", e)
    logger.info("[MQTT Sub] Shutdown complete.")


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
    if broker_port <= 0:
        raise ValueError("broker_port must be > 0")
    if max_queue_size <= 0:
        raise ValueError("max_queue_size must be > 0")
    if ingest_timeout <= 0:
        raise ValueError("ingest_timeout must be > 0")
    if max_retries < 0:
        raise ValueError("max_retries must be >= 0")
    if run_duration_seconds is not None and run_duration_seconds < 0:
        raise ValueError("run_duration_seconds must be >= 0")

    session = requests.Session()
    session.headers.update({"User-Agent": "enviroswarm-subscriber/1.0"})

    q, stop_event, thread_ref = _start_worker(
        session,
        api_base,
        auth_token,
        max_queue_size=max_queue_size,
        batch_size=DEFAULT_BATCH_SIZE,
        ingest_timeout=ingest_timeout,
        max_retries=max_retries,
    )

    client = mqtt.Client(
        client_id=client_id or f"enviroswarm-sub-{uuid.uuid4().hex[:8]}",
        clean_session=False,
    )
    client.manual_ack = True
    client.user_data_set({"topic_prefix": topic_prefix})
    client.on_connect = _on_connect
    client.on_message = _on_message_factory(q)
    client.on_disconnect = _on_disconnect

    # Graceful shutdown on SIGTERM (Docker)
    def _signal_handler(signum, frame):
        logger.info("[MQTT Sub] Received signal %s, shutting down gracefully...", signum)
        _drain_and_shutdown(q, stop_event, thread_ref, client, session=session, timeout=30.0)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _signal_handler)

    try:
        client.connect(broker_host, broker_port, 60)
    except Exception as e:
        logger.error("[MQTT Sub] Could not connect to broker %s:%s: %s", broker_host, broker_port, e)
        stop_event.set()
        try:
            session.close()
        except Exception as e:
            logger.warning("[MQTT Sub] Session close failed during connect error handling: %s", e)
        return

    client.loop_start()

    logger.info("[MQTT Sub] Listening on %s:%s for %s", broker_host, broker_port, topic_prefix)
    logger.info("[MQTT Sub] Forwarding to %s/api/v1/ingest", api_base)
    logger.info("[MQTT Sub] Queue maxsize: %s", max_queue_size)
    if auth_token:
        logger.info("[MQTT Sub] Authenticated with provided token.")
    else:
        logger.warning("[MQTT Sub] No auth_token provided. API requests may fail with 401.")

    if run_duration_seconds is not None:
        try:
            time.sleep(run_duration_seconds)
        except KeyboardInterrupt:
            logger.info("[MQTT Sub] Stopped by user during timed run, shutting down gracefully...")
            _drain_and_shutdown(q, stop_event, thread_ref, client, session=session, timeout=30.0)
            logger.info("[MQTT Sub] Stopped.")
            return
        _drain_and_shutdown(q, stop_event, thread_ref, client, session=session, timeout=30.0)
        logger.info("[MQTT Sub] Stopped.")
    else:
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("[MQTT Sub] Stopped by user, shutting down gracefully...")
            _drain_and_shutdown(q, stop_event, thread_ref, client, session=session, timeout=30.0)


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

    auth_token = os.environ.get("AUTH_TOKEN")

    if args.broker_port <= 0:
        raise ValueError("broker_port must be > 0")
    if args.max_queue_size <= 0:
        raise ValueError("max_queue_size must be > 0")
    if args.ingest_timeout <= 0:
        raise ValueError("ingest_timeout must be > 0")
    if args.max_retries < 0:
        raise ValueError("max_retries must be >= 0")
    if args.run_duration is not None and args.run_duration < 0:
        raise ValueError("run_duration must be >= 0")

    start_subscriber(
        broker_host=args.broker_host,
        broker_port=args.broker_port,
        api_base=args.api_base,
        topic_prefix=args.topic_prefix,
        client_id=args.client_id,
        auth_token=auth_token,
        max_queue_size=args.max_queue_size,
        ingest_timeout=args.ingest_timeout,
        max_retries=args.max_retries,
        run_duration_seconds=args.run_duration,
    )


if __name__ == "__main__":
    main()
