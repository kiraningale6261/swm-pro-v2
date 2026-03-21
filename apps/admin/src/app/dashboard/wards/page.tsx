'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Map as MapIcon, Truck, User, Zap, ChevronRight, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Map Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

export default function WardMiniMaps() {
  const [wards, setWards] = useState<any[]>([]);
  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch 10 Wards from Supabase
      const { data: wData } = await supabase.from('wards').select('*').limit(10);
      setWards(wData || []);

      // 2. Fetch Live Tracking Data
      const { data: vData } = await supabase.from('vehicles').select('*');
      setLiveVehicles(vData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen animate-in fade-in duration-1000">
      <header className="flex justify-between items-end px-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800">Ward Analysis</h1>
          <p className="text-sky-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Module 0: Distributed Surveillance</p>
        </div>
        <div className="flex gap-4 bg-white p-3 rounded-full shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 px-4 border-r"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> <span className="text-[9px] font-black uppercase text-slate-400">Live Feed</span></div>
           <div className="flex items-center gap-2 px-4"><span className="text-[9px] font-black uppercase text-slate-800">10 Wards Active</span></div>
        </div>
      </header>

      {/* --- 10 Mini Maps Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 px-2">
        {wards.map((ward, idx) => (
          <div key={ward.id} className="group bg-white rounded-[3.5rem] p-4 shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
            
            {/* Mini Map Box */}
            <div className="h-48 w-full rounded-[2.5rem] overflow-hidden relative border-4 border-slate-50 z-0">
              <MapContainer 
                center={[ward.boundary_geojson.coordinates[0][0][1], ward.boundary_geojson.coordinates[0][0][0]]} 
                zoom={14} 
                zoomControl={false} 
                dragging={false} 
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.6} />
                <Polygon 
                  positions={ward.boundary_geojson.coordinates[0].map((c: any) => [c[1], c[0]])} 
                  pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.2, weight: 2 }}
                />
                {/* Is Ward mein jo gaadi hye wo dikhao */}
                {liveVehicles.map(v => v.last_lat && (
                    <Marker key={v.id} position={[v.last_lat, v.last_lng]} />
                ))}
              </MapContainer>
              <div className="absolute top-4 left-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest z-[1000]">
                Ward {ward.ward_number}
              </div>
            </div>

            {/* Ward Stats Mini Card */}
            <div className="mt-6 px-4 pb-4 space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Coverage</span>
                  <span className="text-sm font-black italic text-emerald-500">92%</span>
               </div>
               <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[92%] rounded-full" />
               </div>
               <button className="w-full py-3 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2">
                  <Zap className="w-3 h-3" /> <span className="text-[9px] font-black uppercase tracking-widest">Focus View</span>
               </button>
            </div>
          </div>
        ))}

        {/* Empty State if no wards */}
        {wards.length === 0 && !loading && (
          <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
             <MapIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase text-xs tracking-[0.4em]">No Ward Data Found. Use Designer First.</p>
          </div>
        )}
      </div>
    </div>
  );
}
