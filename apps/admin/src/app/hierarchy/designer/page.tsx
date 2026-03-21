'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, Zap, Save, Loader2, Map as MapIcon, Satellite, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- Business Logic Safe: Components ko dynamic load karna padta hai Next.js mein ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

export default function VillageBoundaryDesigner() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.1488, 73.9822]);
  const [isSatellite, setIsSatellite] = useState(false);
  const [boundary, setBoundary] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [villageId, setVillageId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // GIS Libraries state
  const [turf, setTurf] = useState<any>(null);

  useEffect(() => {
    // Client side par libraries load karna
    import('@turf/turf').then(m => setTurf(m));
    import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css');
  }, []);

  // --- Business Logic: 10-Ward Partition (No Change) ---
  const partitionWards = () => {
    if (!turf || !boundary) return alert("Pehle area draw karein!");
    try {
      let poly = turf.rewind(turf.feature(boundary.geometry), { reverse: true });
      poly = turf.buffer(poly, 0); 
      const bbox = turf.bbox(poly);
      const grid = turf.pointGrid(bbox, 0.005, { units: 'kilometers' });
      const seeds = grid.features.filter(pt => turf.booleanPointInPolygon(pt, poly)).slice(0, 10);
      
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
    } catch (e) { alert("Error! Thoda bada area draw karein."); }
  };

  // --- Business Logic: Direct Supabase Save (No Change) ---
  const handleSave = async () => {
    if (!villageId || wards.length === 0) return alert("Details missing!");
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
      if (!error) alert("Success! 10 Wards saved in Supabase.");
    } catch (err) { console.error(err); }
    setIsSaving(false);
  };

  return (
    <div className="relative w-full h-screen bg-slate-50">
      <MapContainer center={mapCenter} zoom={14} className="w-full h-full z-0" zoomControl={false}>
        <TileLayer url={isSatellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        
        {wards.map((ward, idx) => (
          <Polygon key={idx} positions={ward.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#10b981', fillOpacity: 0.3 }}>
            <Tooltip permanent direction="center" className="bg-white/80 p-1 rounded font-black text-[8px] uppercase">{ward.properties.ward_number}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      {/* --- iPhone White UI Control Panel --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-white/80 backdrop-blur-2xl rounded-[3.5rem] p-8 shadow-2xl border border-white space-y-4">
        <div className="flex gap-4">
          <input 
            placeholder="Village ID (e.g. Shirwal-101)" 
            className="flex-1 p-5 bg-slate-100/50 rounded-3xl font-bold outline-none border-none shadow-inner" 
            value={villageId} onChange={e => setVillageId(e.target.value)} 
          />
          <button onClick={() => setIsSatellite(!isSatellite)} className="p-5 bg-slate-900 text-white rounded-3xl active:scale-95 transition-all">
            {isSatellite ? <MapIcon className="w-6 h-6" /> : <Satellite className="w-6 h-6" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={partitionWards} className="bg-emerald-500 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Partition
          </button>
          <button onClick={handleSave} disabled={isSaving || wards.length === 0} className="bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} {isSaving ? 'Saving...' : 'Lock & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
