'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Activity, Search, Navigation, Layers } from 'lucide-react';
import React from 'react';

// --- Client-Side Guard: Taaki Server par Map crash na ho ---
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then((mod) => ({ default: mod.useMap })), { ssr: false });

// Interfaces as per README
interface Ward {
  id: number;
  ward_number: string;
  center: [number, number];
}

function MapController({ center }: { center: [number, number] }) {
  const map = (useMap as any)();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, 14, { duration: 2 });
    }
  }, [center, map]);
  return null;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false); // Fix for Hydration Error
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [autoWards, setAutoWards] = useState<Ward[]>([]);

  // 1. Pehle mount check karo
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) { console.error(err); }
  };

  const autoDivide = () => {
    const generated: Ward[] = [];
    for (let i = 1; i <= 10; i++) {
      generated.push({
        id: Date.now() + i,
        ward_number: `${i}`,
        center: [mapCenter[0] + (Math.random() - 0.5) * 0.01, mapCenter[1] + (Math.random() - 0.5) * 0.01]
      });
    }
    setAutoWards(generated);
  };

  // Jab tak mounted nahi hai, loading dikhao (Hydration Fix)
  if (!mounted) return (
    <div className="h-screen flex items-center justify-center bg-sky-50">
      <Loader2 className="animate-spin text-sky-500 w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Search */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-4 text-gray-400" />
            <form onSubmit={handleSearch}>
              <input 
                type="text"
                placeholder="Search city/area..."
                className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-bold outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
          <button onClick={autoDivide} className="bg-sky-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2">
            <Layers className="w-5 h-5" /> DIVIDE 10 WARDS
          </button>
        </div>

        {/* Full Map Container */}
        <div className="h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white relative z-0">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            {autoWards.map(w => (
              <Marker key={w.id} position={w.center} />
            ))}
          </MapContainer>
        </div>

        {/* Ward Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {autoWards.map(w => (
            <div key={w.id} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-50 text-center">
              <h3 className="font-black text-sky-600">Ward {w.ward_number}</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 tracking-widest">Live Syncing</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
