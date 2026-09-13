"""
IoT Simulator — Realistic Degradation Pattern Engine for Industrial Motors.

Replaces the naive random-data generator with physics-inspired simulation:
- Thermal model: temperature rises under load, dissipates when stopped
- Bearing wear: vibration follows bathtub curve -> gradual -> accelerated
- RPM speed: rated RPM (1485 / 2970) with inrush ramp-up, drops to 0 RPM when stopped
- Electrical: 3-phase current/voltage with realistic imbalance on degradation
- Startup transient: inrush current spike (6-8x rated) on motor start
- Degradation lifecycle: HEALTHY -> DEGRADING -> WARNING -> CRITICAL -> FAILURE

Each motor has its own independent state, so one can be healthy while another
is approaching failure — just like in a real plant.
"""

import logging
import random
import math
from datetime import datetime, timezone
from typing import Dict, Optional

from app.services.mqtt_service import mqtt_client
from app.core.config import settings

logger = logging.getLogger("iot_simulator")


# ------------------------------------------------------------------------------
# Motor Degradation Phases
# ------------------------------------------------------------------------------

class Phase:
    HEALTHY = "HEALTHY"          # Normal operation, stable readings
    DEGRADING = "DEGRADING"      # Early wear — subtle changes only ML can catch
    WARNING = "WARNING"          # Noticeable rise — maintenance should be scheduled
    CRITICAL = "CRITICAL"        # Imminent failure — shut down recommended
    FAILURE = "FAILURE"          # Motor has failed — auto-stops


# Phase durations in ticks (1 tick = SIMULATOR_INTERVAL seconds = 2s)
PHASE_DURATION = {
    Phase.HEALTHY: 450,     # ~15 minutes of normal operation
    Phase.DEGRADING: 300,   # ~10 minutes of subtle degradation
    Phase.WARNING: 150,     # ~5 minutes of visible degradation
    Phase.CRITICAL: 60,     # ~2 minutes before failure
    Phase.FAILURE: 30,      # ~1 minute in failed state, then auto-reset
}


# ------------------------------------------------------------------------------
# Motor Physical State
# ------------------------------------------------------------------------------

class MotorState:
    """
    Holds the evolving physical state of a single motor.
    Each motor independently tracks its own temperature, vibration,
    bearing health, and degradation phase.
    """

    def __init__(self, motor_id: str):
        self.motor_id = motor_id
        self.is_hv = "HV" in motor_id  # High-Voltage (11kV) vs Medium-Voltage (3.3kV)

        # --- Degradation lifecycle ---
        self.phase: str = Phase.HEALTHY
        self.ticks_in_phase: int = 0
        self.total_ticks: int = 0

        # --- Physical state (continuous values) ---
        self.temperature: float = 35.0       # deg C — starts at ambient
        self.vibration: float = 0.8          # mm/s RMS
        self.bearing_health: float = 1.0     # 1.0 = perfect, 0.0 = destroyed

        # --- Rotational speed (RPM) ---
        # 4-pole motor (1500 synch / ~1485 rated) for HV, 2-pole (~2970 rated) for MV
        self.rated_rpm: float = 1485.0 if self.is_hv else 2970.0

        # --- Electrical base values ---
        self.rated_current: float = 50.0     # Amperes (nominal)
        self.base_voltage: float = 11000.0 if self.is_hv else 3300.0

        # --- Startup transient tracking ---
        self.startup_ticks: int = 0          # Counts down during inrush period
        self.just_started: bool = False       # Flag for fresh start

        # --- Previous running state (for detecting start events) ---
        self._was_running: bool = True

    @property
    def degradation_progress(self) -> float:
        """How far through the current phase (0.0 to 1.0)."""
        duration = PHASE_DURATION.get(self.phase, 300)
        return min(1.0, self.ticks_in_phase / duration)

    def reset_to_healthy(self):
        """Reset motor to healthy state (simulates maintenance/repair)."""
        self.phase = Phase.HEALTHY
        self.ticks_in_phase = 0
        self.bearing_health = 1.0
        self.temperature = 35.0
        self.vibration = 0.8
        self.startup_ticks = 0
        logger.info(f"Motor {self.motor_id} — maintenance performed, reset to HEALTHY")


