"""
MQTT Client module — replaces Redis Pub/Sub from the NestJS version.
Uses paho-mqtt to connect to a Mosquitto broker.

Topic structure:
  - plant/{motor_id}/sensor_data  → Sensor readings (subscribe)
  - plant/{motor_id}/alert        → AI alerts (publish)
"""

import json
import logging
from typing import Callable, Optional

import paho.mqtt.client as mqtt
from app.core.config import settings

logger = logging.getLogger("mqtt")


class MQTTClient:
    """
    MQTT client wrapper for the predictive maintenance system.
    Replaces the Redis Pub/Sub pattern from the NestJS backend.
    """

    def __init__(self):
        cb_version = getattr(mqtt, "CallbackAPIVersion", None)
        kwargs = {"protocol": mqtt.MQTTv5, "client_id": "predictive-maintenance-backend"}
        if cb_version is not None:
            kwargs["callback_api_version"] = cb_version.VERSION2

        self.client = mqtt.Client(**kwargs)
        self._on_sensor_data: Optional[Callable] = None
        self._connected = False

        # Setup callbacks
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def connect(self):
        """Connect to the MQTT broker."""
        logger.info(
            f"Connecting to MQTT broker at "
            f"{settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}..."
        )
        self.client.connect(
            settings.MQTT_BROKER_HOST,
            settings.MQTT_BROKER_PORT,
            keepalive=60,
        )
        # Start the network loop in a background thread
        self.client.loop_start()

    def disconnect(self):
        """Disconnect from the MQTT broker."""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("Disconnected from MQTT broker.")

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """Callback when connected to the broker."""
        if reason_code == 0:
            self._connected = True
            logger.info("✅ Connected to MQTT broker successfully!")

            # Subscribe to all motor sensor data topics
            # Topic pattern: plant/+/sensor_data (+ is single-level wildcard)
            client.subscribe(settings.MQTT_TOPIC_SENSOR_DATA, qos=1)
            logger.info(f"Subscribed to topic: {settings.MQTT_TOPIC_SENSOR_DATA}")
        else:
            logger.error(f"Failed to connect to MQTT broker: {reason_code}")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        """Callback when disconnected from the broker."""
        self._connected = False
        logger.warning(f"Disconnected from MQTT broker (reason: {reason_code})")

    def _on_message(self, client, userdata, msg: mqtt.MQTTMessage):
        """
        Callback when a message is received.
        Routes messages to the appropriate handler based on topic.
        """
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            topic_parts = msg.topic.split("/")

            # Topic: plant/{motor_id}/sensor_data
            if len(topic_parts) == 3 and topic_parts[2] == "sensor_data":
                if self._on_sensor_data:
                    self._on_sensor_data(payload)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode MQTT message on topic {msg.topic}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def on_sensor_data(self, callback: Callable):
        """Register a callback for when sensor data is received."""
        self._on_sensor_data = callback

    def publish_sensor_data(self, motor_id: str, data: dict):
        """
        Publish sensor data to MQTT.
        Topic: plant/{motor_id}/sensor_data
        """
        topic = f"plant/{motor_id}/sensor_data"
        payload = json.dumps(data)
        self.client.publish(topic, payload, qos=1)

    def publish_alert(self, motor_id: str, alert: dict):
        """
        Publish an AI alert to MQTT.
        Topic: plant/{motor_id}/alert
        """
        topic = f"plant/{motor_id}/alert"
        payload = json.dumps(alert)
        self.client.publish(topic, payload, qos=1)
        logger.warning(f"🚨 [AI ALERT] {motor_id}: {alert.get('riskLevel', 'UNKNOWN')}")

    @property
    def is_connected(self) -> bool:
        return self._connected


# Singleton instance
mqtt_client = MQTTClient()
