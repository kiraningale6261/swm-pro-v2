'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { fetchCityBoundary } from '@/lib/osm'; 
import { Search, Zap, Save, Loader2, Target, Satellite, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

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
  }, []);

  const handleAutoFetch = async () => {
    if (!searchCity) return toast.error("City name likhein");
    setIsSaving(true);
    const geojson = await fetchCityBoundary(searchCity);
    if (geojson) {
      setBoundary(geojson);
      const center = geojson.geometry.coordinates[0][0];
      setMapCenter([center[1], center[0]]);
      setWards([]);
      toast.success("Border Loaded!");
    } else {
      toast.error("City not found");
    }
    setIsSaving(false);
  };

  const partitionWards = () => {
    if (!turf || !boundary) return toast.error("Pehle border fetch karein!");
    
    try {
      // 1. Geometry Fix: Rewind coordinates for Turf
      let poly = turf.feature(boundary.geometry);
      poly = turf.rewind(poly, { reverse: true });

      // 2. Grid Generation inside Polygon
      const bbox = turf.bbox(poly);
      const grid = turf.pointGrid(bbox, 0.4, { units: 'kilometers', mask: poly });
      
      let seeds = grid.features.slice(0, 10);
      if (seeds.length < 10) {
          // Area chota hye toh random points use karein
          seeds = turf.randomPoint(10, { bbox }).features.filter((p: any) => turf.booleanPointInPolygon(p, poly));
      }

      // 3. Voronoi logic with intersection
      const voronoi = turf.voronoi(turf.featureCollection(seeds), { bbox });
      const resultWards = voronoi.features
        .map((cell: any) => turf.intersect(cell, poly))
        .filter((w: any) => w !== null)
        .slice(0, 10)
        .map((w: any, i: number) => ({
          ...w,
          properties: { ward_number: `Ward ${i + 1}` }
        }));

      setWards(resultWards);
      toast.success("Partition Success!");
    } catch (e) {
      console.error(e);
      toast.error("Partition failed. Shape complexity issue.");
    }
  };

  const handleSave = async () => {
    if (!villageId || wards.length === 0) return toast.error("Fill ID and Partition");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('wards').insert(
        wards.map(w => ({
          village_id: villageId,
          ward_number: w.properties.ward_number,
          boundary_geojson: w.geometry,
          area_sqm: Math.round(turf.area(w)),
          status: 'ACTIVE'
        }))
      );
      if (!error) toast.success("Saved to Supabase!");
      else throw error;
    } catch (err) { toast.error("Save Error"); }
    setIsSaving(false);
  };

  return (
    <div className="h-screen w-full bg-slate-100 overflow-hidden relative">
      <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={13} className="h-full w-full z-0">
        <TileLayer url={isSatellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        
        {boundary && (
          <Polygon positions={boundary.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#3b82f6', weight: 4, fillOpacity: 0.1 }} />
        )}

        {wards.map((ward, i) => (
          <Polygon key={i} positions={ward.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#10b981', weight: 2, fillOpacity: 0.4 }}>
            <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-white font-bold">{ward.properties.ward_number}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      {/* iPhone Style Floating UI */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-lg bg-white/90 backdrop-blur-md rounded-[2.5rem] p-4 shadow-2xl flex gap-2 border border-white">
        <input className="flex-1 bg-transparent px-6 font-bold outline-none" placeholder="Search City (Shirol...)" value={searchCity} onChange={e => setSearchCity(e.target.value)} />
        <button onClick={handleAutoFetch} className="bg-sky-500 text-white p-4 rounded-full shadow-lg active:scale-90 transition-all"><Target className="w-5 h-5" /></button>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl bg-white/90 backdrop-blur-md rounded-[3rem] p-8 shadow-2xl border border-white space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setIsSatellite(!isSatellite)} className="p-4 bg-slate-100 rounded-2xl flex justify-center"><Satellite className="w-5 h-5" /></button>
          <input className="p-4 bg-slate-50 rounded-2xl font-bold text-center text-xs border shadow-inner" placeholder="Village ID" value={villageId} onChange={e => setVillageId(e.target.value)} />
          <button onClick={partitionWards} className="bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Partition</button>
          <button onClick={handleSave} className="bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Save</button>
        </div>
      </div>
    </div>
  );
}