# ------------------------------------------------------------------------------
# Singleton: all motor states
# ------------------------------------------------------------------------------

_motor_states: Dict[str, MotorState] = {}


def _get_state(motor_id: str) -> MotorState:
    """Get or create motor state."""
    if motor_id not in _motor_states:
        _motor_states[motor_id] = MotorState(motor_id)
    return _motor_states[motor_id]


# ------------------------------------------------------------------------------
# Noise helper
# ------------------------------------------------------------------------------

def _noise(base: float, pct: float = 0.02) -> float:
    """Add Gaussian noise to a value. pct = noise as fraction of base."""
    return round(base + random.gauss(0, base * pct), 2)


# ------------------------------------------------------------------------------
# Physics simulation per tick
# ------------------------------------------------------------------------------

def _advance_phase(state: MotorState):
    """Advance the degradation phase if enough ticks have passed."""
    duration = PHASE_DURATION.get(state.phase, 300)

    if state.ticks_in_phase >= duration:
        transitions = {
            Phase.HEALTHY: Phase.DEGRADING,
            Phase.DEGRADING: Phase.WARNING,
            Phase.WARNING: Phase.CRITICAL,
            Phase.CRITICAL: Phase.FAILURE,
            Phase.FAILURE: Phase.HEALTHY,  # Auto-repair after failure
        }
        old_phase = state.phase
        state.phase = transitions.get(state.phase, Phase.HEALTHY)
        state.ticks_in_phase = 0

        if state.phase == Phase.HEALTHY:
            state.reset_to_healthy()
            logger.info(
                f"Motor {state.motor_id} — auto-repaired after FAILURE cycle"
            )
        else:
            logger.warning(
                f"Motor {state.motor_id} phase: {old_phase} -> {state.phase}"
            )


def _simulate_temperature(state: MotorState, running: bool) -> float:
    """
    Thermal model:
    - Running: temperature rises toward a target determined by phase
    - Stopped: temperature decays toward ambient (Newton's law of cooling)
    """
    ambient = 32.0
    thermal_inertia = 0.03  # How fast temp changes (lower = slower)

    if not running:
        # Cooling: exponential decay toward ambient
        state.temperature += (ambient - state.temperature) * 0.05
        return _noise(max(state.temperature, ambient), pct=0.005)

    # Target temperature depends on degradation phase
    phase_targets = {
        Phase.HEALTHY: 72.0,
        Phase.DEGRADING: 78.0,
        Phase.WARNING: 86.0,
        Phase.CRITICAL: 95.0,
        Phase.FAILURE: 105.0,
    }
    target = phase_targets.get(state.phase, 72.0)

    # Gradual rise within phase (lerp toward target as phase progresses)
    phase_min = {
        Phase.HEALTHY: 68.0,
        Phase.DEGRADING: 73.0,
        Phase.WARNING: 80.0,
        Phase.CRITICAL: 88.0,
        Phase.FAILURE: 98.0,
    }
    current_target = phase_min.get(state.phase, 68.0) + (
        target - phase_min.get(state.phase, 68.0)
    ) * state.degradation_progress

    # Smooth approach to target (thermal inertia)
    state.temperature += (current_target - state.temperature) * thermal_inertia

    # Add realistic noise
    return _noise(state.temperature, pct=0.007)


