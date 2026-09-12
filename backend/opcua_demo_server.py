"""
OPC-UA Demo Server — AI Predictive Maintenance

Standalone OPC-UA server that exposes sensor nodes for 3 motors using
the same physics-based degradation logic as the simulator service.

This acts as a stand-in for a real PLC/SCADA system during demos.
The OPC-UA client in opcua_service.py connects to this server
exactly the same way it would connect to a Siemens S7-1500.

Usage:
    python opcua_demo_server.py          # runs on opc.tcp://0.0.0.0:4840/
    python opcua_demo_server.py --port 4840

Node structure (namespace=2):
    /Objects
      /Motors
        /Motor-HV-01
          .temperature   (Double)
          .vibration     (Double)
          .bearingHealth (Double)
          .phase         (String)
          .running       (Boolean)
          .currentR/S/T  (Double)
          .currentN      (Double)
          .voltageR/S/T  (Double)
        /Motor-HV-02  (same structure)
        /Motor-MV-01  (same structure)
"""

import asyncio
import logging
import random
import math
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from asyncua import Server, ua

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("opcua-demo-server")

# ─────────────────────────────────────────────────────────────
# Physics-based motor state (same model as simulator_service.py)
# ─────────────────────────────────────────────────────────────

class Phase(str, Enum):
    HEALTHY   = "HEALTHY"
    DEGRADING = "DEGRADING"
    WARNING   = "WARNING"
    CRITICAL  = "CRITICAL"
    FAILURE   = "FAILURE"


PHASE_TICKS = {
    Phase.HEALTHY:   900,
    Phase.DEGRADING: 450,
    Phase.WARNING:   225,
    Phase.CRITICAL:  100,
    Phase.FAILURE:   999999,
}

PHASE_ORDER = [Phase.HEALTHY, Phase.DEGRADING, Phase.WARNING, Phase.CRITICAL, Phase.FAILURE]


@dataclass
class MotorState:
    motor_id: str
    rated_current: float = field(default_factory=lambda: random.uniform(18.0, 32.0))
    base_voltage:  float = 220.0
    base_temp:     float = field(default_factory=lambda: random.uniform(38.0, 48.0))
    bearing_health: float = 1.0
    phase: Phase = Phase.HEALTHY
    ticks_in_phase: int = 0
    total_ticks: int = 0
    degradation_progress: float = 0.0
    temperature: float = 40.0
    vibration: float = 1.0
    startup_ticks: int = 0
    _was_running: bool = True


_motor_states: dict[str, MotorState] = {}


def _get_state(motor_id: str) -> MotorState:
    if motor_id not in _motor_states:
        _motor_states[motor_id] = MotorState(motor_id=motor_id)
        # Stagger phases for demo variety
        stagger = {"Motor-HV-01": 0, "Motor-HV-02": 300, "Motor-MV-01": 150}
        _motor_states[motor_id].ticks_in_phase = stagger.get(motor_id, 0)
    return _motor_states[motor_id]


def _noise(val: float, pct: float = 0.02) -> float:
    return val * (1.0 + random.uniform(-pct, pct))


def _advance_phase(state: MotorState):
    threshold = PHASE_TICKS.get(state.phase, 999999)
    state.degradation_progress = min(1.0, state.ticks_in_phase / threshold)
    if state.ticks_in_phase >= threshold:
        idx = PHASE_ORDER.index(state.phase)
        if idx < len(PHASE_ORDER) - 1:
            state.phase = PHASE_ORDER[idx + 1]
            state.ticks_in_phase = 0
            logger.warning(f"⚠️  {state.motor_id} → phase transition to {state.phase}")


