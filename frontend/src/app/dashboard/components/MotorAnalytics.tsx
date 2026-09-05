import { AlertTriangle, Zap, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl h-full min-h-[500px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Analytics: {selectedMotor}</h2>
          <p className="text-gray-400 mt-1">Real-time telemetry & AI predictions</p>
        </div>
        
        {latest?.temperature > 85 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4" /> AI Alert: Prediksi Kegagalan Mesin dalam 48 Jam
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Temperature Chart */}
        <div className="h-[250px] w-full">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Temperature Over Time (°C)</h3>
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
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Vibration Over Time (mm/s)</h3>
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
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-400"/> Current (Amperage)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase R</div>
                <div className="font-mono text-lg text-emerald-400">{latest?.currentR?.toFixed(2) || '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase S</div>
                <div className="font-mono text-lg text-emerald-400">{latest?.currentS?.toFixed(2) || '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Phase T</div>
                <div className="font-mono text-lg text-emerald-400">{latest?.currentT?.toFixed(2) || '0.00'} A</div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Neutral N</div>
                <div className="font-mono text-lg text-gray-400">{latest?.currentN?.toFixed(2) || '0.00'} A</div>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400"/> Voltage</h3>
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
                <div className="text-xs text-gray-500 text-center">3-Phase<br/>System</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
