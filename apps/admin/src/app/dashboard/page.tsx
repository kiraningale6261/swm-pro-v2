'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe } from 'lucide-react';
import React from 'react';

// --- Client-Only Map Components ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap } = mod;
  
  // Ye sensor map ko kisi bhi nayi city par 'Fly' karwa deta hai
  const GlobalFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.flyTo(center, 13, { animate: true, duration: 2.5 });
      }
    }, [center, map]);
    return null;
  };

  return function Map({ center, wards }: any) {
    return (
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GlobalFlyController center={center} />
        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: '#0ea5e9', fillColor: '#38bdf8', fillOpacity: 0.3, weight: 2 }} 
          />
        ))}
        <Marker position={center} />
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-gray-50 flex items-center justify-center font-black">SYNCING GLOBAL MAP...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default India Center
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // --- Global Search Logic (Any City in the World) ---
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsSearching(true);
    try {
      // Nominatim API: Duniya ki koi bhi location dhoondne ke liye
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]); // Coordinate milte hi FlyController move karega
      } else {
        alert("Location not found! Please check the spelling.");
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // --- 10 Equal Grid Division Logic ---
  const generate10EqualWards = () => {
    const wards = [];
    const rows = 2; 
    const cols = 5; 
    const size = 0.012; // Standard size for city wards

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c + 1;
        const offsetLat = (r - rows / 2) * size;
        const offsetLng = (c - cols / 2) * size;

        const startLat = mapCenter[0] + offsetLat;
        const startLng = mapCenter[1] + offsetLng;

        const bounds = [
          [startLat, startLng],
          [startLat + size, startLng],
          [startLat + size, startLng + size],
          [startLat, startLng + size],
        ];

        wards.push({ id, ward_number: id, bounds });
      }
    }
    setAutoWards(wards);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- Global Search & Command Center --- */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2 px-2">
            <Globe className="text-sky-600 w-6 h-6 animate-pulse" />
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Global Command Center</h1>
          </div>
          
          <form onSubmit={handleGlobalSearch} className="relative flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5 group-focus-within:text-sky-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search any City or Area (e.g. Kolhapur, London, Pune)..." 
                className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-sky-600 text-white px-10 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-sky-700 transition-all flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Locate"}
            </button>
          </form>

          <button 
            onClick={generate10EqualWards}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-sm"
          >
            <Layers className="w-5 h-5" /> Auto-Divide into 10 Equal Wards
          </button>
        </div>

        {/* --- High Definition Map View --- */}
        <div className="h-[550px] rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-white relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} />
        </div>

        {/* --- Live Ward Status --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-12">
          {autoWards.map(w => (
            <div key={w.id} className="bg-white p-6 rounded-[2rem] shadow-xl border-t-4 border-emerald-500 text-center hover:scale-105 transition-all">
              <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Unit {w.ward_number}</h3>
              <p className="text-[9px] font-black text-emerald-500 uppercase mt-2 bg-emerald-50 py-1 rounded-full">Sync Ready</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
