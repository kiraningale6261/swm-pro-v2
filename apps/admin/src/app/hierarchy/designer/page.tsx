'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { fetchCityBoundary } from '@/lib/osm'; // Nayi file jo humne banayi
import { Search, Zap, Save, Loader2, Map as MapIcon, Satellite, Target } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Dynamic imports for Next.js SSR Safety
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

export default function VillageBoundaryDesigner() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.1488, 73.9822]);
  const [searchCity, setSearchCity] = useState('');
  const [isSatellite, setIsSatellite] = useState(false);
  const [boundary, setBoundary] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [villageId, setVillageId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [turf, setTurf] = useState<any>(null);

  useEffect(() => {
    import('@turf/turf').then(m => setTurf(m));
    import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css');
  }, []);

  // --- NEW: Official Boundary Fetcher ---
  const handleAutoFetch = async () => {
    if (!searchCity) return toast.error("City ka naam likhein (e.g. Shirol)");
    setIsSaving(true);
    
    const geojson = await fetchCityBoundary(searchCity);
    
    if (geojson && geojson.geometry.coordinates.length > 0) {
      setBoundary(geojson);
      // Map ko city ke center par le jana
      const coords = geojson.geometry.coordinates[0][0];
      setMapCenter([coords[1], coords[0]]);
      toast.success(`${searchCity} ki official border mil gayi!`);
    } else {
      toast.error("Border nahi mili. Manual draw karein ya naam check karein.");
    }
    setIsSaving(false);
  };

  // --- Business Logic: 10-Ward Partition (With Fix) ---
  const partitionWards = () => {
    if (!turf || !boundary) return toast.error("Pehle boundary fetch ya draw karein!");
    
    try {
      let poly = turf.rewind(turf.feature(boundary.geometry), { reverse: true });
      poly = turf.buffer(poly, 0); 
      
      const bbox = turf.bbox(poly);
      const grid = turf.pointGrid(bbox, 0.005, { units: 'kilometers' });
      const seeds = grid.features.filter(pt => turf.booleanPointInPolygon(pt, poly)).slice(0, 10);
      
      if (seeds.length < 10) throw new Error("Area too small for 10 wards");

      const voronoi = turf.voronoi(turf.featureCollection(seeds), { bbox });
      const finalWards = voronoi.features
        .map(cell => turf.intersect(cell, poly))
        .filter((w): w is any => w !== null)
        .slice(0, 10)
        .map((w, i) => ({ 
          ...w, 
          properties: { ward_number: `Ward ${String(i + 1).padStart(2, '0')}` } 
        }));

      setWards(finalWards);
      toast.success("10 Wards Partitioned Successfully!");
    } catch (e) { 
      toast.error("Partition Error. Thoda bada area use karein."); 
    }
  };

  const handleSave = async () => {
    if (!villageId || wards.length === 0) return toast.error("Village ID aur Wards zaroori hain!");
    setIsSaving(true);
    try {
      const payload = wards.map(w => ({
        village_id: villageId,
        ward_number: w.properties.ward_number,
        boundary_geojson: w.geometry,
        area_sqm: Math.round(turf.area(w)),
        status: 'ACTIVE'
      }));
      const { error } = await supabase.from('wards').insert(payload);
      if (error) throw error;
      toast.success("Shirwal Wards saved in Supabase!");
    } catch (err) { toast.error("Save Failed!"); }
    setIsSaving(false);
  };

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden">
      <MapContainer center={mapCenter} zoom={14} className="w-full h-full z-0" zoomControl={false}>
        <TileLayer url={isSatellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        
        {/* Render Official Boundary */}
        {boundary && (
          <Polygon positions={boundary.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#0ea5e9', weight: 4, fillOpacity: 0.1 }} />
        )}

        {/* Render Partitioned Wards */}
        {wards.map((ward, idx) => (
          <Polygon key={idx} positions={ward.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#10b981', fillOpacity: 0.3 }}>
            <Tooltip permanent direction="center" className="bg-white/80 p-1 rounded font-black text-[8px] uppercase">{ward.properties.ward_number}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      {/* --- iPhone White UI Dashboard --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-2xl bg-white/80 backdrop-blur-3xl rounded-[3.5rem] p-8 shadow-2xl border border-white space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
             <input 
              placeholder="City Name (e.g. Shirol)" 
              className="w-full p-5 pl-14 bg-slate-100/50 rounded-3xl font-bold outline-none border-none shadow-inner text-slate-700" 
              value={searchCity} onChange={e => setSearchCity(e.target.value)} 
            />
            <Search className="absolute left-5 top-5 text-slate-400 w-5 h-5" />
          </div>
          <button onClick={handleAutoFetch} className="p-5 bg-sky-500 text-white rounded-3xl active:scale-90 transition-all shadow-lg shadow-sky-100">
            <Target className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <input placeholder="Village ID" className="p-5 bg-slate-50 rounded-3xl font-bold border-none outline-none shadow-inner text-center text-xs" value={villageId} onChange={e => setVillageId(e.target.value)} />
          <button onClick={partitionWards} className="bg-emerald-500 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Partition
          </button>
          <button onClick={handleSave} disabled={isSaving || wards.length === 0} className="bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
