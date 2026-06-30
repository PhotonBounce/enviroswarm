"""MQTT subscriber — subscribe to sensor topics and forward to the ingest API."""

import json
import time
import threading
from typing import Callable, Optional

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


def _on_message(client, userdata, msg):
    """Callback when a message arrives on a subscribed topic."""
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except json.JSONDecodeError as e:
        print(f"[MQTT Sub] Invalid JSON on {msg.topic}: {e}")
        return
    
    # Forward to ingest API
    api_url = f"{API_BASE}/api/v1/ingest"
    try:
        resp = requests.post(
            api_url,
            json=[payload],
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[MQTT Sub] Forwarded {msg.topic} -> API OK")
        else:
            print(f"[MQTT Sub] API error {resp.status_code}: {resp.text[:200]}")
    except requests.RequestException as e:
        print(f"[MQTT Sub] API request failed: {e}")


def _on_disconnect(client, userdata, rc):
    print(f"[MQTT Sub] Disconnected with code {rc}")


def start_subscriber(
    broker_host: str = "localhost",
    broker_port: int = 1883,
    api_base: str = "http://localhost:8000",
    topic_prefix: str = "enviroswarm/sensors/#",
    client_id: Optional[str] = None,
    run_duration_seconds: Optional[float] = None,
) -> None:
    """Start the MQTT subscriber and optionally run for a fixed duration.
    
    Args:
        broker_host: MQTT broker hostname.
        broker_port: MQTT broker port.
        api_base: Base URL of the backend API.
        topic_prefix: MQTT topic wildcard to subscribe to.
        client_id: Optional MQTT client ID.
        run_duration_seconds: If provided, stop after this many seconds.
    """
    if mqtt is None:
        raise ImportError("paho-mqtt is required. Install it: pip install paho-mqtt")
    
    global API_BASE, TOPIC_PREFIX
    API_BASE = api_base
    TOPIC_PREFIX = topic_prefix
    
    client = mqtt.Client(
        client_id=client_id or "enviroswarm-sub-001"
    )
    client.on_connect = _on_connect
    client.on_message = _on_message
    client.on_disconnect = _on_disconnect
    
    client.connect(broker_host, broker_port, 60)
    client.loop_start()
    
    print(f"[MQTT Sub] Listening on {broker_host}:{broker_port} for {topic_prefix}")
    print(f"[MQTT Sub] Forwarding to {api_base}/api/v1/ingest")
    
    if run_duration_seconds:
        time.sleep(run_duration_seconds)
        client.loop_stop()
        client.disconnect()
        print("[MQTT Sub] Stopped.")
    else:
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            client.loop_stop()
            client.disconnect()
            print("[MQTT Sub] Stopped by user.")
