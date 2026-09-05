'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Zap } from 'lucide-react';
import { MotorListCard } from './components/MotorListCard';
import { MotorAnalytics } from './components/MotorAnalytics';

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

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

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

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6 font-sans selection:bg-indigo-500/30">
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

          {Object.entries(motors).map(([id, history]) => (
            <MotorListCard
              key={id}
              id={id}
              history={history}
              isSelected={selectedMotor === id}
              onClick={() => setSelectedMotor(id)}
            />
          ))}
        </div>

        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <MotorAnalytics 
            selectedMotor={selectedMotor}
            history={selectedMotor ? (motors[selectedMotor] || []) : []}
          />
        </div>
      </div>
    </div>
  );
}
