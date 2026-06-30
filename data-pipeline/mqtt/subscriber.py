"""MQTT subscriber — subscribe to sensor topics and forward to the ingest API."""

import json
import queue
import signal
import sys
import threading
import time
from typing import Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

import requests

API_BASE = "http://localhost:8000"
TOPIC_PREFIX = "enviroswarm/sensors/#"


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT Sub] Connected. Subscribing...")
        client.subscribe(TOPIC_PREFIX, qos=1)
    else:
        print(f"[MQTT Sub] Connection failed with code {rc}")


def _on_disconnect(client, userdata, rc):
    print(f"[MQTT Sub] Disconnected with code {rc}")


def _start_worker(session: requests.Session, api_base: str, auth_token: Optional[str]) -> tuple:
    """Start a background worker thread that drains a queue and POSTs to the API."""
    q: queue.Queue = queue.Queue()
    stop_event = threading.Event()

    def worker():
        while not stop_event.is_set():
            try:
                payload = q.get(timeout=0.5)
            except queue.Empty:
                continue

            api_url = f"{api_base}/api/v1/ingest"
            headers = {"Content-Type": "application/json"}
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"

            try:
                resp = session.post(
                    api_url,
                    json={"readings": [payload]},
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    try:
                        body = resp.json()
                        if body.get("success"):
                            print(f"[MQTT Sub] Forwarded -> API OK")
                        else:
                            print(f"[MQTT Sub] API success=False: {body.get('error', 'unknown')}")
                    except Exception:
                        print(f"[MQTT Sub] Forwarded -> API OK (non-JSON response)")
                else:
                    print(f"[MQTT Sub] API error {resp.status_code}: {resp.text[:200]}")
            except requests.RequestException as e:
                print(f"[MQTT Sub] API request failed: {e}")
            finally:
                q.task_done()

    t = threading.Thread(target=worker, daemon=True)
    t.start()
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

        q.put(payload)

    return _on_message


def start_subscriber(
    broker_host: str = "localhost",
    broker_port: int = 1883,
    api_base: str = "http://localhost:8000",
    topic_prefix: str = "enviroswarm/sensors/#",
    client_id: Optional[str] = None,
    auth_token: Optional[str] = None,
    run_duration_seconds: Optional[float] = None,
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
    """
    if mqtt is None:
        raise ImportError("paho-mqtt is required. Install it: pip install paho-mqtt")

    global API_BASE, TOPIC_PREFIX
    API_BASE = api_base
    TOPIC_PREFIX = topic_prefix

    session = requests.Session()
    q, stop_event, worker_thread = _start_worker(session, api_base, auth_token)

    client = mqtt.Client(
        client_id=client_id or "enviroswarm-sub-001"
    )
    client.on_connect = _on_connect
    client.on_message = _on_message_factory(q)
    client.on_disconnect = _on_disconnect

    # Graceful shutdown on SIGTERM (Docker)
    def _signal_handler(signum, frame):
        print(f"[MQTT Sub] Received signal {signum}, shutting down...")
        stop_event.set()
        client.loop_stop()
        client.disconnect()
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
    if auth_token:
        print("[MQTT Sub] Authenticated with provided token.")
    else:
        print("[MQTT Sub] WARNING: No auth_token provided. API requests may fail with 401.")

    if run_duration_seconds:
        time.sleep(run_duration_seconds)
        stop_event.set()
        client.loop_stop()
        client.disconnect()
        print("[MQTT Sub] Stopped.")
    else:
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop_event.set()
            client.loop_stop()
            client.disconnect()
            print("[MQTT Sub] Stopped by user.")
