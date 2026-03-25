'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Navigation, Camera, Zap, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet'; // Naya import

// --- SSR Safe Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

// --- INTERNAL MAP CONTROLLER (No external file needed) ---
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { animate: true });
  }, [center, map]);
  return null;
}

export default function MasterDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6780, 74.5564]);
  const [loading, setLoading] = useState(false);
  const [photoToggle, setPhotoToggle] = useState(false);

  // --- Real Stats (As discussed) ---
  const [realStats, setRealStats] = useState({ trips: 0 });

  useEffect(() => {
    const loadData = async () => {
      const { data: v } = await supabase.from('vehicles').select('*, staff(name)');
      setVehicles(v || []);
      const { data: s } = await supabase.from('staff').select('*');
      setWorkers(s || []);
      const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      setRealStats({ trips: count || 0 });
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
        toast.success(`${searchQuery} mil gaya!`);
      }
    } catch (e) { toast.error("Search failed"); }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col relative h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Search Bar */}
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
        <button onClick={handleSearch} className="bg-slate-900 text-white p-5 rounded-full shadow-lg">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex-1 z-0">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={mapCenter} />
          
          {vehicles.map((v) => v.last_lat && (
            <React.Fragment key={v.id}>
              <Marker position={[v.last_lat, v.last_lng]}>
                <Tooltip permanent direction="top" className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black text-[10px] shadow-2xl border-none">
                  🚚 {v.vehicle_number}
                </Tooltip>
              </Marker>
              {v.trail_coords && <Polyline positions={v.trail_coords} color="#0ea5e9" weight={4} opacity={0.4} />}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Stats Bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-5xl">
        <div className="bg-white/80 backdrop-blur-3xl rounded-[4rem] p-10 shadow-2xl border border-white flex justify-between items-center text-center">
          <div className="flex-1 border-r border-slate-100">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Live Tracking</p>
             <h3 className="text-4xl font-black italic text-emerald-500">ACTIVE</h3>
          </div>
          <div className="flex-1">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Trips</p>
             <h3 className="text-4xl font-black italic text-slate-800">{realStats.trips}</h3>
          </div>
        </div>
      </div>
      
      {/* Floating Buttons */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-5">
        <div className="bg-white/90 backdrop-blur-3xl p-6 rounded-[3.5rem] shadow-2xl border border-white flex flex-col items-center gap-4">
          <Camera className={`${photoToggle ? 'text-sky-500' : 'text-slate-300'} w-6 h-6 transition-all`} />
          <div onClick={() => setPhotoToggle(!photoToggle)} className={`w-14 h-7 rounded-full p-1 cursor-pointer ${photoToggle ? 'bg-sky-500' : 'bg-slate-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${photoToggle ? 'translate-x-7' : 'translate-x-0'}`} />
          </div>
        </div>
        <button className="bg-slate-900 p-6 rounded-full shadow-2xl text-amber-400"><Zap className="w-6 h-6" /></button>
      </div>
    </div>
  );
}
