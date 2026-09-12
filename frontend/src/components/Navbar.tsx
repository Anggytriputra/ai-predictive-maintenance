'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, Cpu, Radio } from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

type DataSource = 'simulator' | 'opcua' | 'loading';

export function Navbar() {
  const pathname = usePathname();
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  // Fetch data source mode from backend health check
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/`);
        const json = await res.json();
        setDataSource(json.data_source === 'opcua' ? 'opcua' : 'simulator');
      } catch {
        setDataSource('simulator');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    { id: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: '/scada', label: 'SCADA View', icon: Activity },
  ];

  return (
    <header className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0A0A0B] text-white">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          AI Predictive Maintenance
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Real-time Industrial Motor Monitoring System</p>
      </div>

      <div className="flex items-center gap-4">

        {/* Data Source Badge */}
        {dataSource !== 'loading' && (
          <div
            className={[
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold tracking-wide",
              dataSource === 'opcua'
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-violet-500/10 border-violet-500/30 text-violet-300"
            ].join(' ')}
            title={
              dataSource === 'opcua'
                ? "Connected via OPC-UA protocol (industrial standard)"
                : "Physics-based IoT simulation (offline mode)"
            }
          >
            {dataSource === 'opcua'
              ? <><Radio className="w-3.5 h-3.5" /> OPC-UA LIVE</>
              : <><Cpu className="w-3.5 h-3.5" /> SIMULATOR</>
            }
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1.5 shadow-inner">
          {TABS.map((tab) => {
            const isActive = pathname === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.id}
                className={[
                  "relative flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                  isActive
                    ? "text-white bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm text-gray-400 font-medium">Live</span>
        </div>
      </div>
    </header>
  );
}
