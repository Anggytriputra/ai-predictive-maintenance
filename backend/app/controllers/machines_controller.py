from fastapi import APIRouter
from datetime import datetime
from app.models.database import SessionLocal, Machine, SensorDataLog

router = APIRouter(prefix="/api/machines", tags=["machines"])

@router.get("")
def get_machines():
    """Get list of all monitored machines."""
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


@router.get("/{machine_id}/logs")
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
