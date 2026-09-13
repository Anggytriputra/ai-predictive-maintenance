import { AlertTriangle, Zap, Activity, Gauge, PowerOff, CheckCircle2, ShieldCheck, ThermometerSun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SensorData {
  motorId: string;
  timestamp: string;
  running?: boolean;
  rpm?: number;
  temperature: number;
  vibration: number;
  bearingHealth?: number;
  phase?: string;
  currentR: number;
  currentS: number;
  currentT: number;
  currentN: number;
  voltageR: number;
  voltageS: number;
  voltageT: number;
}

interface MotorAnalyticsProps {
  selectedMotor: string | null;
  history: SensorData[];
}

export function MotorAnalytics({ selectedMotor, history }: MotorAnalyticsProps) {
  if (!selectedMotor) {
    return (
      <div className="h-full min-h-[500px] rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-gray-500">
        <Activity className="w-16 h-16 text-gray-700 mb-4" />
        <p>Pilih motor di sebelah kiri untuk melihat detail analitik</p>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const isRunning = latest ? latest.running !== false : true;
  const displayRpm = isRunning ? Math.round(latest?.rpm ?? 1485) : 0;
  const displayVib = isRunning ? (latest?.vibration ?? 0) : 0.0;

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl h-full min-h-[500px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-100">Analytics: {selectedMotor}</h2>
            {isRunning ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> RUNNING ({displayRpm.toLocaleString()} RPM)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
                <PowerOff className="w-3.5 h-3.5" /> STOPPED (0 RPM)
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-1">Real-time telemetry & AI predictions</p>
        </div>
        
        {isRunning && latest && latest.temperature > 85 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4" /> AI Alert: Prediksi Kegagalan Mesin dalam 48 Jam
          </div>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Speed (RPM)
          </div>
          <div className={`font-mono text-xl font-bold ${isRunning ? 'text-cyan-300' : 'text-zinc-500'}`}>
            {displayRpm.toLocaleString()} <span className="text-xs font-normal text-gray-500">rpm</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
            <ThermometerSun className="w-3.5 h-3.5 text-rose-400" /> Temperature
          </div>
          <div className="font-mono text-xl font-bold text-gray-200">
            {latest?.temperature ?? '--'} <span className="text-xs font-normal text-gray-500">°C</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" /> Vibration
          </div>
          <div className={`font-mono text-xl font-bold ${isRunning ? 'text-purple-300' : 'text-zinc-500'}`}>
            {displayVib.toFixed(2)} <span className="text-xs font-normal text-gray-500">mm/s</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Bearing Health
          </div>
          <div className="font-mono text-xl font-bold text-emerald-400">
            {latest?.bearingHealth ?? 100} <span className="text-xs font-normal text-gray-500">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Temperature Chart */}
        <div className="h-[250px] w-full">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <ThermometerSun className="w-4 h-4 text-rose-400" /> Temperature Over Time (°C)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="timestamp" tick={false} stroke="#ffffff30" />
              <YAxis domain={['auto', 'auto']} stroke="#ffffff30" tick={{fill: '#ffffff60'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#f43f5e" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vibration Chart */}
        <div className="h-[250px] w-full">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" /> Vibration Over Time (mm/s)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="timestamp" tick={false} stroke="#ffffff30" />
              <YAxis domain={['auto', 'auto']} stroke="#ffffff30" tick={{fill: '#ffffff60'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="vibration" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3-Phase Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400"/> Current (Amperage)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase R</div>
                <div className="font-mono text-lg text-emerald-400">{isRunning ? (latest?.currentR?.toFixed(2) || '0.00') : '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase S</div>
                <div className="font-mono text-lg text-emerald-400">{isRunning ? (latest?.currentS?.toFixed(2) || '0.00') : '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase T</div>
                <div className="font-mono text-lg text-emerald-400">{isRunning ? (latest?.currentT?.toFixed(2) || '0.00') : '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Neutral N</div>
                <div className="font-mono text-lg text-gray-400">{isRunning ? (latest?.currentN?.toFixed(2) || '0.00') : '0.00'} A</div>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400"/> Line Voltage
            </h3>
            <div className="grid grid-cols-2 gap-3 h-[calc(100%-2.5rem)]">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase R</div>
                <div className="font-mono text-lg text-indigo-400">{latest?.voltageR?.toFixed(0) || '0'} V</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase S</div>
                <div className="font-mono text-lg text-indigo-400">{latest?.voltageS?.toFixed(0) || '0'} V</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase T</div>
                <div className="font-mono text-lg text-indigo-400">{latest?.voltageT?.toFixed(0) || '0'} V</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 flex items-center justify-center opacity-50">
                <div className="text-xs text-gray-500 text-center">3-Phase<br/>Industrial Grid</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
