"""
OPC-UA Client Service — AI Predictive Maintenance

Connects to any OPC-UA server (Siemens S7, ABB, Kepware, open62541, etc.)
and streams sensor data into the same pipeline as the simulator.

Data source mode is controlled by the DATA_SOURCE env var:
  - "simulator": use physics-based simulator (default)
  - "opcua":     use this OPC-UA client (connects to real PLC/SCADA or demo server)

Node ID Mapping (configurable via env vars):
  Each motor exposes a "parent" node. Under each parent:
    .temperature   (Double, °C)
    .vibration     (Double, mm/s)
    .currentR/S/T  (Double, Ampere)
    .currentN      (Double, Ampere — neutral/ground)
    .voltageR/S/T  (Double, Volt)
    .running       (Boolean)
    .bearingHealth (Double, 0-100%)
    .phase         (String — "HEALTHY"|"DEGRADING"|"WARNING"|"CRITICAL"|"FAILURE")
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Callable, Optional

from asyncua import Client, Node
from asyncua.common.subscription import SubHandler

from app.core.config import settings

logger = logging.getLogger("opcua")


class _SensorDataHandler(SubHandler):
    """
    asyncua subscription handler.
    Called whenever a subscribed OPC-UA node value changes.
    """

    def __init__(self, motor_states: dict, on_data_cb: Callable):
        self._motor_states = motor_states  # node_id -> (motor_id, field_name)
        self._on_data_cb = on_data_cb
        # Buffer partial reads per motor until all fields arrive
        self._buffers: dict[str, dict] = {}

    def datachange_notification(self, node: Node, val, data):
        """Called synchronously by asyncua when a value changes."""
        node_id_str = node.nodeid.to_string()
        mapping = self._motor_states.get(node_id_str)
        if not mapping:
            return

        motor_id, field_name = mapping

        if motor_id not in self._buffers:
            self._buffers[motor_id] = {
                "motorId": motor_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        self._buffers[motor_id][field_name] = val

        # Emit when we have at least the core fields
        required = {"temperature", "vibration", "running"}
        buf = self._buffers[motor_id]
        if required.issubset(buf.keys()):
            buf["timestamp"] = datetime.now(timezone.utc).isoformat()
            self._on_data_cb(dict(buf))  # send copy to pipeline


class OPCUAClient:
    """
    Async OPC-UA client for the AI Predictive Maintenance system.

    Usage:
        await opcua_client.connect()
        await opcua_client.subscribe_all_motors()
        # ... system runs, data flows via callback ...
        await opcua_client.disconnect()
    """

    def __init__(self):
        self._client: Optional[Client] = None
        self._subscription = None
        self._on_sensor_data: Optional[Callable] = None
        self._connected = False
        self._reconnect_task: Optional[asyncio.Task] = None
        # Maps "ns=X;i=Y" -> (motor_id, field_name)
        self._node_map: dict[str, tuple[str, str]] = {}

    def on_sensor_data(self, callback: Callable):
        """Register callback — same interface as simulator_service."""
        self._on_sensor_data = callback

    async def connect(self) -> bool:
        """
        Connect to the OPC-UA server defined by settings.OPCUA_ENDPOINT.
        Returns True on success.
        """
        endpoint = settings.OPCUA_ENDPOINT
        logger.info(f"Connecting to OPC-UA server: {endpoint}")
        try:
            self._client = Client(url=endpoint)
            self._client.set_security_string("")  # No security for demo
            await self._client.connect()
            self._connected = True
            logger.info(f"✅ Connected to OPC-UA server at {endpoint}")
            return True
        except Exception as exc:
            logger.error(f"❌ OPC-UA connection failed: {exc}")
            self._connected = False
            return False

    async def disconnect(self):
        """Gracefully disconnect from the OPC-UA server."""
        if self._reconnect_task:
            self._reconnect_task.cancel()
        if self._subscription:
            try:
                await self._subscription.delete()
            except Exception:
                pass
        if self._client:
            try:
                await self._client.disconnect()
            except Exception:
                pass
        self._connected = False
        logger.info("OPC-UA client disconnected.")

    async def subscribe_all_motors(self):
        """
        Subscribe to sensor nodes for all motors defined in settings.
        Node IDs are mapped per motor from settings (OPCUA_NODE_MOTOR_*).
        """
        if not self._connected or not self._client:
            logger.error("Cannot subscribe — OPC-UA not connected.")
            return

        # Build node map from settings
        motor_node_map = {
            "Motor-HV-01": settings.OPCUA_NAMESPACE_MOTOR_HV01,
            "Motor-HV-02": settings.OPCUA_NAMESPACE_MOTOR_HV02,
            "Motor-MV-01": settings.OPCUA_NAMESPACE_MOTOR_MV01,
        }

        # Field name -> OPC-UA child browse name (matches our demo server)
        field_names = [
            "temperature",
            "vibration",
            "bearingHealth",
            "phase",
            "running",
            "currentR",
            "currentS",
            "currentT",
            "currentN",
            "voltageR",
            "voltageS",
            "voltageT",
        ]

        nodes_to_subscribe: list[Node] = []

        for motor_id, base_node_id in motor_node_map.items():
            try:
                base_node = self._client.get_node(base_node_id)
                for field in field_names:
                    child = await base_node.get_child([f"{settings.OPCUA_NAMESPACE}:{field}"])
                    child_id = child.nodeid.to_string()
                    self._node_map[child_id] = (motor_id, field)
                    nodes_to_subscribe.append(child)
                logger.info(f"  ✓ Mapped {len(field_names)} nodes for {motor_id}")
            except Exception as exc:
                logger.warning(f"  ✗ Failed to map nodes for {motor_id}: {exc}")

        if not nodes_to_subscribe:
            logger.error("No OPC-UA nodes found to subscribe to.")
            return

        handler = _SensorDataHandler(self._node_map, self._on_sensor_data)

        try:
            self._subscription = await self._client.create_subscription(
                period=2000,  # 2 seconds polling interval (matches simulator)
                handler=handler,
            )
            await self._subscription.subscribe_data_change(nodes_to_subscribe)
            logger.info(
                f"✅ OPC-UA subscription active — monitoring "
                f"{len(nodes_to_subscribe)} nodes across {len(motor_node_map)} motors"
            )
        except Exception as exc:
            logger.error(f"OPC-UA subscription failed: {exc}")

    async def reconnect_loop(self):
        """
        Background task that monitors connection and auto-reconnects.
        Runs indefinitely until cancelled.
        """
        while True:
            await asyncio.sleep(10)
            if not self._connected:
                logger.warning("OPC-UA disconnected — attempting reconnect...")
                success = await self.connect()
                if success:
                    await self.subscribe_all_motors()

    def start_reconnect_monitor(self, loop: asyncio.AbstractEventLoop):
        """Start the auto-reconnect background coroutine."""
        self._reconnect_task = loop.create_task(self.reconnect_loop())

    @property
    def is_connected(self) -> bool:
        return self._connected


# ─────────────────────────────────────────────────────────────
# Singleton instance (same pattern as mqtt_client, ml_analyzer)
# ─────────────────────────────────────────────────────────────
opcua_client = OPCUAClient()
