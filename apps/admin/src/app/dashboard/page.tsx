'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
  Truck, User as UserIcon, Search, Zap, Map as MapIcon, 
  Settings, Camera, Navigation, Layers, Info, Filter 
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

export default function MasterLiveDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6912, 74.4962]);
  const [photoToggle, setPhotoToggle] = useState(false); // Master Switch

  // --- Real-time Sync & Tracking ---
  useEffect(() => {
    const syncTracking = async () => {
      // Fetch Trucks & Workers with their last GPS trail
      const { data: vData } = await supabase.from('vehicles').select('*, trail_coords');
      setVehicles(vData || []);
      const { data: sData } = await supabase.from('staff').select('*').neq('role', 'ADMIN');
      setWorkers(sData || []);
    };
    syncTracking();

    // Real-time GPS Listener
    const trackingChannel = supabase.channel('gps-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles' }, payload => {
        setVehicles(prev => prev.map(v => v.id === payload.new.id ? { ...v, ...payload.new } : v));
      }).subscribe();

    return () => { supabase.removeChannel(trackingChannel); };
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* --- Main Action Area --- */}
      <div className="flex-1 flex flex-col relative">
        
        {/* --- Top Search Bar (Google Style) --- */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] w-[80%] max-w-2xl">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl border border-white flex items-center gap-4">
            <div className="flex-1 flex items-center gap-4 px-6">
              <Search className="text-slate-400 w-5 h-5" />
              <input 
                placeholder="Search City, Ward or Vehicle..." 
                className="bg-transparent border-none outline-none font-bold text-slate-700 w-full"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
              />
            </div>
            <button className="bg-slate-900 text-white p-4 rounded-full shadow-lg"><Navigation className="w-5 h-5" /></button>
          </div>
        </div>

        {/* --- Master Map --- */}
        <div className="flex-1 z-0 relative">
          <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* 1. Live Trucks + Trails */}
            {vehicles.map((v) => (
              <React.Fragment key={v.id}>
                {v.last_lat && (
                  <Marker position={[v.last_lat, v.last_lng]}>
                    <Tooltip permanent direction="top" className="bg-slate-900 text-white rounded-xl px-3 py-1 font-black text-[9px] uppercase tracking-tighter shadow-2xl">
                      🚚 {v.vehicle_number}
                    </Tooltip>
                  </Marker>
                )}
                {/* Vehicle Trail Line */}
                {v.trail_coords && <Polyline positions={v.trail_coords} color="#0ea5e9" weight={3} opacity={0.6} />}
              </React.Fragment>
            ))}

            {/* 2. Live Workers */}
            {workers.map((w) => w.last_lat && (
              <Marker key={w.id} position={[w.last_lat, w.last_lng]}>
                <Tooltip permanent direction="bottom" className="bg-sky-500 text-white rounded-xl px-3 py-1 font-black text-[9px] uppercase tracking-tighter">
                  👤 {w.name}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* --- Master Controller Panel (Right Side) --- */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-4">
          
          {/* Photo Toggle Switch */}
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[3rem] shadow-2xl border border-white flex flex-col items-center gap-3">
             <Camera className={`${photoToggle ? 'text-sky-500' : 'text-slate-300'} w-6 h-6 transition-all`} />
             <div 
               onClick={() => setPhotoToggle(!photoToggle)}
               className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${photoToggle ? 'bg-sky-500' : 'bg-slate-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${photoToggle ? 'translate-x-6' : 'translate-x-0'}`} />
             </div>
             <span className="text-[8px] font-black uppercase text-slate-400">Photo Mod</span>
          </div>

          <button className="bg-white/90 p-5 rounded-full shadow-xl"><Layers className="w-5 h-5 text-slate-700" /></button>
          <button className="bg-slate-900 p-5 rounded-full shadow-xl text-white"><Zap className="w-5 h-5 text-amber-400" /></button>
        </div>

        {/* --- Bottom Status Bar --- */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-4xl">
          <div className="bg-white/80 backdrop-blur-3xl rounded-[3rem] p-8 shadow-2xl border border-white grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center border-r">
               <span className="text-[10px] font-black uppercase text-slate-400">Waste Collected</span>
               <h3 className="text-2xl font-black italic text-emerald-500">84%</h3>
            </div>
            <div className="flex flex-col items-center border-r">
               <span className="text-[10px] font-black uppercase text-slate-400">Roads Cleaned</span>
               <h3 className="text-2xl font-black italic text-sky-500">12.4 km</h3>
            </div>
            <div className="flex flex-col items-center border-r">
               <span className="text-[10px] font-black uppercase text-slate-400">Nali Status</span>
               <h3 className="text-2xl font-black italic text-amber-500">92% Match</h3>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-[10px] font-black uppercase text-slate-400">Total Trips</span>
               <h3 className="text-2xl font-black italic text-slate-800">42</h3>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
