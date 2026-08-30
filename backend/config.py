"""
Configuration module — loads all settings from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from .env file."""

    # MQTT Broker
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))

    # MQTT Topics
    MQTT_TOPIC_SENSOR_DATA: str = "plant/+/sensor_data"  # Subscribe pattern
    MQTT_TOPIC_ALERT: str = "plant/{motor_id}/alert"      # Publish pattern

    # Database (TimescaleDB)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://admin:adminpassword@localhost:5432/predictive_maintenance"
    )

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "3000"))

    # ML Model
    ML_CONTAMINATION: float = float(os.getenv("ML_CONTAMINATION", "0.05"))
    ML_MIN_SAMPLES: int = int(os.getenv("ML_MIN_SAMPLES", "50"))

    # IoT Simulator
    SIMULATOR_INTERVAL: float = 2.0  # seconds
    MOTORS: list = ["Motor-HV-01", "Motor-HV-02", "Motor-MV-01"]

    # Database Sync
    DB_SYNC_INTERVAL: int = 10  # seconds
    DB_SYNC_BATCH_SIZE: int = 100


settings = Settings()
