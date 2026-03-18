'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe } from 'lucide-react';
import * as turf from '@turf/turf';
import React from 'react';

// --- Client-Only Leaflet ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, GeoJSON } = mod;
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { 
      if (center) {
        // Zoom level thoda badha diya hai taaki city saaf dikhe
        map.flyTo(center, 15, { animate: true, duration: 2.5 }); 
      }
    }, [center, map]);
    return null;
  };

  return function Map({ center, wards, cityGeoJSON }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFlyController center={center} />
        
        {cityGeoJSON && (
          <GeoJSON data={cityGeoJSON} style={{ color: '#64748b', weight: 2, fillOpacity: 0.1 }} />
        )}

        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: w.color, fillColor: w.color, fillOpacity: 0.45, weight: 2 }} 
          />
        ))}
        <Marker position={center} />
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-slate-100 flex items-center justify-center font-black">LOCATING EXACT CENTER...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); 
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [cityGeoJSON, setCityGeoJSON] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // --- Search Logic Fix: Hamesha Center par focus karega ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setAutoWards([]); 
    
    try {
      // "addressdetails=1" aur "limit=1" taaki galat results na aayein
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&addressdetails=1&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const geojson = data[0].geojson;
        setCityGeoJSON(geojson);

        // --- MATH FIX: Boundary ka beech ka point nikalna ---
        const feature = turf.feature(geojson);
        const centerPoint = turf.centroid(feature); // Ye hamesha city ke beech ka point dega
        const [lon, lat] = centerPoint.geometry.coordinates;
        
        setMapCenter([lat, lon]); 
      } else {
        alert("City nahi mili! Kripya sahi naam likhein.");
      }
    } catch (err) { 
      console.error("Search failed", err); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const generateVoronoiWards = useCallback(() => {
    if (!cityGeoJSON) return;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
    const feature = turf.feature(cityGeoJSON);
    const bbox = turf.bbox(feature);
    
    // Random points generation inside boundary
    const points = turf.randomPoint(15, { bbox });
    const voronoi = turf.voronoi(points, { bbox });
    
    const clippedWards: any[] = [];
    voronoi.features.forEach((vFeature, i) => {
      const intersect = turf.intersect(feature, vFeature);
      if (intersect && clippedWards.length < 10) {
        const coords = intersect.geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
        clippedWards.push({
          id: i + 1,
          ward_number: i + 1,
          bounds: coords,
          color: colors[clippedWards.length]
        });
      }
    });
    setAutoWards(clippedWards);
  }, [cityGeoJSON, mapCenter]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-sky-600" />
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Exact Command Center</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search City (e.g. Kolhapur, Shirol, Pune)..." 
                className="w-full pl-12 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button onClick={handleSearch} className="bg-sky-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs">
              {isSearching ? "Locating..." : "Locate"}
            </button>
          </div>

          <button onClick={generateVoronoiWards} className="w-full mt-4 bg-emerald-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-sm">
            <Layers className="w-6 h-6" /> Auto-Partition (100% City Coverage)
          </button>
        </div>

        <div className="h-[550px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white relative">
          <LeafletMap center={mapCenter} wards={autoWards} cityGeoJSON={cityGeoJSON} />
        </div>
      </div>
    </div>
  );
}
