"""
IoT Simulator — generates mock sensor data for industrial motors.
Replaces iot-simulator.service.ts from the NestJS version.

Publishes data every 2 seconds via MQTT (instead of Redis).
"""

import logging
import random
from datetime import datetime, timezone

from app.services.mqtt_service import mqtt_client
from app.core.config import settings

logger = logging.getLogger("iot_simulator")


def random_float(min_val: float, max_val: float) -> float:
    """Generate a random float with 2 decimal places."""
    return round(random.uniform(min_val, max_val), 2)


def generate_sensor_data(motor_id: str, running: bool = True) -> dict:
    """
    Generate realistic mock sensor data for an industrial motor.

    If motor is stopped (running=False), electrical values go to zero
    but temperature slowly decays (motor cools down).
    """
    is_hv = "HV" in motor_id

    if running:
        return {
            "motorId": motor_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "running": True,
            "temperature": random_float(70, 95),
            "vibration": random_float(1.0, 4.0),
            "currentR": random_float(40, 60),
            "currentS": random_float(40, 60),
            "currentT": random_float(40, 60),
            "currentN": random_float(0, 5),
            "voltageR": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
            "voltageS": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
            "voltageT": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
        }
    else:
        # Motor stopped — currents = 0, voltage = 0, temp drops to ambient
        return {
            "motorId": motor_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "running": False,
            "temperature": random_float(28, 35),   # ambient / cooling
            "vibration": 0.0,
            "currentR": 0.0,
            "currentS": 0.0,
            "currentT": 0.0,
            "currentN": 0.0,
            "voltageR": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
            "voltageS": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
            "voltageT": random_float(11000, 11500) if is_hv else random_float(3300, 3500),
        }


def simulate_tick():
    """
    Generate and publish sensor data for all motors.
    Called every 2 seconds by the scheduler in main.py.
    Motors that are stopped will emit "shutdown" readings.
    """
    # Import here to avoid circular import at module load
    from app.controllers.control_controller import motor_state

    for motor_id in settings.MOTORS:
        running = motor_state.is_running(motor_id)
        data = generate_sensor_data(motor_id, running=running)

        # Publish via MQTT
        mqtt_client.publish_sensor_data(motor_id, data)

    logger.debug(
        f"Generated and published sensor data for {len(settings.MOTORS)} motors"
    )

