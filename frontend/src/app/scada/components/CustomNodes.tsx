import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MotorSymbol } from '../../../components/MotorSymbol';
import { PumpSymbol } from './PumpSymbol';
import { ValveSymbol } from './ValveSymbol';
import { TankSymbol } from './TankSymbol';

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export interface SensorData {
  motorId: string;
  temperature: number;
  vibration: number;
  currentR: number;
  running: boolean;
}

export function getStatus(temp: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
  if (temp > 85) return 'CRITICAL';
  if (temp > 75) return 'WARNING';
  return 'HEALTHY';
}

export const STATUS_STYLE = {
  HEALTHY: { stroke: '#10b981', glow: '#10b98150', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  WARNING: { stroke: '#f59e0b', glow: '#f59e0b50', text: 'text-yellow-400', badge: 'bg-yellow-500/20  text-yellow-300  border-yellow-500/40' },
  CRITICAL: { stroke: '#ef4444', glow: '#ef444450', text: 'text-red-400', badge: 'bg-red-500/20     text-red-300     border-red-500/40' },
};

export async function sendMotorCommand(motorId: string, action: 'start' | 'stop') {
  await fetch(`${SOCKET_URL}/api/control/motors/${motorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

export function MotorNode({ data }: { data: { label: string; sensorData?: SensorData } }) {
  const sensor = data.sensorData;
  const running = sensor?.running !== false;
  const status = sensor ? getStatus(sensor.temperature) : 'HEALTHY';
  const displayStatus = !running ? 'STOPPED' : status;
  const st = running ? STATUS_STYLE[status] : { stroke: '#6b7280', glow: '#6b728040', text: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-300 border-gray-500/40' };

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
      <Handle type="source" position={Position.Right} id="out" style={{ top: '35%', right: -8, width: 12, height: 12, background: st.stroke, border: `2px solid ${st.stroke}cc` }} />
      <Handle type="target" position={Position.Left} id="in" style={{ top: '35%', left: -8, width: 12, height: 12, background: st.stroke, border: `2px solid ${st.stroke}cc` }} />
      <div className="w-28 h-20" style={{ opacity: running ? 1 : 0.45, transition: 'opacity 0.5s' }}>
        <MotorSymbol stroke={st.stroke} fill="#0d1117" />
      </div>
      <div className="mt-1 text-center"><span className={`text-xs font-bold font-mono ${st.text}`}>{data.label}</span></div>
      <div className="mt-2 flex flex-col gap-1.5 w-36 mx-auto">
        <div className="flex items-center justify-between rounded-lg border px-2.5 py-1" style={{ borderColor: st.stroke + '50', background: st.stroke + '15' }}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${running ? 'animate-pulse' : ''}`} style={{ background: st.stroke }} />
            <span className="text-[10px] font-bold font-mono" style={{ color: st.stroke }}>{displayStatus}</span>
          </div>
          {sensor && running && <span className="text-[9px] text-gray-500 font-mono">{sensor.temperature.toFixed(0)}°C</span>}
        </div>
        {confirming === 'stop' && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-center">
            <p className="text-[10px] text-red-300 mb-1.5 font-semibold">⚠ Stop {data.label}?</p>
            <div className="flex gap-1.5">
              <button onClick={() => handleCommand('stop')} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold py-1 rounded-md transition-colors disabled:opacity-50">{loading ? '...' : 'CONFIRM'}</button>
              <button onClick={() => setConfirming(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold py-1 rounded-md transition-colors">CANCEL</button>
            </div>
          </div>
        )}
        {confirming === 'start' && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-center">
            <p className="text-[10px] text-emerald-300 mb-1.5 font-semibold">▶ Start {data.label}?</p>
            <div className="flex gap-1.5">
              <button onClick={() => handleCommand('start')} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 rounded-md transition-colors disabled:opacity-50">{loading ? '...' : 'CONFIRM'}</button>
              <button onClick={() => setConfirming(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold py-1 rounded-md transition-colors">CANCEL</button>
            </div>
          </div>
        )}
        {!confirming && (
          <div className="flex gap-1.5">
            <button onClick={() => setConfirming('start')} disabled={running || loading} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-emerald-600/20 enabled:border-emerald-500/40 enabled:text-emerald-300 enabled:hover:bg-emerald-600 enabled:hover:text-white enabled:hover:border-emerald-500"><span className="text-[10px]">▶</span> START</button>
            <button onClick={() => setConfirming('stop')} disabled={!running || loading} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-red-600/20 enabled:border-red-500/40 enabled:text-red-300 enabled:hover:bg-red-600 enabled:hover:text-white enabled:hover:border-red-500"><span className="text-[10px]">■</span> STOP</button>
          </div>
        )}
      </div>
      {sensor && running && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 top-full w-40 z-10 rounded-xl border bg-[#0d1117]/95 p-2.5 backdrop-blur shadow-2xl" style={{ borderColor: st.stroke + '50' }}>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]"><span className="text-gray-500">🌡 Temp</span><span className="font-mono font-bold text-rose-400">{sensor.temperature.toFixed(1)}°C</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-gray-500">〰 Vibr.</span><span className="font-mono font-bold text-violet-400">{sensor.vibration.toFixed(2)} mm/s</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-gray-500">⚡ I (R)</span><span className="font-mono font-bold text-cyan-400">{sensor.currentR.toFixed(2)} A</span></div>
          </div>
        </div>
      )}
      {sensor && !running && <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 text-[10px] text-gray-600 whitespace-nowrap font-mono">Motor offline — 28~35°C ambient</div>}
    </div>
  );
}

export function PumpNode({ data }: { data: { label: string; running?: boolean } }) {
  const running = data.running !== false;
  const stroke = running ? '#06b6d4' : '#6b7280';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: `drop-shadow(0 0 8px ${running ? '#06b6d440' : 'transparent'})` }}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: '40%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '40%', right: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <div className="w-20 h-16"><PumpSymbol stroke={stroke} running={running} /></div>
      <span className="text-[10px] font-bold font-mono mt-0.5" style={{ color: stroke }}>{data.label}</span>
      <span className="text-[9px] text-gray-600">{running ? '▶ Running' : '■ Stopped'}</span>
    </div>
  );
}

