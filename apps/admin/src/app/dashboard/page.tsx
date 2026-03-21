'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Truck, User as UserIcon, Map as MapIcon, Zap, QrCode, Activity, ShieldAlert } from 'lucide-react';

// --- Map Components (SSR Safe) ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

export default function SmartCityDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalWards: 10, collected: 0, pending: 10 });

  // --- Real-time Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Vehicles (Trucks)
      const { data: vData } = await supabase.from('vehicles').select('*');
      setVehicles(vData || []);

      // 2. Fetch Workers
      const { data: sData } = await supabase.from('staff').select('*').eq('role', 'DRIVER');
      setWorkers(sData || []);
    };

    fetchData();
    // Real-time updates ke liye channel setup kiya ja sakta hai
  }, []);

  return (
    <div className="space-y-6 p-2 animate-in fade-in duration-1000">
      {/* --- Top Stats Panel (iPhone White Style) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <Activity className="text-sky-500 mb-2 w-5 h-5" />
          <span className="text-[10px] font-black uppercase text-slate-400">Live Vehicles</span>
          <h2 className="text-2xl font-black italic">{vehicles.length}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <UserIcon className="text-emerald-500 mb-2 w-5 h-5" />
          <span className="text-[10px] font-black uppercase text-slate-400">Active Staff</span>
          <h2 className="text-2xl font-black italic">{workers.length}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <QrCode className="text-amber-500 mb-2 w-5 h-5" />
          <span className="text-[10px] font-black uppercase text-slate-400">Total Points</span>
          <h2 className="text-2xl font-black italic">1,240</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <ShieldAlert className="text-rose-500 mb-2 w-5 h-5" />
          <span className="text-[10px] font-black uppercase text-slate-400">Alerts</span>
          <h2 className="text-2xl font-black italic">02</h2>
        </div>
      </div>

      {/* --- Main Master Map --- */}
      <div className="relative h-[600px] w-full rounded-[4rem] overflow-hidden border-[12px] border-white shadow-2xl z-0">
        <MapContainer center={[16.6912, 74.4962]} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* --- Render Live Trucks --- */}
          {vehicles.map((v) => (
            <Marker key={v.id} position={[16.6912 + (Math.random() * 0.01), 74.4962 + (Math.random() * 0.01)]}>
              <Tooltip permanent direction="top" className="bg-slate-900 text-white border-none rounded-lg px-3 py-1 font-bold text-[10px]">
                🚚 {v.vehicle_number}
              </Tooltip>
            </Marker>
          ))}

          {/* --- Render Live Workers --- */}
          {workers.map((w) => (
            <Marker key={w.id} position={[16.6912 - (Math.random() * 0.01), 74.4962 - (Math.random() * 0.01)]}>
              <Tooltip permanent direction="bottom" className="bg-sky-500 text-white border-none rounded-lg px-3 py-1 font-bold text-[10px]">
                👤 {w.name}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Map Controls */}
        <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-2">
           <button className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl hover:bg-white"><MapIcon className="w-5 h-5 text-slate-800" /></button>
           <button className="bg-slate-900 p-4 rounded-3xl shadow-xl text-white"><Zap className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
