'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Navigation, Camera, Zap, Layers, Loader2, Activity, Truck as TruckIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';

// SSR Safe Leaflet Imports
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

// Internal Map Controller - WeVois Style Snappy Movement
function WeVoisMapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16, { animate: true }); // WeVois often snaps faster, so using setView over flyTo
  }, [center, map]);
  return null;
}

export default function WeVoisDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6780, 74.5564]); // Shirol Base
  const [loading, setLoading] = useState(false);
  const [photoToggle, setPhotoToggle] = useState(false);
  const [fleet, setFleet] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);

  // Real-time Data Sync
  useEffect(() => {
    const syncData = async () => {
      const { data: v } = await supabase.from('vehicles').select('*, staff(name)');
      setFleet(v || []);
      const { data: q } = await supabase.from('qr_codes').select('*');
      setPoints(q || []);
    };
    syncData();
    const interval = setInterval(syncData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data?.[0]) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        toast.success(`Positioned to ${searchQuery}`);
      }
    } catch (e) { toast.error("Search failed"); }
    setLoading(false);
  };

  return (
    <div className="relative h-screen w-full bg-[#F8FAFC] overflow-hidden flex flex-col font-sans">
      
      {/* 1. TOP: WeVois Solid Search Hub [Match: 1.jpg] */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-2xl px-4">
        <div className="wevois-panel rounded-[4rem] p-3 flex items-center gap-4">
          <div className="flex-1 flex items-center gap-4 px-8 border-r border-slate-100">
            <Search className="w-6 h-6 text-slate-300" />
            <input 
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full text-lg placeholder:text-slate-300" 
              placeholder="Search ward, vehicle ID, or worker..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="bg-slate-900 text-white p-6 rounded-full shadow-2xl active:scale-95 transition-all">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 2. CENTER: War Map (Less Vivid Colors for Contrast) [Match: image 3] */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={mapCenter} zoom={15} zoomControl={false} className="h-full w-full">
          {/* Using Cartesian style map for strict data focus */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
          <WeVoisMapController center={mapCenter} />

          {/* IoT Collection Points (Red/Green logic from Phase 3) */}
          {points.map(p => (
            <Marker key={p.id} position={[p.location.coordinates[1], p.location.coordinates[0]]}>
              <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none">
                <div className={`w-4 h-4 rounded-full border-4 border-white shadow-xl ${
                  p.last_scanned_at && (new Date().getTime() - new Date(p.last_scanned_at).getTime()) < 43200000 
                  ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                }`} />
              </Tooltip>
            </Marker>
          ))}

          {/* Moving Assets */}
          {fleet.map(v => v.last_lat && (
            <Marker key={v.id} position={[v.last_lat, v.last_lng]}>
              <Tooltip permanent direction="top" className="leaflet-tooltip-wevois">
                🚚 {v.vehicle_number} | {v.staff?.name || 'Driver'}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3. RIGHT: Floating Action Sidebar (Solid White) [Match: dashboard issue 121.png] */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-6">
        <div className="wevois-panel p-8 rounded-[4.5rem] flex flex-col items-center gap-5">
          <Camera className={`w-8 h-8 transition-all ${photoToggle ? 'text-sky-500' : 'text-slate-300'}`} />
          <div onClick={() => setPhotoToggle(!photoToggle)} className={`w-16 h-8 rounded-full p-1.5 cursor-pointer transition-all ${photoToggle ? 'bg-sky-500' : 'bg-slate-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all ${photoToggle ? 'translate-x-8' : 'translate-x-0'}`} />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Photo Mod</p>
        </div>
        <button className="wevois-panel p-8 rounded-full text-slate-700 hover:bg-slate-50 transition-all shadow-xl"><Layers className="w-8 h-8" /></button>
        <button className="bg-slate-900 p-8 rounded-full shadow-2xl text-amber-400 active:scale-90 transition-all">
          <Zap className="w-8 h-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
        </button>
      </div>

      {/* 4. BOTTOM: Performance Deck (Strict Solid White) [Match: 1.jpg] */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-[94%] max-w-6xl">
        <div className="wevois-panel rounded-[5rem] p-12 flex justify-around items-center text-center">
          <div className="flex-1 border-r border-slate-100 px-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-emerald-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">Coverage</p>
            </div>
            <h3 className="text-5xl font-black italic text-emerald-500 tracking-tighter">
              {points.length ? Math.round((points.filter(p => p.last_scanned_at).length / points.length) * 100) : 0}%
            </h3>
          </div>
          <div className="flex-1 border-r border-slate-100 px-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <TruckIcon className="w-5 h-5 text-sky-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">Fleet Status</p>
            </div>
            <h3 className="text-5xl font-black italic text-slate-800 tracking-tighter">{fleet.length}</h3>
          </div>
          <div className="flex-1 px-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">User Charges</p>
            </div>
            <h3 className="text-5xl font-black italic text-sky-500 tracking-tighter">240K</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
