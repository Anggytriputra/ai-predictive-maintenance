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
    DB_SYNC_INTERVAL: int = 10   # seconds
    DB_SYNC_BATCH_SIZE: int = 100

    # ─────────────────────────────────────────────────────────────
    # Data Source Mode
    # "simulator" → use physics-based IoT simulator (default, offline)
    # "opcua"     → use OPC-UA client to connect to PLC/SCADA/demo server
    # ─────────────────────────────────────────────────────────────
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "simulator")

    # ─────────────────────────────────────────────────────────────
    # OPC-UA Settings (only used when DATA_SOURCE=opcua)
    # ─────────────────────────────────────────────────────────────
    OPCUA_ENDPOINT: str = os.getenv(
        "OPCUA_ENDPOINT",
        "opc.tcp://opcua-server:4840/"
    )

    # Namespace index registered in the OPC-UA server
    # Default: 2 (matches opcua_demo_server.py)
    OPCUA_NAMESPACE: int = int(os.getenv("OPCUA_NAMESPACE", "2"))

    # Base node IDs for each motor (parent folder node)
    # Format: "ns=<namespace>;s=<browse_path>" or "ns=X;i=Y"
    # These point to the motor folder nodes in the OPC-UA address space
    OPCUA_NAMESPACE_MOTOR_HV01: str = os.getenv(
        "OPCUA_NODE_MOTOR_HV01",
        "ns=2;s=Motors/Motor-HV-01"
    )
    OPCUA_NAMESPACE_MOTOR_HV02: str = os.getenv(
        "OPCUA_NODE_MOTOR_HV02",
        "ns=2;s=Motors/Motor-HV-02"
    )
    OPCUA_NAMESPACE_MOTOR_MV01: str = os.getenv(
        "OPCUA_NODE_MOTOR_MV01",
        "ns=2;s=Motors/Motor-MV-01"
    )


settings = Settings()
