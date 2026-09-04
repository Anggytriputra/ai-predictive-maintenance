from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.motor_state_service import MotorStateManager
from app.core.config import settings

router = APIRouter(prefix="/api/control", tags=["control"])

# Instantiate the state manager (shared singleton via module import)
motor_state = MotorStateManager(settings.MOTORS)


class ControlCommand(BaseModel):
    action: str  # "start" | "stop"


@router.get("/motors")
def get_motor_states():
    """Get the current running state of all motors."""
    return {
        "motors": [
            {"motorId": mid, "running": motor_state.is_running(mid)}
            for mid in settings.MOTORS
        ]
    }


@router.post("/motors/{motor_id}")
def control_motor(motor_id: str, command: ControlCommand):
    """
    Start or stop a specific motor.
    This simulates a SCADA operator clicking Start/Stop on the HMI.
    """
    if motor_id not in settings.MOTORS:
        raise HTTPException(status_code=404, detail=f"Motor '{motor_id}' not found")

    if command.action == "start":
        motor_state.start(motor_id)
        return {"motorId": motor_id, "running": True, "message": f"Motor {motor_id} started"}

    elif command.action == "stop":
        motor_state.stop(motor_id)
        return {"motorId": motor_id, "running": False, "message": f"Motor {motor_id} stopped"}

    else:
        raise HTTPException(status_code=400, detail="action must be 'start' or 'stop'")
