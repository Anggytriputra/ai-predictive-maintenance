'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Link from 'next/link';

const SOCKET_URL = 'http://localhost:3000';

interface SensorData {
  motorId: string;
  temperature: number;
  vibration: number;
  currentR: number;
  running: boolean; // ✅ Added: backend sends this field to indicate motor ON/OFF
}

// ─── Status helper ────────────────────────────────────────────────────────────
function getStatus(temp: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
  if (temp > 85) return 'CRITICAL';
  if (temp > 75) return 'WARNING';
  return 'HEALTHY';
}

const STATUS_STYLE = {
  HEALTHY:  { stroke: '#10b981', glow: '#10b98150', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  WARNING:  { stroke: '#f59e0b', glow: '#f59e0b50', text: 'text-yellow-400',  badge: 'bg-yellow-500/20  text-yellow-300  border-yellow-500/40' },
  CRITICAL: { stroke: '#ef4444', glow: '#ef444450', text: 'text-red-400',     badge: 'bg-red-500/20     text-red-300     border-red-500/40' },
};

// ════════════════════════════════════════════════════════════════════════════
// ISA SYMBOL: Electric Motor  (circle + "M" + shaft on right)
// Standard: IEC 60617 / ISA 5.1
// ════════════════════════════════════════════════════════════════════════════
function MotorSymbol({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full">
      {/* Stator body (outer rectangle) */}
      <rect x="5" y="10" width="55" height="40" rx="3"
        fill={fill} stroke={stroke} strokeWidth="2.5"/>
      {/* Rotor circle inside */}
      <circle cx="32" cy="30" r="14"
        fill="none" stroke={stroke} strokeWidth="2"/>
      {/* Letter M — standard motor identifier */}
      <text x="32" y="35" textAnchor="middle"
        fontSize="14" fontWeight="bold" fontFamily="monospace"
        fill={stroke} stroke="none">M</text>
      {/* Shaft out to the right */}
      <line x1="60" y1="30" x2="78" y2="30"
        stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Shaft end cap */}
      <circle cx="78" cy="30" r="2" fill={stroke}/>
      {/* Terminal box on top */}
      <rect x="20" y="2" width="24" height="9" rx="2"
        fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <line x1="26" y1="2" x2="26" y2="11" stroke={stroke} strokeWidth="1"/>
      <line x1="32" y1="2" x2="32" y2="11" stroke={stroke} strokeWidth="1"/>
      <line x1="38" y1="2" x2="38" y2="11" stroke={stroke} strokeWidth="1"/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ISA SYMBOL: Centrifugal Pump  (circle + triangle blade pointing flow direction)
// Standard: ISA 5.1 Figure 20
// ════════════════════════════════════════════════════════════════════════════
function PumpSymbol({ stroke, running }: { stroke: string; running: boolean }) {
  return (
    <svg viewBox="0 0 70 60" className="w-full h-full">
      {/* Casing circle */}
      <circle cx="32" cy="30" r="22"
        fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      {/* Impeller blade (centrifugal) — triangle pointing right = flow direction */}
      <polygon points="18,20 18,40 46,30"
        fill={running ? stroke + '50' : '#37415180'} stroke={stroke} strokeWidth="2"/>
      {/* Suction inlet (left) */}
      <line x1="0" y1="30" x2="10" y2="30"
        stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Discharge outlet (right) */}
      <line x1="54" y1="30" x2="70" y2="30"
        stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Drive shaft line (bottom, connected to motor) */}
      <line x1="32" y1="52" x2="32" y2="60"
        stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeDasharray="3,2"/>
      {/* Running indicator dot */}
      {running && <circle cx="32" cy="30" r="4" fill={stroke} opacity="0.8"/>}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ISA SYMBOL: Globe Control Valve  (bow-tie + square actuator on top)
// Standard: ISA 5.1 — pneumatic actuator with globe valve body
// ════════════════════════════════════════════════════════════════════════════
function ValveSymbol({ stroke, isOpen }: { stroke: string; isOpen: boolean }) {
  const fill = isOpen ? stroke + '30' : '#37415180';
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      {/* Actuator (pneumatic diaphragm) — square on top */}
      <rect x="15" y="2" width="30" height="20" rx="2"
        fill="#0d1117" stroke={stroke} strokeWidth="2"/>
      <line x1="20" y1="9" x2="40" y2="9"   stroke={stroke} strokeWidth="1"/>
      <line x1="20" y1="15" x2="40" y2="15" stroke={stroke} strokeWidth="1"/>
      {/* Actuator stem going down to valve */}
      <line x1="30" y1="22" x2="30" y2="34" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* Valve body — bow-tie (two triangles pointing at each other) */}
      {/* Left triangle */}
      <polygon points="2,38 28,30 28,46"
        fill={fill} stroke={stroke} strokeWidth="2.5"/>
      {/* Right triangle */}
      <polygon points="58,38 32,30 32,46"
        fill={fill} stroke={stroke} strokeWidth="2.5"/>
      {/* Center pinch point */}
      <circle cx="30" cy="38" r="3" fill={stroke}/>
      {/* Pipe in (left) */}
      <line x1="0"  y1="38" x2="2"  y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Pipe out (right) */}
      <line x1="58" y1="38" x2="60" y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Status text */}
      <text x="30" y="72" textAnchor="middle"
        fontSize="9" fontFamily="monospace" fontWeight="bold"
        fill={stroke}>{isOpen ? 'OPEN' : 'CLOSED'}</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ISA SYMBOL: Stirred Tank Reactor (vertical vessel + agitator)
