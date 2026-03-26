'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Navigation, Layers, Camera, Zap, Truck, Users, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Leaflet Components
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export default function LiveWarRoom() {
  const [L, setL] = useState<any>(null);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [liveWorkers, setLiveWorkers] = useState<any[]>([]);
  const [stats, setStats] = useState({ coverage: '0%', fleet: 0, charges: '240K' });

  useEffect(() => {
    import('leaflet').then((leaflet) => setL(leaflet));
    fetchLiveData();
    
    // Real-time Subscription for Worker Locations
    const channel = supabase.channel('live-tracking')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'worker_locations' }, 
      payload => {
        fetchLiveData(); // Refresh markers on new location update
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLiveData = async () => {
    // 1. Fetch Fixed QR Points
    const { data: qrs } = await supabase.from('qr_codes').select('*');
    if (qrs) setQrPoints(qrs);

    // 2. Fetch Active Workers/Vehicles
    const { data: workers } = await supabase.from('staff').select('*, worker_locations(lat, lng)').eq('status', 'active');
    if (workers) setLiveWorkers(workers);
  };

  // Custom Icons for WeVois Feel
  const getIcon = (type: 'QR' | 'TRUCK' | 'WORKER') => {
    if (!L) return null;
    let color = type === 'QR' ? '#94a3b8' : type === 'TRUCK' ? '#f59e0b' : '#10b981';
    return L.divIcon({
      className: 'custom-live-icon',
      html: `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px ${color}"></div>`,
      iconSize: [12, 12]
    });
  };

  return (
    <div className="h-screen w-full relative bg-[#0B0F1A] overflow-hidden">
      
      {/* 1. Full Screen Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={[16.6780, 74.5564]} zoom={15} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          
          {/* Render QR Points */}
          {qrPoints.map(qr => (
            <Marker key={qr.id} position={[qr.lat, qr.lng]} icon={getIcon('QR')}>
              <Popup className="wevois-popup">QR ID: {qr.qr_id}</Popup>
            </Marker>
          ))}

          {/* Render Live Workers/Vehicles */}
          {liveWorkers.map(worker => (
            <Marker key={worker.id} position={[worker.lat, worker.lng]} icon={getIcon(worker.role === 'Driver' ? 'TRUCK' : 'WORKER')}>
              <Popup>Worker: {worker.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 2. Top Search Bar (Match: live room issue.png) */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-6">
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-2xl flex items-center gap-4 border border-white/20">
          <div className="pl-6"><Search className="text-slate-400 w-5 h-5" /></div>
          <input placeholder="Search Ward, Vehicle or Staff..." className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700" />
          <button className="bg-slate-900 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-all">
            <Navigation className="w-5 h-5 rotate-45" />
          </button>
        </div>
      </div>

      {/* 3. Right Floating Controls */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-6">
        <button className="bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-2 group transition-all hover:bg-slate-900">
           <Camera className="w-6 h-6 text-slate-400 group-hover:text-white" />
           <span className="text-[8px] font-black uppercase text-slate-300">Photo Mod</span>
        </button>
        <button className="bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-2 group transition-all hover:bg-slate-900">
           <Layers className="w-6 h-6 text-slate-400 group-hover:text-white" />
           <span className="text-[8px] font-black uppercase text-slate-300">Layers</span>
        </button>
      </div>

      {/* 4. Bottom Stats Dashboard (Match: live room issue.png) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-6">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[4rem] p-10 shadow-2xl flex justify-around items-center border border-white/40">
           <div className="flex items-center gap-6">
              <div className="bg-emerald-50 p-4 rounded-3xl"><Zap className="text-emerald-500 w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coverage</p>
                <h3 className="text-4xl font-black italic text-emerald-500">{stats.coverage}</h3>
              </div>
           </div>

           <div className="w-[2px] h-16 bg-slate-100"></div>

           <div className="flex items-center gap-6">
              <div className="bg-sky-50 p-4 rounded-3xl"><Truck className="text-sky-500 w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fleet Status</p>
                <h3 className="text-4xl font-black italic text-slate-900">{liveWorkers.length}</h3>
              </div>
           </div>

           <div className="w-[2px] h-16 bg-slate-100"></div>

           <div className="flex items-center gap-6">
              <div className="bg-orange-50 p-4 rounded-3xl"><Users className="text-orange-500 w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">User Charges</p>
                <h3 className="text-4xl font-black italic text-sky-500">{stats.charges}</h3>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}
