'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe, Edit2, Zap } from 'lucide-react';
import * as turf from '@turf/turf'; // advanced spatial math library
import React from 'react';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, FeatureGroup } = mod;
  const { EditControl } = require('react-leaflet-draw'); // Dynamic import for draw
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 14, { duration: 2.5 }); }, [center, map]);
    return null;
  };

  return function Map({ center, wards, drawnItemsRef, onDrawn }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        {/* Professional dark mode layer */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
        <MapFlyController center={center} />
        
        {/* Draw Control Area */}
        <FeatureGroup ref={drawnItemsRef}>
          <EditControl
            position="topleft"
            onCreated={onDrawn}
            onEdited={onDrawn}
            onDeleted={onDrawn}
            draw={{
              polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#0ea5e9', weight: 3 } },
              rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
            }}
          />
        </FeatureGroup>

        {/* 10 advanced Voronoi Polygons (No Gaps) */}
        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: w.color, fillColor: w.color, fillOpacity: 0.5, weight: 1.5 }} 
          />
        ))}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-slate-900 flex items-center justify-center font-black">INITIALISING DRAW ENGINE...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const drawnItemsRef = useRef<any>(null); // To store drawn boundary data
  const [drawnBoundary, setDrawnBoundary] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  // --- World Geocoding: Automatic City Locate ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setAutoWards([]); 
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  // --- Draw event handler ---
  const handleDrawnArea = (e: any) => {
    const layer = e.layer || (e.layers && e.layers.getLayers()[0]);
    if (layer) {
      const geojson = layer.toGeoJSON();
      setDrawnBoundary(geojson);
    }
  };

  // --- advanced Logic: advanced Voronoi tessellation (No Center, No Gaps) ---
  const generateVoronoiWards = useCallback(() => {
    if (!drawnBoundary) {
      alert("Pehle Draw Tool se ek official area boundary draw karein!");
      return;
    }

    // Professional color scheme
    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c', '#2dd4bf', '#818cf8'];
    
    // 1. drawnBoundary (Polygon) fetch karein
    const drawnFeature = turf.feature(drawnBoundary.geometry);
    
    // 2. City border ke andar 10 random points generate karein ( seeds for Voronoi)
    const points = turf.randomPoint(10, { bbox: turf.bbox(drawnFeature) });
    
    // 3. drawnBoundary bbox ke basis par Voronoi tessellation generate karein
    // Is bbox logic se random spatial pattern banta hai, center dependence nahi rehti.
    const voronoi = turf.voronoi(points, { bbox: turf.bbox(drawnFeature) });
    
    const clippedWards: any[] = [];
    
    // 4. advanced Clipping logic for 10 wards
    voronoi.features.forEach((voronoiFeature, i) => {
      // Voronoi Feature aur Drawn boundary ka intersection check karein (Spatial Clipping)
      const clipped = turf.intersect(drawnFeature, voronoiFeature);
      
      if (clipped && clipped.geometry.type === 'Polygon') {
        // Turf (lng, lat) data structure ko Leaflet (lat, lng) coordinates mein format karein
        const coords = clipped.geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
        
        clippedWards.push({
          id: i + 1,
          ward_number: i + 1,
          bounds: coords,
          color: colors[i % colors.length]
        });
      }
    });

    setAutoWards(clippedWards);
  }, [drawnBoundary]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8 font-sans text-white">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* --- advanced Header Control with Draw Trigger --- */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-slate-800 relative z-[1001]">
          <div className="flex items-center gap-3 mb-6 border-b pb-6 border-slate-800">
            <Edit2 className="w-10 h-10 text-blue-500" />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Spatial Draw Engine</h1>
              <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">SWM PRO - Dynamic Ward Partitioning</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-5 top-5 text-slate-500 w-6 h-6" />
              <input 
                type="text" 
                placeholder="Type City Name (e.g. Kolhapur, London, Pune)..." 
                className="w-full pl-14 p-5 bg-slate-800 border-2 border-slate-700 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-lg shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button 
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black transition-all shadow-lg uppercase text-sm tracking-widest"
            >
              {isSearching ? "Locating..." : "Locate"}
            </button>
          </div>

          <button 
            onClick={generateVoronoiWards}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-lg"
          >
            <Zap className="w-7 h-7" /> Partition into 10 advanced Wards
          </button>
        </div>

        {/* --- smart Map Container --- */}
        <div className="h-[600px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-slate-900 relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} drawnItemsRef={drawnItemsRef} onDrawn={handleDrawnArea} />
        </div>

        {/* --- Wards status dashboard --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-8">
          {autoWards.map(w => (
            <div key={w.id} className="bg-slate-900/70 p-6 rounded-[2.5rem] shadow-xl border-t-8 transition-all hover:scale-105" style={{ borderColor: w.color }}>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Unit</p>
              <h3 className="text-2xl font-black text-white tracking-tighter">WARD {w.ward_number}</h3>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-tight">Spatial Sync Active</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
