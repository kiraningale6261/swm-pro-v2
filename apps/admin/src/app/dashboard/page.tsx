'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe, MapPin } from 'lucide-react';
import React from 'react';

[span_2](start_span)// --- Client-Only Leaflet Engine[span_2](end_span) ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, GeoJSON } = mod;
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { 
      if (center) {
        [span_3](start_span)// Kisi bhi random city par focus karne ke liye zoom focus[span_3](end_span)
        map.flyTo(center, 15, { animate: true, duration: 2.5 }); 
      }
    }, [center, map]);
    return null;
  };

  return function Map({ center, wards, cityGeoJSON }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
        <MapFlyController center={center} />
        [span_4](start_span){/* City ki official boundary line agar available ho[span_4](end_span) */}
        {cityGeoJSON && <GeoJSON data={cityGeoJSON} style={{ color: '#64748b', weight: 2, fillOpacity: 0.1 }} />}
        [span_5](start_span){/* 10 Wards ki visual boundaries[span_5](end_span) */}
        {wards.map((w: any) => (
          <Polygon key={w.id} positions={w.bounds} pathOptions={{ color: w.color, fillColor: w.color, fillOpacity: 0.45, weight: 2 }} />
        ))}
        {center && <Marker position={center} />}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-slate-100 flex items-center justify-center font-black text-gray-400">LOCATING ANY CITY...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default India
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [cityGeoJSON, setCityGeoJSON] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  [span_6](start_span)// --- Universal Search Logic: Kisi bhi random city ke liye[span_6](end_span) ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setAutoWards([]); 
    
    try {
      [span_7](start_span)// Nominatim API har random city ko locate karne mein expert hai[span_7](end_span)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&addressdetails=1&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setCityGeoJSON(data[0].geojson);
        [span_8](start_span)// Map ko exact city ke center par bhejna[span_8](end_span)
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert("City not found! Please check the name.");
      }
    } catch (err) { 
        console.error("Search error", err); 
    } finally { 
        setIsSearching(false); 
    }
  };

  [span_9](start_span)// --- Global 10 Ward Division (No Build Errors)[span_9](end_span) ---
  const generateWards = () => {
    if (!mapCenter) return;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
    const newWards = [];
    [span_10](start_span)// Har city ke hisaab se area partition spread[span_10](end_span)
    const radius = 0.012; 

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const nextAngle = ((i + 1) / 10) * Math.PI * 2;

      [span_11](start_span)// Mathematical Wedge Partitioning jo har jagah kaam karega[span_11](end_span)
      const bounds = [
        mapCenter,
        [mapCenter[0] + Math.cos(angle) * radius, mapCenter[1] + Math.sin(angle) * radius],
        [mapCenter[0] + Math.cos(nextAngle) * radius, mapCenter[1] + Math.sin(nextAngle) * radius],
        mapCenter
      ];

      newWards.push({
        id: i + 1,
        ward_number: i + 1,
        bounds: bounds,
        color: colors[i]
      });
    }
    setAutoWards(newWards);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* --- Global Control Panel --- */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-sky-600" />
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Universal Command Center</h1>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
              <input 
                type="text" placeholder="Type any city name (e.g. Pune, London, Delhi)..." 
                className="w-full pl-12 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all shadow-inner"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button onClick={handleSearch} className="bg-sky-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-lg transition-all hover:bg-sky-700">
              {isSearching ? "LOCATING..." : "LOCATE"}
            </button>
          </div>
          <button onClick={generateWards} className="w-full mt-4 bg-emerald-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-sm hover:bg-emerald-700">
            <Layers className="w-6 h-6" /> AUTO-DIVIDE ANY CITY INTO 10 WARDS
          </button>
        </div>

        [span_12](start_span){/* --- Unified Map View[span_12](end_span) --- */}
        <div className="h-[550px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} cityGeoJSON={cityGeoJSON} />
        </div>

        [span_13](start_span){/* --- Live Unit Cards[span_13](end_span) --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {autoWards.map(w => (
            <div key={w.id} className="bg-white p-6 rounded-[2rem] shadow-lg border-t-4 transition-all hover:scale-105" style={{ borderColor: w.color }}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Unit</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Ward {w.ward_number}</h3>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-bold text-emerald-600 uppercase">Live Sync</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