def generate_sensor_data(motor_id: str, running: bool = True) -> dict:
    state = _get_state(motor_id)

    if running:
        state.ticks_in_phase += 1
        state.total_ticks += 1
        _advance_phase(state)

    # Temperature (Arrhenius thermal model)
    phase_temps = {
        Phase.HEALTHY:   (38.0, 55.0),
        Phase.DEGRADING: (55.0, 68.0),
        Phase.WARNING:   (68.0, 82.0),
        Phase.CRITICAL:  (82.0, 96.0),
        Phase.FAILURE:   (96.0, 115.0),
    }
    tmin, tmax = phase_temps.get(state.phase, (38.0, 55.0))
    target_temp = tmin + (tmax - tmin) * state.degradation_progress
    if running:
        state.temperature += (target_temp - state.temperature) * 0.03
    else:
        state.temperature = max(state.base_temp, state.temperature - 0.5)
    temperature = _noise(state.temperature, pct=0.01)

    # Vibration (Palmgren-Miner model)
    phase_vibs = {
        Phase.HEALTHY:   (0.8, 1.5),
        Phase.DEGRADING: (1.5, 3.2),
        Phase.WARNING:   (3.2, 6.5),
        Phase.CRITICAL:  (6.5, 11.0),
        Phase.FAILURE:   (11.0, 18.0),
    }
    vmin, vmax = phase_vibs.get(state.phase, (0.8, 1.5))
    target_vib = vmin + (vmax - vmin) * state.degradation_progress
    if running:
        state.vibration += (target_vib - state.vibration) * 0.08
        if state.phase in (Phase.CRITICAL, Phase.FAILURE) and random.random() < 0.15:
            state.vibration += random.uniform(1.0, 3.0)
    vibration = _noise(state.vibration, pct=0.04) if running else 0.0

    # Bearing health
    if running:
        wear_rates = {
            Phase.HEALTHY:   0.0003,
            Phase.DEGRADING: 0.001,
            Phase.WARNING:   0.003,
            Phase.CRITICAL:  0.008,
            Phase.FAILURE:   0.02,
        }
        state.bearing_health = max(0.0, state.bearing_health - wear_rates.get(state.phase, 0.0003))

    # Electrical
    if not running:
        elec = {
            "currentR": 0.0, "currentS": 0.0, "currentT": 0.0, "currentN": 0.0,
            "voltageR": _noise(state.base_voltage, 0.005),
            "voltageS": _noise(state.base_voltage, 0.005),
            "voltageT": _noise(state.base_voltage, 0.005),
        }
    else:
        load_factor = 1.0 + (1.0 - state.bearing_health) * 0.25
        vib_factor  = 1.0 + max(0, vibration - 2.0) * 0.02
        base_i = state.rated_current * load_factor * vib_factor

        imbalance_pct = {
            Phase.HEALTHY: 0.01, Phase.DEGRADING: 0.03, Phase.WARNING: 0.06,
            Phase.CRITICAL: 0.12, Phase.FAILURE: 0.20,
        }.get(state.phase, 0.01)

        ir = random.uniform(-imbalance_pct, imbalance_pct)
        is_ = random.uniform(-imbalance_pct, imbalance_pct)
        it = -(ir + is_) * 0.5

        neutral_degradation = {
            Phase.HEALTHY: 0.5, Phase.DEGRADING: 1.5, Phase.WARNING: 3.0,
            Phase.CRITICAL: 6.0, Phase.FAILURE: 12.0,
        }.get(state.phase, 0.5)

        elec = {
            "currentR": round(max(0, _noise(base_i * (1+ir), 0.01)), 2),
            "currentS": round(max(0, _noise(base_i * (1+is_), 0.01)), 2),
            "currentT": round(max(0, _noise(base_i * (1+it), 0.01)), 2),
            "currentN": round(max(0, _noise(neutral_degradation, 0.08)), 2),
            "voltageR": round(_noise(state.base_voltage, 0.005), 2),
            "voltageS": round(_noise(state.base_voltage, 0.005), 2),
            "voltageT": round(_noise(state.base_voltage, 0.005), 2),
        }

    return {
        "motorId":      motor_id,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
        "running":      running,
        "temperature":  round(temperature, 2),
        "vibration":    round(vibration, 2),
        "bearingHealth": round(state.bearing_health * 100, 1),
        "phase":        state.phase.value,
        **elec,
    }


# ─────────────────────────────────────────────────────────────
# OPC-UA Server
# ─────────────────────────────────────────────────────────────

MOTORS = ["Motor-HV-01", "Motor-HV-02", "Motor-MV-01"]
FIELDS = [
    "temperature", "vibration", "bearingHealth", "phase",
    "running",
    "currentR", "currentS", "currentT", "currentN",
    "voltageR", "voltageS", "voltageT",
]


async def run_server(port: int = 4840):
    server = Server()
    await server.init()

    server.set_endpoint(f"opc.tcp://0.0.0.0:{port}/")
    server.set_server_name("AI Predictive Maintenance OPC-UA Demo Server")

    # Security: no security for demo (add certificates for production)
    await server.set_security_policy([ua.SecurityPolicyType.NoSecurity])

    ns = await server.register_namespace("urn:anggy:predictive-maintenance")
    logger.info(f"OPC-UA namespace index: {ns}")

    objects = server.nodes.objects
    motors_folder = await objects.add_folder(ns, "Motors")

    # Create node variables for each motor
    motor_nodes: dict[str, dict] = {}
    for motor_id in MOTORS:
        motor_folder = await motors_folder.add_folder(ns, motor_id)
        motor_nodes[motor_id] = {}

        for field_name in FIELDS:
            if field_name in ("phase",):
                var = await motor_folder.add_variable(ns, field_name, "HEALTHY")
                await var.set_writable()
            elif field_name == "running":
                var = await motor_folder.add_variable(ns, field_name, True)
                await var.set_writable()
            else:
                var = await motor_folder.add_variable(ns, field_name, 0.0)
                await var.set_writable()

            motor_nodes[motor_id][field_name] = var
        logger.info(f"✓ Created OPC-UA nodes for {motor_id}")

    logger.info("=" * 60)
    logger.info(f"🔷 OPC-UA Demo Server started")
    logger.info(f"   Endpoint : opc.tcp://0.0.0.0:{port}/")
    logger.info(f"   Namespace: {ns} (urn:anggy:predictive-maintenance)")
    logger.info(f"   Motors   : {', '.join(MOTORS)}")
    logger.info(f"   Fields   : {len(FIELDS)} per motor")
    logger.info("=" * 60)

    async with server:
        tick = 0
        while True:
            tick += 1
            for motor_id in MOTORS:
                data = generate_sensor_data(motor_id, running=True)
                nodes = motor_nodes[motor_id]

                for field_name in FIELDS:
                    val = data.get(field_name)
                    if val is not None:
                        await nodes[field_name].write_value(val)

            if tick % 30 == 0:
                # Log status every minute (30 ticks × 2s)
                statuses = []
                for mid in MOTORS:
                    s = _get_state(mid)
                    statuses.append(f"{mid}={s.phase.value}({s.bearing_health*100:.0f}%)")
                logger.info(f"Motor phases: {' | '.join(statuses)}")

            await asyncio.sleep(2.0)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="OPC-UA Demo Server for AI Predictive Maintenance")
    parser.add_argument("--port", type=int, default=4840, help="OPC-UA server port (default: 4840)")
    args = parser.parse_args()
    asyncio.run(run_server(args.port))
