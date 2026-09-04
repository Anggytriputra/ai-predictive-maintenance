"""
AI Predictive Maintenance Backend — FastAPI + MQTT + TimescaleDB + ML

Main entry point that wires together all modules in a layered DDD architecture:
- FastAPI for REST API
- MQTT (paho-mqtt) for IoT sensor data ingestion
- Socket.io (python-socketio AsyncServer) for real-time frontend updates
- IsolationForest for ML-based anomaly detection
- TimescaleDB for time-series sensor storage
- APScheduler for periodic tasks (IoT simulation, DB sync, ML training)
"""

import asyncio
import logging
import json
from contextlib import asynccontextmanager

import socketio as sio_module
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.models.database import init_db
from app.services.mqtt_service import mqtt_client
from app.services.simulator_service import simulate_tick
from app.services.ml_service import ml_analyzer
from app.gateways.websocket_gateway import sio, emit_sensor_update, emit_alert
from app.services.sync_service import db_sync

from app.controllers import machines_controller, alerts_controller, ml_controller, control_controller

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
    scheduler.add_job(
        simulate_tick,
        "interval",
        seconds=settings.SIMULATOR_INTERVAL,
        id="iot_simulator",
        name="IoT Sensor Simulator",
    )

    scheduler.add_job(
        db_sync.flush_to_database,
        "interval",
        seconds=settings.DB_SYNC_INTERVAL,
        id="db_sync",
        name="Database Sync",
    )

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

# --- Register Routers (Controllers) ---
app.include_router(machines_controller.router)
app.include_router(alerts_controller.router)
app.include_router(ml_controller.router)
app.include_router(control_controller.router)


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


# --- Mount Socket.io on the ASGI app ---
socket_app = sio_module.ASGIApp(sio, other_asgi_app=app)
