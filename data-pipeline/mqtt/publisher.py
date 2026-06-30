"""MQTT publisher — publish sensor readings to a local broker."""

import json
import time
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected to broker.")
    else:
        print(f"[MQTT] Connection failed with code {rc}")


def _on_publish(client, userdata, mid):
    pass


def publish_readings(
    readings: List[Dict[str, Any]],
    broker_host: str = "localhost",
    broker_port: int = 1883,
    topic_prefix: str = "enviroswarm/sensors",
    delay_seconds: float = 0.01,
    client_id: Optional[str] = None,
) -> int:
    """Publish a list of readings to the MQTT broker.
    
    Each reading is published to:
        {topic_prefix}/{station_id}/{sensor_type}
    
    Returns the number of messages published.
    """
    if mqtt is None:
        raise ImportError("paho-mqtt is required. Install it: pip install paho-mqtt")
    
    client = mqtt.Client(client_id=client_id or f"enviroswarm-pub-{random.randint(1000,9999)}")
    client.on_connect = _on_connect
    client.on_publish = _on_publish
    
    try:
        client.connect(broker_host, broker_port, 60)
    except Exception as e:
        print(f"[MQTT] Could not connect to {broker_host}:{broker_port}: {e}")
        return 0
    
    client.loop_start()
    time.sleep(0.3)  # brief window for connection
    
    published = 0
    for r in readings:
        station_id = r.get("station_id", "unknown")
        sensor_type = r.get("sensor_type", "unknown")
        topic = f"{topic_prefix}/{station_id}/{sensor_type}"
        payload = json.dumps({
            "station_id": station_id,
            "sensor_type": sensor_type,
            "value": r.get("value"),
            "unit": r.get("unit"),
            "timestamp": r.get("timestamp"),
            "metadata": r.get("metadata", {}),
        })
        
        try:
            client.publish(topic, payload, qos=1)
            published += 1
        except Exception as e:
            print(f"[MQTT] Publish error: {e}")
        
        if delay_seconds:
            time.sleep(delay_seconds)
    
    client.loop_stop()
    client.disconnect()
    print(f"[MQTT] Published {published} messages.")
    return published
