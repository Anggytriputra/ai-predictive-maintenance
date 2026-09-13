'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  SensorData,
  SOCKET_URL,
  getStatus,
  MotorNode,
  PumpNode,
  ValveNode,
  ReactorNode
} from './components/CustomNodes';

const nodeTypes = { motorNode: MotorNode, pumpNode: PumpNode, valveNode: ValveNode, reactorNode: ReactorNode };

// Mathematically aligned node coordinates:
// Train 1 centerline: Y = 100px (Motor: 62+38=100, Pump: 70+30=100, Valve: 62+38=100) -> 100% flat line
// Train 2 centerline: Y = 420px (Motor: 382+38=420, Pump: 390+30=420, Valve: 382+38=420) -> 100% flat line
// Reactor centered at Y = 260px (midpoint between 100 and 420). Inlets at Y=233 and Y=287 (symmetrical 133px curves)
// Discharge line: Y = 260px (Valve: 222+38=260, Pump: 230+30=260, Motor: 222+38=260) -> 100% flat discharge line
const initialNodes: Node[] = [
  // Train 1: Upper Feed Line (Motor-HV-01 -> Pump P-101 -> Valve FCV-101 -> Reactor R-101 Inlet 1)
  { id: 'motor-1', type: 'motorNode', position: { x: 40, y: 62 }, data: { label: 'Motor-HV-01' } },
  { id: 'pump-1', type: 'pumpNode', position: { x: 260, y: 70 }, data: { label: 'P-101', running: true } },
  { id: 'valve-1', type: 'valveNode', position: { x: 450, y: 62 }, data: { label: 'FCV-101', open: true } },

  // Train 2: Lower Feed Line (Motor-HV-02 -> Pump P-102 -> Valve FCV-102 -> Reactor R-101 Inlet 2)
  { id: 'motor-2', type: 'motorNode', position: { x: 40, y: 382 }, data: { label: 'Motor-HV-02' } },
  { id: 'pump-2', type: 'pumpNode', position: { x: 260, y: 390 }, data: { label: 'P-102', running: true } },
  { id: 'valve-2', type: 'valveNode', position: { x: 450, y: 382 }, data: { label: 'FCV-102', open: true } },

  // Central Vessel: Stirred Tank Reactor R-101
  { id: 'reactor', type: 'reactorNode', position: { x: 670, y: 204 }, data: { label: 'R-101', pressure: 2.4, level: 68 } },

  // Discharge Train: Reactor Outlet -> Valve FCV-103 -> Pump P-103 (driven by Motor-MV-01)
  { id: 'valve-3', type: 'valveNode', position: { x: 890, y: 222 }, data: { label: 'FCV-103', open: true } },
  { id: 'pump-3', type: 'pumpNode', position: { x: 1070, y: 230 }, data: { label: 'P-103', running: true } },
  { id: 'motor-3', type: 'motorNode', position: { x: 1250, y: 222 }, data: { label: 'Motor-MV-01' } },
];

const edgeStyle = (color: string): Partial<Edge> => ({
  type: 'smoothstep',
  animated: true,
  style: { stroke: color, strokeWidth: 3 },
  markerEnd: { type: MarkerType.ArrowClosed, color },
});

const initialEdges: Edge[] = [
  // Train 1: Upper Feed Line
  { id: 'e1', source: 'motor-1', target: 'pump-1', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#6366f1') },
  { id: 'e2', source: 'pump-1', target: 'valve-1', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#06b6d4') },
  { id: 'e3', source: 'valve-1', target: 'reactor', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#f59e0b') },

  // Train 2: Lower Feed Line (Connected to Inlet 2 'in2' on Reactor)
  { id: 'e4', source: 'motor-2', target: 'pump-2', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#6366f1') },
  { id: 'e5', source: 'pump-2', target: 'valve-2', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#06b6d4') },
  { id: 'e6', source: 'valve-2', target: 'reactor', sourceHandle: 'out', targetHandle: 'in2', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#f59e0b') },

  // Discharge Train: Reactor Outlet -> FCV-103 -> P-103 -> Motor-MV-01
  { id: 'e7', source: 'reactor', target: 'valve-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#f59e0b') },
  { id: 'e8', source: 'valve-3', target: 'pump-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#06b6d4') },
  { id: 'e9', source: 'pump-3', target: 'motor-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#6366f1') },
];

export default function PIDPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [sensorMap, setSensorMap] = useState<Record<string, SensorData>>({});

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL);
    socket.on('sensor_overview', (d: SensorData) =>
      setSensorMap((prev) => ({ ...prev, [d.motorId]: d }))
    );
    return () => { socket.close(); };
  }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.type === 'motorNode'
          ? { ...node, data: { ...node.data, sensorData: sensorMap[node.data.label as string] } }
          : node
      )
    );
  }, [sensorMap, setNodes]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const motorId = (edge.data as { motorId?: string })?.motorId;
        if (!motorId) return edge;
        const sensor = sensorMap[motorId];
        const isRunning = sensor ? sensor.running !== false : true;
        return { ...edge, animated: isRunning };
      })
    );
  }, [sensorMap, setEdges]);

  return (
    <div className="h-screen w-screen bg-[#060810] flex flex-col overflow-hidden font-sans">

      {/* React Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3} maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a2035" gap={28} size={1} />
          <Controls className="!bg-[#0d1117] !border-white/10 !rounded-xl" />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-[#0d1117]/90 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-xl shadow-2xl z-10 text-xs">
          <p className="font-bold text-gray-400 uppercase tracking-widest mb-3 text-[10px]">ISA SCADA Legend</p>
          <div className="space-y-2.5">
            {[
              { color: '#6366f1', label: 'Motor Drive Shaft' },
              { color: '#06b6d4', label: 'Process Fluid Line' },
              { color: '#f59e0b', label: 'Control Valve Line' },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-2.5">
                <div className="w-8 h-0.5 rounded" style={{ background: i.color }} />
                <span className="text-gray-400">{i.label}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 mt-1 space-y-1.5">
              {[
                { sym: 'M', label: 'Electric Motor (ISA)' },
                { sym: 'P', label: 'Centrifugal Pump (ISA)' },
                { sym: 'FCV', label: 'Globe Control Valve' },
                { sym: 'R', label: 'Stirred Tank Reactor' },
              ].map((i) => (
                <div key={i.label} className="flex items-center gap-2.5">
                  <span className="text-cyan-400 w-8 text-center font-mono text-[10px] font-bold">{i.sym}</span>
                  <span className="text-gray-400">{i.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
