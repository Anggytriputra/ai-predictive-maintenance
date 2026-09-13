import { ThermometerSun, Activity, AlertTriangle, CheckCircle2, Gauge, PowerOff } from 'lucide-react';
import { MotorSymbol } from '@/components/MotorSymbol';

interface SensorData {
  motorId: string;
  timestamp: string;
  running?: boolean;
  rpm?: number;
  temperature: number;
  vibration: number;
  currentR: number;
  currentS: number;
  currentT: number;
  currentN: number;
  voltageR: number;
  voltageS: number;
  voltageT: number;
}

interface MotorListCardProps {
  id: string;
  history: SensorData[];
  isSelected: boolean;
  onClick: () => void;
}

export function MotorListCard({ id, history, isSelected, onClick }: MotorListCardProps) {
  const latest = history[history.length - 1];
  
  if (!latest) return null;

  const isRunning = latest.running !== false;
  const displayRpm = isRunning ? Math.round(latest.rpm ?? 1485) : 0;
  const displayVib = isRunning ? latest.vibration : 0.0;

  const getStatusColor = () => {
    if (!isRunning) return 'text-zinc-400 bg-zinc-800/80 border-zinc-700/80';
    if (latest.temperature > 85) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (latest.temperature > 75) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  const getStatusIcon = () => {
    if (!isRunning) return <PowerOff className="w-3.5 h-3.5 text-zinc-400" />;
    if (latest.temperature > 85) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  };

  const getStatusText = () => {
    if (!isRunning) return 'STOPPED';
    if (latest.temperature > 85) return 'CRITICAL';
    if (latest.temperature > 75) return 'WARNING';
    return 'HEALTHY';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
        isSelected 
          ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-9" style={{ opacity: isRunning ? 1 : 0.4 }}>
            <MotorSymbol stroke={isRunning ? "#818cf8" : "#64748b"} fill="#0d1117" />
          </div>
          <div>
            <h3 className="font-bold text-gray-100">{id}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {isRunning ? 'Real-time telemetry' : 'Motor Stopped (Standby)'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getStatusColor()}`}>
          {getStatusIcon()}
          {getStatusText()}
        </div>
      </div>
      
      {/* 3 Metrics: RPM, Temp, Vibration */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-gray-500 text-[11px] mb-1 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400"/> RPM
          </div>
          <div className={`font-mono text-base font-semibold ${isRunning ? 'text-cyan-300' : 'text-zinc-500'}`}>
            {displayRpm.toLocaleString()}
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-gray-500 text-[11px] mb-1 flex items-center gap-1">
            <ThermometerSun className="w-3 h-3 text-rose-400"/> Temp
          </div>
          <div className="font-mono text-base font-semibold text-gray-200">
            {latest.temperature}°C
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-gray-500 text-[11px] mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400"/> Vib
          </div>
          <div className={`font-mono text-base font-semibold ${isRunning ? 'text-gray-200' : 'text-zinc-500'}`}>
            {displayVib.toFixed(2)}
          </div>
        </div>
      </div>
    </button>
  );
}
