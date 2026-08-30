"""
AI Predictive Maintenance Backend — FastAPI + MQTT + TimescaleDB + ML

Main entry point that wires together all modules:
- FastAPI for REST API
- MQTT (paho-mqtt) for IoT sensor data ingestion
- Socket.io (python-socketio AsyncServer) for real-time frontend updates
- IsolationForest for ML-based anomaly detection
- TimescaleDB for time-series sensor storage
- APScheduler for periodic tasks (IoT simulation, DB sync, ML training)

Replaces the entire NestJS backend.
"""

import asyncio
import logging
import json
from datetime import datetime
from contextlib import asynccontextmanager

import socketio as sio_module
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from config import settings
from database import init_db, SessionLocal, SensorDataLog
from mqtt_client import mqtt_client
from iot_simulator import simulate_tick
from ml_analyzer import ml_analyzer
from websocket_handler import sio, emit_sensor_update, emit_alert
from db_sync import db_sync

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-15s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")

# --- Scheduler ---
scheduler = BackgroundScheduler()

# --- Event loop reference (for bridging sync MQTT callbacks to async Socket.io) ---
_loop: asyncio.AbstractEventLoop | None = None


def on_sensor_data_received(data: dict):
    """
    Central handler for incoming sensor data (from MQTT).
    This is the main data pipeline:

    1. Receive sensor data from MQTT
    2. Run ML prediction (anomaly detection)
    3. If anomaly → publish alert via MQTT + save to DB
    4. Buffer data for periodic DB sync
    5. Emit to frontend via Socket.io (async, bridged from sync callback)
    """
    motor_id = data.get("motorId", "unknown")

    # 1. ML Prediction
    result = ml_analyzer.predict(data)

    # 2. Handle anomalies
    if result["risk_level"] != "LOW":
        alert_data = {
            "motorId": motor_id,
            "riskLevel": result["risk_level"],
            "message": result["message"],
            "confidence": result["confidence"],
            "method": result["method"],
            "timestamp": data.get("timestamp"),
        }

        # Publish alert via MQTT
        mqtt_client.publish_alert(motor_id, alert_data)

        # Save alert to database
        db_sync.save_alert(
            motor_id=motor_id,
            severity=result["risk_level"],
            message=result["message"],
            ai_prediction=json.dumps({
                "confidence": result["confidence"],
                "method": result["method"],
            }),
        )

        # Emit alert to frontend (bridge sync → async)
        if _loop and _loop.is_running():
            asyncio.run_coroutine_threadsafe(emit_alert(alert_data), _loop)

    # 3. Buffer for DB sync
    db_sync.add_to_buffer(data)

    # 4. Emit sensor data to frontend via Socket.io (bridge sync → async)
    if _loop and _loop.is_running():
        asyncio.run_coroutine_threadsafe(emit_sensor_update(data), _loop)


def retrain_ml_model():
    """Periodically retrain the ML model with accumulated data."""
    ml_analyzer.train()
    sample_count = len(ml_analyzer.training_data)
    if ml_analyzer.is_trained:
        logger.info(f"🧠 ML model retrained with {sample_count} samples")
    else:
        logger.info(
            f"📊 Collecting data for ML training: "
            f"{sample_count}/{settings.ML_MIN_SAMPLES}"
        )