def _simulate_vibration(state: MotorState, running: bool) -> float:
    """
    Vibration model based on ISO 10816 severity standards:
    - Stopped: 0.0 mm/s (no rotation = zero mechanical vibration)
    - HEALTHY: low, stable vibration (0.8 - 1.5 mm/s)
    - DEGRADING: subtle increase (1.5 - 3.2)
    - WARNING: clearly elevated (3.2 - 6.5)
    - CRITICAL: high with occasional spikes (6.5 - 11.0)
    - FAILURE: erratic, very high (11.0 - 18.0)
    """
    if not running:
        state.vibration = 0.0
        return 0.0

    phase_ranges = {
        Phase.HEALTHY: (0.8, 1.5),
        Phase.DEGRADING: (1.5, 3.2),
        Phase.WARNING: (3.2, 6.5),
        Phase.CRITICAL: (6.5, 11.0),
        Phase.FAILURE: (11.0, 18.0),
    }
    vmin, vmax = phase_ranges.get(state.phase, (0.8, 1.5))

    target = vmin + (vmax - vmin) * state.degradation_progress

    # Vibration changes faster than temperature
    state.vibration += (target - state.vibration) * 0.08

    # Bearing defect frequency spikes (periodic bumps in CRITICAL/FAILURE)
    if state.phase in (Phase.CRITICAL, Phase.FAILURE):
        if random.random() < 0.15:  # 15% chance of spike per tick
            state.vibration += random.uniform(1.0, 3.0)

    return _noise(state.vibration, pct=0.04)


def _simulate_rpm(state: MotorState, running: bool) -> float:
    """
    Simulate rotational speed (RPM):
    - Stopped: 0.0 RPM
    - Starting up: ramps up from 0 to rated speed during inrush
    - Running: rated speed minus slight load slip and electrical noise
    """
    if not running:
        return 0.0

    if state.startup_ticks > 0:
        progress = (5 - state.startup_ticks) / 5.0
        return round(state.rated_rpm * progress, 1)

    slip = 0.01 + (1.0 - state.bearing_health) * 0.015
    target_rpm = state.rated_rpm * (1.0 - slip)
    return round(_noise(target_rpm, pct=0.003), 1)


def _simulate_bearing_health(state: MotorState, running: bool):
    """
    Bearing health degrades over time when running.
    Follows bathtub curve: fast break-in, stable, then accelerated wear.
    """
    if not running:
        return  # No wear when stopped

    wear_rates = {
        Phase.HEALTHY: 0.0003,
        Phase.DEGRADING: 0.001,
        Phase.WARNING: 0.003,
        Phase.CRITICAL: 0.008,
        Phase.FAILURE: 0.02,
    }
    rate = wear_rates.get(state.phase, 0.0003)
    state.bearing_health = max(0.0, state.bearing_health - rate)


