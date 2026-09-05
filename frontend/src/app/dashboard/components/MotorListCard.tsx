import { ThermometerSun, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MotorSymbol } from '@/components/MotorSymbol';

interface SensorData {
  motorId: string;
  timestamp: string;
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

  const getStatusColor = (temp: number) => {
    if (temp > 85) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (temp > 75) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  const getStatusIcon = (temp: number) => {
    if (temp > 85) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
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
          <div className="flex items-center justify-center w-12 h-9">
            <MotorSymbol stroke="#818cf8" fill="#0d1117" />
          </div>
          <div>
            <h3 className="font-bold text-gray-100">{id}</h3>
            <p className="text-xs text-gray-500 mt-1">Real-time update</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getStatusColor(latest.temperature)}`}>
          {getStatusIcon(latest.temperature)}
          {latest.temperature > 85 ? 'CRITICAL' : latest.temperature > 75 ? 'WARNING' : 'HEALTHY'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><ThermometerSun className="w-3 h-3"/> Temp</div>
          <div className="font-mono text-lg text-gray-200">{latest.temperature}°C</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Vibration</div>
          <div className="font-mono text-lg text-gray-200">{latest.vibration} mm/s</div>
        </div>
      </div>
    </button>
  );
}
