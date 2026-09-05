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

const initialNodes: Node[] = [
  { id: 'motor-1', type: 'motorNode', position: { x: 40, y: 60 }, data: { label: 'Motor-HV-01' } },
  { id: 'pump-1', type: 'pumpNode', position: { x: 270, y: 80 }, data: { label: 'P-101', running: true } },
  { id: 'valve-1', type: 'valveNode', position: { x: 440, y: 62 }, data: { label: 'FCV-101', open: true } },

  { id: 'motor-2', type: 'motorNode', position: { x: 40, y: 370 }, data: { label: 'Motor-HV-02' } },
  { id: 'pump-2', type: 'pumpNode', position: { x: 270, y: 390 }, data: { label: 'P-102', running: true } },
  { id: 'valve-2', type: 'valveNode', position: { x: 440, y: 372 }, data: { label: 'FCV-102', open: true } },

  { id: 'reactor', type: 'reactorNode', position: { x: 650, y: 100 }, data: { label: 'R-101', pressure: 2.4, level: 68 } },

  { id: 'valve-3', type: 'valveNode', position: { x: 880, y: 430 }, data: { label: 'FCV-103', open: true } },
  { id: 'pump-3', type: 'pumpNode', position: { x: 1060, y: 448 }, data: { label: 'P-103', running: true } },
  { id: 'motor-3', type: 'motorNode', position: { x: 1240, y: 430 }, data: { label: 'Motor-MV-01' } },
];

const edgeStyle = (color: string): Partial<Edge> => ({
  type: 'smoothstep',
  animated: true,
  style: { stroke: color, strokeWidth: 3 },
  markerEnd: { type: MarkerType.ArrowClosed, color },
});

const initialEdges: Edge[] = [
  { id: 'e1', source: 'motor-1', target: 'pump-1', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#6366f1') },
  { id: 'e2', source: 'pump-1', target: 'valve-1', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#06b6d4') },
  { id: 'e3', source: 'valve-1', target: 'reactor', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#f59e0b') },

  { id: 'e4', source: 'motor-2', target: 'pump-2', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#6366f1') },
  { id: 'e5', source: 'pump-2', target: 'valve-2', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#06b6d4') },
  { id: 'e6', source: 'valve-2', target: 'reactor', sourceHandle: 'out', targetHandle: 'in2', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#f59e0b') },

  { id: 'e7', source: 'reactor', target: 'valve-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#f97316') },
  { id: 'e8', source: 'valve-3', target: 'pump-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#fb923c') },
  { id: 'e9', source: 'pump-3', target: 'motor-3', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-MV-01' }, ...edgeStyle('#f97316') },
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

  const total = Object.keys(sensorMap).length;
  const critical = Object.values(sensorMap).filter((s) => getStatus(s.temperature) === 'CRITICAL').length;
  const warning = Object.values(sensorMap).filter((s) => getStatus(s.temperature) === 'WARNING').length;
  const healthy = total - critical - warning;

  return (
    <div className="h-screen w-screen bg-[#060810] flex flex-col overflow-hidden font-sans">

      {/* React Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.25 }}
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
                { sym: '⬜ M', label: 'Electric Motor (ISA)' },
                { sym: '▷○', label: 'Centrifugal Pump (ISA)' },
                { sym: '⋈', label: 'Globe Control Valve' },
                { sym: '⊡', label: 'Stirred Tank Reactor' },
              ].map((i) => (
                <div key={i.label} className="flex items-center gap-2.5">
                  <span className="text-gray-500 w-8 text-center font-mono text-[10px]">{i.sym}</span>
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