def _simulate_electrical(
    state: MotorState, running: bool, vibration: float
) -> dict:
    """
    3-phase electrical simulation:
    - Stopped: 0.0 Amps, voltages at standard grid levels
    - Healthy: balanced currents/voltages with minimal variation
    - Degraded: current rises (mechanical load increases), imbalance grows
    - Startup: inrush current 6-8x rated for first few ticks
    """
    if not running:
        return {
            "currentR": 0.0,
            "currentS": 0.0,
            "currentT": 0.0,
            "currentN": 0.0,
            "voltageR": _noise(state.base_voltage, pct=0.005),
            "voltageS": _noise(state.base_voltage, pct=0.005),
            "voltageT": _noise(state.base_voltage, pct=0.005),
        }

    # --- Startup inrush transient ---
    if state.startup_ticks > 0:
        inrush_multiplier = 3.0 + (state.startup_ticks / 5.0) * 4.0  # 7x down to 3x
        inrush_multiplier = min(inrush_multiplier, 7.5)
        state.startup_ticks -= 1

        base_i = state.rated_current * inrush_multiplier
        voltage_dip = state.base_voltage * 0.92  # Voltage sags during inrush

        if state.startup_ticks == 0:
            logger.info(f"Motor {state.motor_id} — inrush complete, steady state")

        return {
            "currentR": _noise(base_i, pct=0.03),
            "currentS": _noise(base_i, pct=0.03),
            "currentT": _noise(base_i, pct=0.03),
            "currentN": _noise(base_i * 0.02, pct=0.1),
            "voltageR": _noise(voltage_dip, pct=0.008),
            "voltageS": _noise(voltage_dip, pct=0.008),
            "voltageT": _noise(voltage_dip, pct=0.008),
        }

    # --- Steady-state current ---
    load_factor = 1.0 + (1.0 - state.bearing_health) * 0.25
    vibration_factor = 1.0 + max(0, vibration - 2.0) * 0.02
    base_current = state.rated_current * load_factor * vibration_factor

    imbalance_pct = {
        Phase.HEALTHY: 0.01,     # 1% — normal
        Phase.DEGRADING: 0.03,   # 3% — subtle
        Phase.WARNING: 0.06,     # 6% — noticeable
        Phase.CRITICAL: 0.12,    # 12% — serious
        Phase.FAILURE: 0.20,     # 20% — severe
    }.get(state.phase, 0.01)

    imbalance_r = random.uniform(-imbalance_pct, imbalance_pct)
    imbalance_s = random.uniform(-imbalance_pct, imbalance_pct)
    imbalance_t = -(imbalance_r + imbalance_s) * 0.5

    current_r = _noise(base_current * (1 + imbalance_r), pct=0.01)
    current_s = _noise(base_current * (1 + imbalance_s), pct=0.01)
    current_t = _noise(base_current * (1 + imbalance_t), pct=0.01)

    neutral_base = abs(current_r + current_s + current_t) * 0.1
    neutral_degradation = {
        Phase.HEALTHY: 0.5,
        Phase.DEGRADING: 1.5,
        Phase.WARNING: 3.0,
        Phase.CRITICAL: 6.0,
        Phase.FAILURE: 12.0,
    }.get(state.phase, 0.5)
    current_n = _noise(neutral_base + neutral_degradation, pct=0.08)

    voltage_r = _noise(state.base_voltage, pct=0.005)
    voltage_s = _noise(state.base_voltage, pct=0.005)
    voltage_t = _noise(state.base_voltage, pct=0.005)

    return {
        "currentR": round(max(0, current_r), 2),
        "currentS": round(max(0, current_s), 2),
        "currentT": round(max(0, current_t), 2),
        "currentN": round(max(0, current_n), 2),
        "voltageR": round(voltage_r, 2),
        "voltageS": round(voltage_s, 2),
        "voltageT": round(voltage_t, 2),
    }


# ------------------------------------------------------------------------------
# Main simulation tick
# ------------------------------------------------------------------------------

def generate_sensor_data(motor_id: str, running: bool) -> dict:
    """
    Generate realistic sensor data for one motor for one tick.
    """
    state = _get_state(motor_id)

    # Detect motor start event (was stopped, now running)
    if running and not state._was_running:
        state.just_started = True
        state.startup_ticks = 5  # 5 ticks x 2s = 10 seconds of inrush
        logger.info(f"Motor {state.motor_id} — START detected, inrush sequence")
    state._was_running = running

    # Advance degradation phase (only when running)
    if running:
        state.ticks_in_phase += 1
        state.total_ticks += 1
        _advance_phase(state)
        _simulate_bearing_health(state, running)

    # Generate sensor readings
    temperature = _simulate_temperature(state, running)
    vibration = _simulate_vibration(state, running)
    rpm = _simulate_rpm(state, running)
    electrical = _simulate_electrical(state, running, vibration)

    return {
        "motorId": motor_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "running": running,
        "rpm": rpm,
        "temperature": temperature,
        "vibration": vibration,
        "bearingHealth": round(state.bearing_health * 100, 1),
        "phase": state.phase,
        **electrical,
    }


def simulate_tick():
    """
    Generate and publish sensor data for all motors.
    Called every 2 seconds by the scheduler in main.py.
    """
    from app.controllers.control_controller import motor_state

    for motor_id in settings.MOTORS:
        running = motor_state.is_running(motor_id)
        data = generate_sensor_data(motor_id, running=running)

        # Publish via MQTT
        mqtt_client.publish_sensor_data(motor_id, data)

    logger.debug(
        f"Generated sensor data for {len(settings.MOTORS)} motors | "
        f"Phases: {', '.join(f'{mid}={_get_state(mid).phase}' for mid in settings.MOTORS)}"
    )
