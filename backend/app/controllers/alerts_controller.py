from fastapi import APIRouter
from datetime import datetime
from app.models.database import SessionLocal, Alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("")
def get_alerts(limit: int = 50):
    """Get recent AI alerts."""
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
