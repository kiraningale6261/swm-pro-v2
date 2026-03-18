'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Search, Layers, Activity } from 'lucide-react';
import React from 'react';

// --- 1. Interfaces (README ke mutabik) ---
interface Ward {
  id: number;
  ward_number: string;
  center?: [number, number];
}

// --- 2. Map Component (Pure Client-Side) ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Marker, Polyline, useMap } = mod;
  
  // Internal Controller for Fly-To
  const MapController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 14, { duration: 2 }); }, [center]);
    return null;
  };

  return function Map({ center, wards, trails }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={center} />
        {wards.map((w: any) => w.center && <Marker key={w.id} position={w.center} />)}
        {trails.map((m: any) => m.gpsPoints?.length > 0 && (
          <Polyline key={m.ward.id} positions={m.gpsPoints.map((p: any) => [p.location.coordinates[1], p.location.coordinates[0]])} color="#0ea5e9" weight={4} />
        ))}
      </MapContainer>
    );
  };
}), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-50 flex items-center justify-center font-bold text-gray-400 uppercase">Map Loading...</div>
});

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [miniMaps, setMiniMaps] = useState<any[]>([]);
  const [autoWards, setAutoWards] = useState<Ward[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // 3. Original Business Logic (Wards Fetching)
  const { data: wards = [], isLoading: wardsLoading } = useQuery({
    queryKey: ['wards'],
    queryFn: async () => {
      const data = await supabaseAdmin.getWards();
      return (data as Ward[]).slice(0, 10);
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
    const data = await res.json();
    if (data && data.length > 0) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
  };

  const generateWards = () => {
    const newWards = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      ward_number: `${i + 1}`,
      center: [mapCenter[0] + (Math.random() - 0.5) * 0.015, mapCenter[1] + (Math.random() - 0.5) * 0.015] as [number, number]
    }));
    setAutoWards(newWards);
    setMiniMaps(newWards.map(w => ({ ward: w, gpsPoints: [] })));
  };

  if (!mounted || wardsLoading) return (
    <div className="h-screen flex items-center justify-center bg-sky-50">
      <Loader2 className="animate-spin text-sky-500 w-12 h-12" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search Header */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6 border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-4 text-gray-400" />
            <form onSubmit={handleSearch}>
              <input type="text" placeholder="Search area..." className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-black outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </form>
          </div>
          <button onClick={generateWards} className="bg-sky-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2"><Layers className="w-5 h-5" /> DIVIDE 10 WARDS</button>
        </div>

        {/* Main Map */}
        <div className="h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} trails={miniMaps} />
        </div>

        {/* Ward Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {miniMaps.map((m) => (
            <div key={m.ward.id} className="bg-white p-6 rounded-[2rem] shadow-lg text-center border border-gray-50">
              <h3 className="font-black text-sky-600 uppercase italic">Ward {m.ward.ward_number}</h3>
              <div className="mt-2 text-[9px] font-black text-emerald-500 bg-emerald-50 py-1 px-3 rounded-full inline-block uppercase">Syncing Live</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