export function ValveNode({ data }: { data: { label: string; open?: boolean } }) {
  const isOpen = data.open !== false;
  const stroke = isOpen ? '#f59e0b' : '#6b7280';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: `drop-shadow(0 0 8px ${isOpen ? '#f59e0b40' : 'transparent'})` }}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: '58%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '58%', right: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <div className="w-14 h-20"><ValveSymbol stroke={stroke} isOpen={isOpen} /></div>
      <span className="text-[10px] font-bold font-mono -mt-1" style={{ color: stroke }}>{data.label}</span>
    </div>
  );
}

export function ReactorNode({ data }: { data: { label: string; pressure?: number; level?: number } }) {
  const pressure = data.pressure ?? 2.4;
  const level = data.level ?? 68;
  const stroke = '#a855f7';
  return (
    <div className="relative flex flex-col items-center" style={{ filter: 'drop-shadow(0 0 16px #a855f740)' }}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: '22%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <Handle type="target" position={Position.Left} id="in2" style={{ top: '55%', left: -6, width: 10, height: 10, background: stroke, border: `2px solid ${stroke}cc` }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '80%', right: -6, width: 10, height: 10, background: '#f97316', border: '2px solid #f97316cc' }} />
      <div className="w-24 h-48"><TankSymbol stroke={stroke} level={level} /></div>
      <div className="w-36 rounded-xl border bg-[#0d1117]/95 px-3 py-2 backdrop-blur shadow-2xl mt-1" style={{ borderColor: stroke + '50' }}>
        <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest mb-1.5">{data.label}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]"><span className="text-gray-500">⊙ Pressure</span><span className="font-mono font-bold text-purple-400">{pressure.toFixed(1)} bar</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-gray-500">▨ Level</span><span className="font-mono font-bold text-fuchsia-400">{level}%</span></div>
        </div>
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full transition-all duration-1000" style={{ width: `${level}%` }} />
        </div>
      </div>
    </div>
  );
}
