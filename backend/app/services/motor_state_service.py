"""
Motor State Manager — tracks the running state of each motor.
Used by the simulator to decide whether to publish sensor data,
and by the control API to start/stop motors.
"""
import logging
from typing import Dict

logger = logging.getLogger("motor_state")


class MotorStateManager:
    """Singleton that holds the ON/OFF state of all motors."""

    def __init__(self, motor_ids: list[str]):
        # All motors start in RUNNING state
        self._states: Dict[str, bool] = {mid: True for mid in motor_ids}
        logger.info(f"Motor state manager initialized for: {motor_ids}")

    def is_running(self, motor_id: str) -> bool:
        return self._states.get(motor_id, False)

    def start(self, motor_id: str) -> bool:
        """Start a motor. Returns True if state changed."""
        if motor_id not in self._states:
            return False
        changed = not self._states[motor_id]
        self._states[motor_id] = True
        if changed:
            logger.info(f"▶  Motor {motor_id} STARTED")
        return True

    def stop(self, motor_id: str) -> bool:
        """Stop a motor. Returns True if state changed."""
        if motor_id not in self._states:
            return False
        changed = self._states[motor_id]
        self._states[motor_id] = False
        if changed:
            logger.warning(f"■  Motor {motor_id} STOPPED by operator")
        return True

    def get_all_states(self) -> Dict[str, bool]:
        return dict(self._states)
