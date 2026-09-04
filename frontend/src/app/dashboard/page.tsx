'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';
import { Activity, Zap, ThermometerSun, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
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

const SOCKET_URL = 'http://localhost:3000';

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [motors, setMotors] = useState<Record<string, SensorData[]>>({});
  const [selectedMotor, setSelectedMotor] = useState<string | null>(null);
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    
    newSocket.on('sensor_overview', (data: SensorData) => {
      setMotors(prev => {
        const history = prev[data.motorId] || [];
        // Simpan 20 data terakhir agar grafik tidak terlalu panjang & berat
        const updatedHistory = [...history, data].slice(-20);
        return { ...prev, [data.motorId]: updatedHistory };
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

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
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6 font-sans selection:bg-indigo-500/30">
      <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            AI Predictive Maintenance
          </h1>
          <p className="text-gray-400 mt-1">Real-time Industrial Motor Monitoring System</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/scada"
            className="flex items-center gap-2 text-sm text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-xl transition-all duration-200">
            <Activity className="w-4 h-4" />
            SCADA View
          </Link>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm text-gray-400 font-medium">Live Connection</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar / Motor List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" /> Active Motors
          </h2>
          
          {Object.keys(motors).length === 0 && (
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-center text-gray-500 animate-pulse">
              Menunggu data sensor dari backend...
            </div>
          )}

          {Object.entries(motors).map(([id, history]) => {
            const latest = history[history.length - 1];
            const isSelected = selectedMotor === id;
            
            return (
              <button
                key={id}
                onClick={() => setSelectedMotor(id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  isSelected 
                    ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Settings className="w-5 h-5 text-indigo-400" />
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
          })}
        </div>

        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          {selectedMotor ? (
            <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Analytics: {selectedMotor}</h2>
                  <p className="text-gray-400 mt-1">Real-time telemetry & AI predictions</p>
                </div>
                
                {motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.temperature > 85 && (
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
                    <LineChart data={motors[selectedMotor]}>
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
                    <LineChart data={motors[selectedMotor]}>
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
                        <div className="font-mono text-lg text-emerald-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.currentR?.toFixed(2) || '0.00'} A</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Phase S</div>
                        <div className="font-mono text-lg text-emerald-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.currentS?.toFixed(2) || '0.00'} A</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Phase T</div>
                        <div className="font-mono text-lg text-emerald-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.currentT?.toFixed(2) || '0.00'} A</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Neutral N</div>
                        <div className="font-mono text-lg text-gray-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.currentN?.toFixed(2) || '0.00'} A</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400"/> Voltage</h3>
                    <div className="grid grid-cols-2 gap-3 h-[calc(100%-2.5rem)]">
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Phase R</div>
                        <div className="font-mono text-lg text-indigo-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.voltageR?.toFixed(0) || '0'} V</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Phase S</div>
                        <div className="font-mono text-lg text-indigo-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.voltageS?.toFixed(0) || '0'} V</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Phase T</div>
                        <div className="font-mono text-lg text-indigo-400">{motors[selectedMotor]?.[motors[selectedMotor].length - 1]?.voltageT?.toFixed(0) || '0'} V</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 flex items-center justify-center opacity-50">
                        <div className="text-xs text-gray-500 text-center">3-Phase<br/>System</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-gray-500">
              <Activity className="w-16 h-16 text-gray-700 mb-4" />
              <p>Pilih motor di sebelah kiri untuk melihat detail analitik</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
