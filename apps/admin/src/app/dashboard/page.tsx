'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Navigation, Camera, Zap, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const MapController = dynamic(() => import('./MapController'), { ssr: false }); // Helper to fly map

export default function MasterDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [photoToggle, setPhotoToggle] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6780, 74.5564]);
  const [loading, setLoading] = useState(false);

  // --- Real Stats from Database ---
  const [realStats, setRealStats] = useState({ waste: 0, roads: 0, nali: 0, trips: 0 });

  useEffect(() => {
    const loadData = async () => {
      // 1. Vehicles & Workers
      const { data: v } = await supabase.from('vehicles').select('*, staff(name)');
      setVehicles(v || []);
      const { data: s } = await supabase.from('staff').select('*');
      setWorkers(s || []);

      // 2. Real Stats Calculation (Example logic)
      const { count: tripCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      setRealStats(prev => ({ ...prev, trips: tripCount || 0 }));
    };

    loadData();
    const interval = setInterval(loadData, 5000); // 5 sec update
    return () => clearInterval(interval);
  }, []);

  // --- WORKING SEARCH: OSM Geocoding ---
  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        toast.success(`${searchQuery} mil gaya!`);
      } else {
        toast.error("Location nahi mili!");
      }
    } catch (e) {
      toast.error("Search failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col relative h-screen bg-slate-50 overflow-hidden">
      
      {/* 1. Working Search Bar */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-white/90 backdrop-blur-3xl p-3 rounded-[3.5rem] shadow-2xl border border-white flex items-center gap-4">
        <div className="flex-1 px-8 flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-300" />
          <input 
            placeholder="Search City, Ward or Village..." 
            className="w-full bg-transparent font-bold outline-none text-slate-700 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button 
          onClick={handleSearch}
          className="bg-slate-900 text-white p-5 rounded-full shadow-lg active:scale-90 transition-all"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
        </button>
      </div>

      {/* 2. Map Container with Fly-to Controller */}
      <div className="flex-1 z-0">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={mapCenter} />
          
          {/* Live Trucks */}
          {vehicles.map((v) => v.last_lat && (
            <React.Fragment key={v.id}>
              <Marker position={[v.last_lat, v.last_lng]}>
                <Tooltip permanent direction="top" className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black text-[10px] shadow-2xl border-none">
                  🚚 {v.vehicle_number} | {v.staff?.name || 'No Driver'}
                </Tooltip>
              </Marker>
              {v.trail_coords && <Polyline positions={v.trail_coords} color="#0ea5e9" weight={4} opacity={0.4} />}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* 3. Real-time Status Panel (Dummy data removed) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-5xl">
        <div className="bg-white/80 backdrop-blur-3xl rounded-[4rem] p-10 shadow-2xl border border-white flex justify-between items-center text-center">
          <div className="flex-1 border-r border-slate-100 px-4">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Waste Collected</p>
             <h3 className="text-4xl font-black italic text-emerald-500 tracking-tighter">Live Syncing...</h3>
          </div>
          <div className="flex-1 px-4">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Live Trips</p>
             <h3 className="text-4xl font-black italic text-slate-800 tracking-tighter">{realStats.trips}</h3>
          </div>
        </div>
      </div>

      {/* 4. Controls */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-5">
        <div className="bg-white/90 backdrop-blur-3xl p-6 rounded-[3.5rem] shadow-2xl border border-white flex flex-col items-center gap-4">
          <Camera className={`${photoToggle ? 'text-sky-500' : 'text-slate-300'} w-6 h-6 transition-all`} />
          <div onClick={() => setPhotoToggle(!photoToggle)} className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all ${photoToggle ? 'bg-sky-500' : 'bg-slate-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${photoToggle ? 'translate-x-7' : 'translate-x-0'} shadow-md`} />
          </div>
          <p className="text-[8px] font-black uppercase text-slate-400 font-bold">Photo Mod</p>
        </div>
        <button className="bg-slate-900 p-6 rounded-full shadow-2xl text-amber-400 active:scale-90 transition-all"><Zap className="w-6 h-6 shadow-[0_0_15px_rgba(251,191,36,0.5)]" /></button>
      </div>
    </div>
  );
}
