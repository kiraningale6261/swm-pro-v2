'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Polygon, Tooltip } from 'react-leaflet';
import * as turf from '@turf/turf';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { Search, Zap, Save, Loader2, Map as MapIcon, Satellite } from 'lucide-react';

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
}

function GeomanHandler({ onBoundaryChange }: { onBoundaryChange: (geojson: any) => void }) {
  const map = useMap();
  useEffect(() => {
    // @ts-ignore
    if (!map.pm) return;
    // @ts-ignore
    map.pm.addControls({ position: 'topleft', drawPolygon: true, removalMode: true, editMode: true });
    // @ts-ignore
    map.on('pm:create', (e: any) => {
      const geojson = e.layer.toGeoJSON();
      onBoundaryChange(geojson);
    });
    return () => { // @ts-ignore
      map.off('pm:create');
    };
  }, [map, onBoundaryChange]);
  return null;
}

export default function VillageBoundaryDesigner() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.1488, 73.9822]);
  const [mapZoom, setMapZoom] = useState(14);
  const [isSatellite, setIsSatellite] = useState(false);
  const [boundary, setBoundary] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [villageId, setVillageId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Partition Logic Fix ---
  const partitionWards = () => {
    if (!boundary) return alert("Pehle area draw karein!");
    try {
      // 1. Rewind boundary to fix coordinate order (Clockwise issue fix)
      let poly = turf.rewind(turf.feature(boundary.geometry), { reverse: true });
      
      // 2. Fix self-intersections
      poly = turf.buffer(poly, 0) as any;

      const bbox = turf.bbox(poly);
      // Increase grid density to ensure we find points inside
      const grid = turf.pointGrid(bbox, 0.005, { units: 'kilometers' });
      const seeds = grid.features
        .filter(pt => turf.booleanPointInPolygon(pt, poly))
        .slice(0, 10);

      if (seeds.length < 10) {
        throw new Error("Area too small. Please draw a larger boundary.");
      }

      const voronoi = turf.voronoi(turf.featureCollection(seeds), { bbox });
      const finalWards = voronoi.features
        .map(cell => turf.intersect(cell, poly))
        .filter((w): w is turf.Feature<turf.Polygon> => w !== null)
        .slice(0, 10)
        .map((w, i) => ({ 
          ...w, 
          properties: { ward_number: `Ward ${String(i + 1).padStart(2, '0')}` } 
        }));

      setWards(finalWards);
    } catch (e: any) {
      alert("Partition error: " + e.message);
    }
  };

  // --- Saving Fix ---
  const handleSave = async () => {
    if (!villageId || wards.length === 0) return alert("Village ID aur Wards zaroori hain!");
    setIsSaving(true);
    
    try {
      const payload = wards.map(w => ({
        village_id: villageId,
        ward_number: w.properties.ward_number,
        boundary_geojson: w.geometry, // Supabase column name check karein
        area_sqm: Math.round(turf.area(w)),
        status: 'ACTIVE'
      }));

      const { data, error } = await supabase.from('wards').insert(payload);
      
      if (error) throw error;
      alert("Success! 10 Wards saved in Supabase.");
    } catch (err: any) {
      console.error("Save Error:", err);
      alert("Save Failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-50">
      <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full z-0" zoomControl={false}>
        <MapController center={mapCenter} zoom={mapZoom} />
        <GeomanHandler onBoundaryChange={setBoundary} />
        <TileLayer url={isSatellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        
        {wards.map((ward, idx) => (
          <Polygon key={idx} positions={ward.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#10b981', fillOpacity: 0.3 }}>
            <Tooltip permanent direction="center" className="bg-white/80 p-1 rounded font-black text-[9px]">
              {ward.properties.ward_number}
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      {/* Control Panel (iPhone Style) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-white/90 backdrop-blur-xl rounded-[3.5rem] p-8 shadow-2xl space-y-4">
        <div className="flex gap-4">
          <input 
            placeholder="Village ID (e.g. VIL-101)" 
            className="flex-1 p-5 bg-slate-100/50 rounded-3xl font-bold outline-none" 
            value={villageId} 
            onChange={e => setVillageId(e.target.value)} 
          />
          <button onClick={() => setIsSatellite(!isSatellite)} className="p-5 bg-slate-900 text-white rounded-3xl">
            {isSatellite ? <MapIcon /> : <Satellite />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={partitionWards} className="bg-emerald-500 text-white p-5 rounded-3xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg">
            <Zap className="w-4 h-4" /> Partition 10 Wards
          </button>
          <button onClick={handleSave} disabled={isSaving || wards.length === 0} className="bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl disabled:bg-slate-300">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />} Lock & Save
          </button>
        </div>
      </div>
    </div>
  );
}
