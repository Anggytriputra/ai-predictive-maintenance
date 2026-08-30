"""
WebSocket Handler — Socket.io server compatible with the Next.js frontend.
Replaces websocket.gateway.ts from the NestJS version.

Uses python-socketio (AsyncServer) which is wire-compatible with socket.io-client.
Events are kept identical so the frontend doesn't need any changes.
"""

import logging
import socketio

logger = logging.getLogger("websocket")

# Create a Socket.io server instance (async mode for ASGI/uvicorn)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event # type: ignore
async def connect(sid: str, environ: dict):
    """Client connected."""
    logger.info(f"Client connected: {sid}")


@sio.event # type: ignore
async def disconnect(sid: str):
    """Client disconnected."""
    logger.info(f"Client disconnected: {sid}")


@sio.on("join_motor_room") # type: ignore
async def handle_join_room(sid: str, motor_id: str):
    """
    Client wants to receive detailed data for a specific motor.
    Matches the NestJS: @SubscribeMessage('join_motor_room')
    """
    await sio.enter_room(sid, motor_id)
    logger.debug(f"Client {sid} joined room {motor_id}")
    return {"event": "joined", "data": motor_id}


@sio.on("leave_motor_room") # type: ignore
async def handle_leave_room(sid: str, motor_id: str):
    """
    Client stops receiving detailed data for a specific motor.
    Matches the NestJS: @SubscribeMessage('leave_motor_room')
    """
    await sio.leave_room(sid, motor_id)
    logger.debug(f"Client {sid} left room {motor_id}")
    return {"event": "left", "data": motor_id}


async def emit_sensor_update(data: dict):
    """
    Broadcast sensor data to connected clients.
    
    Emits two events (matching the original NestJS gateway):
    1. 'sensor_overview' → to ALL connected clients (main dashboard list)
    2. 'sensor_update'   → to clients in the specific motor's room (detail view)
    """
    motor_id = data.get("motorId", "")

    # Broadcast to everyone (dashboard overview)
    await sio.emit("sensor_overview", data)

    # Broadcast to specific motor room (detail analytics)
    await sio.emit("sensor_update", data, room=motor_id)


async def emit_alert(alert_data: dict):
    """Broadcast an AI alert to all connected clients."""
    await sio.emit("ai_alert", alert_data)