// Standard: ISA 5.1 / ASME — tall cylindrical vessel with dome top/bottom
// ════════════════════════════════════════════════════════════════════════════
function ReactorSymbol({ stroke, level }: { stroke: string; level: number }) {
  const vesselTop    = 18;
  const vesselBottom = 155;
  const vesselHeight = vesselBottom - vesselTop;
  const liquidTop    = vesselTop + vesselHeight * (1 - level / 100);

  return (
    <svg viewBox="0 0 80 180" className="w-full h-full">
      {/* ── Vessel body ── */}
      {/* Side walls */}
      <line x1="15" y1={vesselTop + 8} x2="15" y2={vesselBottom - 8}
        stroke={stroke} strokeWidth="3"/>
      <line x1="65" y1={vesselTop + 8} x2="65" y2={vesselBottom - 8}
        stroke={stroke} strokeWidth="3"/>
      {/* Elliptical dome top */}
      <ellipse cx="40" cy={vesselTop + 8} rx="25" ry="9"
        fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      {/* Elliptical dome bottom */}
      <ellipse cx="40" cy={vesselBottom - 8} rx="25" ry="9"
        fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>

      {/* ── Liquid level fill (clipped to vessel body) ── */}
      <clipPath id="vesselClip">
        <rect x="16" y={vesselTop + 8} width="48" height={vesselHeight - 16}/>
      </clipPath>
      <rect x="16" y={liquidTop} width="48" height={vesselBottom - liquidTop - 8}
        fill={stroke + '25'} clipPath="url(#vesselClip)"/>

      {/* ── Agitator shaft ── */}
      <line x1="40" y1={vesselTop + 8} x2="40" y2={vesselBottom - 14}
        stroke={stroke} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"/>

      {/* ── Agitator blades (Rushton-style turbine) ── */}
      {/* Upper blade set */}
      <line x1="22" y1="75" x2="58" y2="75" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="65" x2="22" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="65" x2="58" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* Lower blade set */}
      <line x1="22" y1="115" x2="58" y2="115" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="105" x2="22" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="105" x2="58" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>

      {/* ── Nozzles / Pipes ── */}
      {/* Feed inlet top-left */}
      <line x1="0"  y1="35" x2="15" y2="35" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <text x="1" y="32" fontSize="7" fill={stroke} fontFamily="monospace">IN</text>
      {/* Product outlet bottom-right */}
      <line x1="65" y1="145" x2="80" y2="145" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <text x="60" y="158" fontSize="7" fill={stroke} fontFamily="monospace">OUT</text>
      {/* Vent top-right */}
      <line x1="52" y1="10" x2="52" y2="0" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <text x="55" y="10" fontSize="7" fill={stroke} fontFamily="monospace">V</text>

      {/* ── Level indicator ── */}
      <line x1="69" y1={vesselTop + 8}     x2="77" y2={vesselTop + 8}     stroke={stroke} strokeWidth="1.5"/>
      <line x1="69" y1={vesselBottom - 8}  x2="77" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1.5"/>
      <line x1="73" y1={vesselTop + 8}     x2="73" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1" opacity="0.4"/>
      <line x1="71" y1={liquidTop}         x2="75" y2={liquidTop}         stroke={stroke} strokeWidth="2"/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REACT FLOW NODES
// ════════════════════════════════════════════════════════════════════════════

async function sendMotorCommand(motorId: string, action: 'start' | 'stop') {
  await fetch(`http://localhost:3000/api/control/motors/${motorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

function MotorNode({ data }: { data: { label: string; sensorData?: SensorData } }) {
  const sensor = data.sensorData;
  const running = sensor?.running !== false; // default true until we get data
  const status = sensor ? getStatus(sensor.temperature) : 'HEALTHY';
  // If motor is stopped, override status display
  const displayStatus = !running ? 'STOPPED' : status;
  const st = running ? STATUS_STYLE[status] : {
    stroke: '#6b7280', glow: '#6b728040',
    text: 'text-gray-400',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  };

  const [confirming, setConfirming] = useState<'stop' | 'start' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCommand = async (action: 'start' | 'stop') => {
    setLoading(true);
    await sendMotorCommand(data.label, action);
    setLoading(false);
    setConfirming(null);
  };

  return (
    <div className="relative" style={{ filter: `drop-shadow(0 0 12px ${st.glow})` }}>
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '35%', right: -8, width: 12, height: 12, background: st.stroke, border: `2px solid ${st.stroke}cc` }}/>
      <Handle type="target" position={Position.Left} id="in"
        style={{ top: '35%', left: -8, width: 12, height: 12, background: st.stroke, border: `2px solid ${st.stroke}cc` }}/>

      {/* ISA Motor Symbol */}
      <div className="w-28 h-20" style={{ opacity: running ? 1 : 0.45, transition: 'opacity 0.5s' }}>
        <MotorSymbol stroke={st.stroke} fill="#0d1117"/>
      </div>

      {/* Tag Label */}
      <div className="mt-1 text-center">
        <span className={`text-xs font-bold font-mono ${st.text}`}>{data.label}</span>
      </div>

      {/* ── SCADA Control Panel ─────────────────────────────── */}
      <div className="mt-2 flex flex-col gap-1.5 w-36 mx-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between rounded-lg border px-2.5 py-1"
          style={{ borderColor: st.stroke + '50', background: st.stroke + '15' }}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${running ? 'animate-pulse' : ''}`}
              style={{ background: st.stroke }}/>
            <span className="text-[10px] font-bold font-mono" style={{ color: st.stroke }}>
              {displayStatus}
            </span>
          </div>
          {sensor && running && (
            <span className="text-[9px] text-gray-500 font-mono">{sensor.temperature.toFixed(0)}°C</span>
          )}
        </div>

        {/* Confirmation dialog */}
        {confirming === 'stop' && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-center">
            <p className="text-[10px] text-red-300 mb-1.5 font-semibold">⚠ Stop {data.label}?</p>
            <div className="flex gap-1.5">
              <button onClick={() => handleCommand('stop')} disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold py-1 rounded-md transition-colors disabled:opacity-50">
                {loading ? '...' : 'CONFIRM'}
              </button>
              <button onClick={() => setConfirming(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold py-1 rounded-md transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {confirming === 'start' && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-center">
            <p className="text-[10px] text-emerald-300 mb-1.5 font-semibold">▶ Start {data.label}?</p>
            <div className="flex gap-1.5">
              <button onClick={() => handleCommand('start')} disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 rounded-md transition-colors disabled:opacity-50">
                {loading ? '...' : 'CONFIRM'}
              </button>
              <button onClick={() => setConfirming(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold py-1 rounded-md transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Control Buttons — only show when not confirming */}
        {!confirming && (
          <div className="flex gap-1.5">
            {/* START button */}
            <button
              onClick={() => setConfirming('start')}
              disabled={running || loading}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border
                disabled:opacity-30 disabled:cursor-not-allowed
                enabled:bg-emerald-600/20 enabled:border-emerald-500/40 enabled:text-emerald-300
                enabled:hover:bg-emerald-600 enabled:hover:text-white enabled:hover:border-emerald-500"
            >
              <span className="text-[10px]">▶</span> START
            </button>
            {/* STOP button */}
            <button
              onClick={() => setConfirming('stop')}
              disabled={!running || loading}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border
                disabled:opacity-30 disabled:cursor-not-allowed
                enabled:bg-red-600/20 enabled:border-red-500/40 enabled:text-red-300
                enabled:hover:bg-red-600 enabled:hover:text-white enabled:hover:border-red-500"
            >
              <span className="text-[10px]">■</span> STOP
            </button>
          </div>
        )}
      </div>

      {/* Data Popup (only when running) */}
      {sensor && running && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 top-full w-40 z-10 rounded-xl border bg-[#0d1117]/95 p-2.5 backdrop-blur shadow-2xl"
          style={{ borderColor: st.stroke + '50' }}>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">🌡 Temp</span>
              <span className="font-mono font-bold text-rose-400">{sensor.temperature.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">〰 Vibr.</span>
              <span className="font-mono font-bold text-violet-400">{sensor.vibration.toFixed(2)} mm/s</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">⚡ I (R)</span>
              <span className="font-mono font-bold text-cyan-400">{sensor.currentR.toFixed(2)} A</span>
            </div>
          </div>
        </div>
      )}
      {sensor && !running && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 text-[10px] text-gray-600 whitespace-nowrap font-mono">
          Motor offline — 28~35°C ambient
        </div>
      )}
    </div>
  );
}



function PumpNode({ data }: { data: { label: string; running?: boolean } }) {
  const running = data.running !== false;
  const stroke = running ? '#06b6d4' : '#6b7280';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: `drop-shadow(0 0 8px ${running ? '#06b6d440' : 'transparent'})` }}>
      <Handle type="target" position={Position.Left}  id="in"
        style={{ top: '40%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '40%', right: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>

      <div className="w-20 h-16">
        <PumpSymbol stroke={stroke} running={running}/>
      </div>
      <span className="text-[10px] font-bold font-mono mt-0.5" style={{ color: stroke }}>{data.label}</span>
      <span className="text-[9px] text-gray-600">{running ? '▶ Running' : '■ Stopped'}</span>
    </div>
  );
}

function ValveNode({ data }: { data: { label: string; open?: boolean } }) {
  const isOpen = data.open !== false;
  const stroke = isOpen ? '#f59e0b' : '#6b7280';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: `drop-shadow(0 0 8px ${isOpen ? '#f59e0b40' : 'transparent'})` }}>
      <Handle type="target" position={Position.Left}  id="in"
        style={{ top: '58%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '58%', right: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>

      <div className="w-14 h-20">
        <ValveSymbol stroke={stroke} isOpen={isOpen}/>
      </div>
      <span className="text-[10px] font-bold font-mono -mt-1" style={{ color: stroke }}>{data.label}</span>
    </div>
  );
}

function ReactorNode({ data }: { data: { label: string; pressure?: number; level?: number } }) {
  const pressure = data.pressure ?? 2.4;
  const level    = data.level    ?? 68;
  const stroke   = '#a855f7';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: 'drop-shadow(0 0 16px #a855f740)' }}>
      <Handle type="target" position={Position.Left} id="in"
        style={{ top: '22%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '80%', right: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }}/>

      {/* ISA Reactor Symbol */}
      <div className="w-24 h-48">
        <ReactorSymbol stroke={stroke} level={level}/>
      </div>

      {/* Tag + Data */}
      <div className="w-36 rounded-xl border bg-[#0d1117]/95 px-3 py-2 backdrop-blur shadow-2xl mt-1"
        style={{ borderColor: stroke + '50' }}>
        <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest mb-1.5">{data.label}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">⊙ Pressure</span>
            <span className="font-mono font-bold text-purple-400">{pressure.toFixed(1)} bar</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">▨ Level</span>
            <span className="font-mono font-bold text-fuchsia-400">{level}%</span>
          </div>
        </div>
        {/* Level bar */}
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full transition-all duration-1000"
            style={{ width: `${level}%` }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Node type registry ───────────────────────────────────────────────────────
const nodeTypes = { motorNode: MotorNode, pumpNode: PumpNode, valveNode: ValveNode, reactorNode: ReactorNode };

// ─── Initial layout ───────────────────────────────────────────────────────────
const initialNodes: Node[] = [
  { id: 'motor-1', type: 'motorNode',   position: { x: 40,  y: 80  }, data: { label: 'Motor-HV-01' } },
  { id: 'pump-1',  type: 'pumpNode',    position: { x: 260, y: 98  }, data: { label: 'P-101', running: true } },
  { id: 'valve-1', type: 'valveNode',   position: { x: 430, y: 82  }, data: { label: 'FCV-101', open: true } },

  { id: 'motor-2', type: 'motorNode',   position: { x: 40,  y: 360 }, data: { label: 'Motor-HV-02' } },
  { id: 'pump-2',  type: 'pumpNode',    position: { x: 260, y: 378 }, data: { label: 'P-102', running: true } },
  { id: 'valve-2', type: 'valveNode',   position: { x: 430, y: 362 }, data: { label: 'FCV-102', open: true } },

  { id: 'reactor', type: 'reactorNode', position: { x: 640, y: 100 }, data: { label: 'R-101', pressure: 2.4, level: 68 } },
];

const edgeStyle = (color: string): Partial<Edge> => ({
  type: 'smoothstep',
  animated: true,
  style: { stroke: color, strokeWidth: 3 },
  markerEnd: { type: MarkerType.ArrowClosed, color },
});

const initialEdges: Edge[] = [
  // Pipeline 1: Motor-HV-01 → Pump → Valve → Reactor
  { id: 'e1', source: 'motor-1', target: 'pump-1',  sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#6366f1') },
  { id: 'e2', source: 'pump-1',  target: 'valve-1', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#06b6d4') },
  { id: 'e3', source: 'valve-1', target: 'reactor', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-01' }, ...edgeStyle('#f59e0b') },
  // Pipeline 2: Motor-HV-02 → Pump → Valve → Reactor
  { id: 'e4', source: 'motor-2', target: 'pump-2',  sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#6366f1') },
  { id: 'e5', source: 'pump-2',  target: 'valve-2', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#06b6d4') },
  { id: 'e6', source: 'valve-2', target: 'reactor', sourceHandle: 'out', targetHandle: 'in', data: { motorId: 'Motor-HV-02' }, ...edgeStyle('#f59e0b') },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
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

  // Update motor node sensor data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.type === 'motorNode'
          ? { ...node, data: { ...node.data, sensorData: sensorMap[node.data.label as string] } }
          : node
      )
    );
  }, [sensorMap, setNodes]);

  // ✅ Fix: Update ALL pipeline edges animation based on their motor's running state
  // Each edge now carries a `motorId` in its data so we can look up the correct motor
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const motorId  = (edge.data as { motorId?: string })?.motorId;
        if (!motorId) return edge;
        const sensor   = sensorMap[motorId];
        const isRunning = sensor ? sensor.running !== false : true;
        return { ...edge, animated: isRunning };
      })
    );
  }, [sensorMap, setEdges]);

  const total    = Object.keys(sensorMap).length;
  const critical = Object.values(sensorMap).filter((s) => getStatus(s.temperature) === 'CRITICAL').length;
  const warning  = Object.values(sensorMap).filter((s) => getStatus(s.temperature) === 'WARNING').length;
  const healthy  = total - critical - warning;

  return (
    <div className="h-screen w-screen bg-[#060810] flex flex-col overflow-hidden font-sans">

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.07] bg-[#0a0d18]/90 backdrop-blur-xl z-20">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            P&amp;ID Live View
          </h1>
          <p className="text-[11px] text-gray-500">Piping & Instrumentation Diagram — ISA 5.1 Standard Symbols</p>
        </div>

        <div className="flex items-center gap-3">
          {healthy > 0 && (
            <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/> {healthy} Healthy
            </span>
          )}
          {warning > 0 && (
            <span className="flex items-center gap-1.5 text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"/> {warning} Warning
            </span>
          )}
          {critical > 0 && (
            <span className="flex items-center gap-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"/> {critical} Critical
            </span>
          )}
          <div className="w-px h-5 bg-white/10 mx-1"/>
          <Link href="/" className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all">
            ← Dashboard
          </Link>
        </div>
      </header>

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
          <Background color="#1a2035" gap={28} size={1}/>
          <Controls className="!bg-[#0d1117] !border-white/10 !rounded-xl"/>
          <MiniMap
            className="!bg-[#0d1117] !border-white/10 !rounded-xl"
            nodeColor={(n) => {
              if (n.type !== 'motorNode') return '#374151';
              const s = sensorMap[(n.data as { label: string }).label];
              if (!s) return '#374151';
              const st = getStatus(s.temperature);
              return st === 'CRITICAL' ? '#ef4444' : st === 'WARNING' ? '#f59e0b' : '#10b981';
            }}
            maskColor="#06081080"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-[#0d1117]/90 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-xl shadow-2xl z-10 text-xs">
          <p className="font-bold text-gray-400 uppercase tracking-widest mb-3 text-[10px]">ISA P&ID Legend</p>
          <div className="space-y-2.5">
            {[
              { color: '#6366f1', label: 'Motor Drive Shaft' },
              { color: '#06b6d4', label: 'Process Fluid Line' },
              { color: '#f59e0b', label: 'Control Valve Line' },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-2.5">
                <div className="w-8 h-0.5 rounded" style={{ background: i.color }}/>
                <span className="text-gray-400">{i.label}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 mt-1 space-y-1.5">
              {[
                { sym: '⬜ M', label: 'Electric Motor (ISA)' },
                { sym: '▷○',  label: 'Centrifugal Pump (ISA)' },
                { sym: '⋈',   label: 'Globe Control Valve' },
                { sym: '⊡',   label: 'Stirred Tank Reactor' },
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
