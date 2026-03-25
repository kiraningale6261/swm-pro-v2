'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Navigation, Camera, Zap, Layers, Loader2, Activity, Truck as TruckIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const MapController = dynamic(() => import('./MapController'), { ssr: false });

export default function MasterDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [photoToggle, setPhotoToggle] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6780, 74.5564]);
  const [loading, setLoading] = useState(false);

  // Stats Logic
  const [realStats, setRealStats] = useState({ coverage: 0, activeFleet: 0, pointsCount: 0, trips: 0 });

  useEffect(() => {
    const loadData = async () => {
      // 1. Vehicles & Workers
      const { data: v } = await supabase.from('vehicles').select('*, staff(name)');
      setVehicles(v || []);
      const { data: s } = await supabase.from('staff').select('*');
      setWorkers(s || []);

      // 2. QR Points (Red/Green Logic)
      const { data: qr } = await supabase.from('qr_codes').select('*');
      setQrPoints(qr || []);

      // 3. Stats Calculation
      const collected = qr?.filter(p => {
        if (!p.last_scanned_at) return false;
        const diff = (new Date().getTime() - new Date(p.last_scanned_at).getTime()) / (1000 * 60 * 60);
        return diff <= 12; // Within 12 hours = Green
      }).length || 0;

      setRealStats({
        coverage: qr?.length ? Math.round((collected / qr.length) * 100) : 0,
        activeFleet: v?.length || 0,
        pointsCount: qr?.length || 0,
        trips: v?.reduce((acc, curr) => acc + (curr.trip_count || 0), 0) || 0
      });
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        toast.success(`${searchQuery} located!`);
      }
    } catch (e) { toast.error("Search failed"); }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col relative h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* 1. Working Search Bar [Match: WeVois Layout] */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-white/90 backdrop-blur-3xl p-3 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex items-center gap-4">
        <div className="flex-1 px-8 flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-300" />
          <input 
            placeholder="Search City, Ward or Village..." 
            className="w-full bg-transparent font-bold outline-none text-slate-700 text-lg placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="bg-slate-900 text-white p-5 rounded-full shadow-lg active:scale-95">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
        </button>
      </div>

      {/* 2. Full Screen Map */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false}>
          {/* Using de-saturated map style like WeVois */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} />
          
          {/* Live Trucks & Trails */}
          {vehicles.map((v) => v.last_lat && (
            <React.Fragment key={v.id}>
              <Marker position={[v.last_lat, v.last_lng]}>
                <Tooltip permanent direction="top" className="!bg-slate-900 !text-white !px-4 !py-2 !rounded-2xl !font-black !text-[10px] !border-none !shadow-2xl">
                  🚚 {v.vehicle_number} | {v.staff?.name || 'Driver'}
                </Tooltip>
              </Marker>
              {v.trail_coords && <Polyline positions={v.trail_coords} color="#0ea5e9" weight={4} opacity={0.4} />}
            </React.Fragment>
          ))}

          {/* QR Collection Points (Red/Green Logic) */}
          {qrPoints.map((qr) => (
            <Marker key={qr.id} position={[qr.location.coordinates[1], qr.location.coordinates[0]]}>
               <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none p-0">
                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-lg ${
                    (new Date().getTime() - new Date(qr.last_scanned_at).getTime()) / (1000 * 60 * 60) <= 12 
                    ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                  }`} />
               </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3. Floating Action Sidebar [Match: dashboard issue 121.png] */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-6">
        <div className="bg-white/85 backdrop-blur-3xl p-7 rounded-[4rem] shadow-2xl border border-white flex flex-col items-center gap-5">
          <Camera className={`w-7 h-7 transition-all ${photoToggle ? 'text-sky-500' : 'text-slate-300'}`} />
          <div onClick={() => setPhotoToggle(!photoToggle)} className={`w-14 h-7 rounded-full p-1.5 cursor-pointer transition-all ${photoToggle ? 'bg-sky-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${photoToggle ? 'translate-x-7' : 'translate-x-0'}`} />
          </div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Photo Mod</p>
        </div>
        <button className="bg-white p-6 rounded-full shadow-xl hover:bg-slate-50 transition-all text-slate-700"><Layers className="w-6 h-6" /></button>
        <button className="bg-slate-900 p-6 rounded-full shadow-2xl text-amber-400 active:scale-90 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"><Zap className="w-6 h-6" /></button>
      </div>

      {/* 4. The Performance Deck [Match: 1.jpg Stats Bar] */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-[94%] max-w-6xl">
        <div className="bg-white/85 backdrop-blur-3xl rounded-[4.5rem] p-12 shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white flex justify-between items-center text-center">
          <div className="flex-1 border-r border-slate-100 px-6">
             <div className="flex justify-center items-center gap-2 mb-2"><Activity className="w-4 h-4 text-emerald-500" /><p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Coverage</p></div>
             <h3 className="text-5xl font-black italic text-emerald-500 tracking-tighter">{realStats.coverage}%</h3>
          </div>
          <div className="flex-1 border-r border-slate-100 px-6">
             <div className="flex justify-center items-center gap-2 mb-2"><TruckIcon className="w-4 h-4 text-sky-500" /><p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Fleet Active</p></div>
             <h3 className="text-5xl font-black italic text-slate-800 tracking-tighter">{realStats.activeFleet}</h3>
          </div>
          <div className="flex-1 px-6">
             <div className="flex justify-center items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-amber-500" /><p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Total Trips</p></div>
             <h3 className="text-5xl font-black italic text-sky-500 tracking-tighter">{realStats.trips}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