# --- FastAPI Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic for the application."""
    global _loop

    # Capture the running event loop for sync→async bridging
    _loop = asyncio.get_running_loop()

    # === STARTUP ===
    logger.info("=" * 60)
    logger.info("🚀 AI Predictive Maintenance Backend (Python/FastAPI)")
    logger.info("=" * 60)

    # 1. Initialize database
    logger.info("📦 Initializing database...")
    init_db()

    # 2. Connect MQTT
    logger.info("🔌 Connecting to MQTT broker...")
    mqtt_client.connect()
    mqtt_client.on_sensor_data(on_sensor_data_received)

    # 3. Start scheduler
    # IoT Simulator: generate sensor data every 2 seconds
    scheduler.add_job(
        simulate_tick,
        "interval",
        seconds=settings.SIMULATOR_INTERVAL,
        id="iot_simulator",
        name="IoT Sensor Simulator",
    )

    # Database Sync: flush buffer to TimescaleDB every 10 seconds
    scheduler.add_job(
        db_sync.flush_to_database,
        "interval",
        seconds=settings.DB_SYNC_INTERVAL,
        id="db_sync",
        name="Database Sync",
    )

    # ML Model Retraining: retrain every 2 minutes
    scheduler.add_job(
        retrain_ml_model,
        "interval",
        seconds=120,
        id="ml_retrain",
        name="ML Model Retrain",
    )

    scheduler.start()
    logger.info("✅ All services started successfully!")
    logger.info(f"🌐 Server running on http://{settings.HOST}:{settings.PORT}")
    logger.info("=" * 60)

    yield  # Application is running

    # === SHUTDOWN ===
    logger.info("Shutting down services...")
    scheduler.shutdown()
    mqtt_client.disconnect()
    _loop = None
    logger.info("👋 Goodbye!")


# --- FastAPI App ---

app = FastAPI(
    title="AI Predictive Maintenance API",
    description="Real-time IoT monitoring with ML-based anomaly detection",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REST API Endpoints ---

@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "service": "AI Predictive Maintenance",
        "version": "2.0.0",
        "stack": "FastAPI + MQTT + TimescaleDB + IsolationForest",
        "mqtt_connected": mqtt_client.is_connected,
        "ml_trained": ml_analyzer.is_trained,
        "ml_samples": len(ml_analyzer.training_data),
    }


@app.get("/api/machines")
def get_machines():
    """Get list of all monitored machines."""
    from database import Machine
    db = SessionLocal()
    try:
        machines = db.query(Machine).all()
        return [
            {
                "id": m.id,
                "name": m.name,
                "type": m.type,
                "status": m.status,
                "createdAt": m.created_at.isoformat() if isinstance(m.created_at, datetime) else str(m.created_at),
            }
            for m in machines
        ]
    finally:
        db.close()


@app.get("/api/machines/{machine_id}/logs")
def get_machine_logs(machine_id: str, limit: int = 100):
    """Get recent sensor data logs for a specific machine."""
    db = SessionLocal()
    try:
        logs = (
            db.query(SensorDataLog)
            .filter(SensorDataLog.machine_id == machine_id)
            .order_by(SensorDataLog.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": log.id,
                "machineId": log.machine_id,
                "temperature": log.temperature,
                "vibration": log.vibration,
                "currentR": log.current_r,
                "currentS": log.current_s,
                "currentT": log.current_t,
                "currentN": log.current_n,
                "voltageR": log.voltage_r,
                "voltageS": log.voltage_s,
                "voltageT": log.voltage_t,
                "timestamp": log.timestamp.isoformat() if isinstance(log.timestamp, datetime) else str(log.timestamp),
            }
            for log in reversed(logs)
        ]
    finally:
        db.close()


@app.get("/api/alerts")
def get_alerts(limit: int = 50):
    """Get recent AI alerts."""
    from database import Alert
    db = SessionLocal()
    try:
        alerts = (
            db.query(Alert)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": a.id,
                "machineId": a.machine_id,
                "message": a.message,
                "severity": a.severity,
                "aiPrediction": a.ai_prediction,
                "createdAt": a.created_at.isoformat() if isinstance(a.created_at, datetime) else str(a.created_at),
                "isResolved": a.is_resolved,
            }
            for a in alerts
        ]
    finally:
        db.close()


@app.get("/api/ml/status")
def get_ml_status():
    """Get current ML model status."""
    return {
        "is_trained": ml_analyzer.is_trained,
        "training_samples": len(ml_analyzer.training_data),
        "min_samples_required": ml_analyzer.min_samples,
        "contamination": ml_analyzer.contamination,
        "ready_percentage": min(
            100,
            round(len(ml_analyzer.training_data) / ml_analyzer.min_samples * 100, 1),
        ),
    }


# --- Mount Socket.io on the ASGI app ---

# Wrap FastAPI (ASGI) with Socket.io
socket_app = sio_module.ASGIApp(sio, other_asgi_app=app)


# --- Entry Point ---

if __name__ == "__main__":
    uvicorn.run(
        "main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
