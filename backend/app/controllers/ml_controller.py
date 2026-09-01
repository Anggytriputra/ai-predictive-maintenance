from fastapi import APIRouter
from app.services.ml_service import ml_analyzer

router = APIRouter(prefix="/api/ml", tags=["ml"])

@router.get("/status")
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
