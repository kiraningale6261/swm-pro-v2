'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Activity, Search, Navigation, Layers } from 'lucide-react';
import React from 'react';

// --- Interfaces (Bilkul wahi jo README mein hain) ---
interface Ward {
  id: number;
  ward_number: string;
  area_sq_km?: number;
  center?: [number, number];
}

interface GPSTrail {
  id: number;
  is_valid: boolean;
}

interface GPSPoint {
  id: number;
  location: any;
  accuracy: number;
  speed: number;
}

// --- Next.js SSR Fix: Map ko sirf browser mein load karne ke liye ---
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then((mod) => ({ default: mod.useMap })), { ssr: false });

// --- Map Controller: Google Maps style focus control ---
function ChangeView({ center }: { center: [number, number] }) {
  const map = (useMap as any)();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, 14, { duration: 2.5 });
    }
  }, [center, map]);
  return null;
}

interface MiniMapData {
  ward: Ward;
  gpsTrails: GPSTrail[];
  gpsPoints: GPSPoint[];
}

export default function DashboardPage() {
  // --- Hydration Fix: Client-side exception ko jad se khatam karne ke liye ---
  const [hasMounted, setHasMounted] = useState(false);
  const [miniMaps, setMiniMaps] = useState<MiniMapData[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Search & Auto-Divide States
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [isSearching, setIsSearching] = useState(false);
  const [autoWards, setAutoWards] = useState<Ward[]>([]);

  // 1. Mount Check: Application error fix
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 2. Fetch Wards (Business Logic)
  const { data: wards = [], isLoading: wardsLoading } = useQuery({
    queryKey: ['wards'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getWards();
        return (data as Ward[]).slice(0, 10);
      } catch (error) {
        console.error('Error fetching wards:', error);
        throw error;
      }
    },
  });

  // 3. Search Functionality
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  // 4. Auto-Divide 10 Wards Logic
  const generateWards = () => {
    const newWards: Ward[] = [];
    const spread = 0.015;
    for (let i = 1; i <= 10; i++) {
      newWards.push({
        id: Date.now() + i,
        ward_number: `${i}`,
        center: [mapCenter[0] + (Math.random() - 0.5) * spread, mapCenter[1] + (Math.random() - 0.5) * spread],
        area_sq_km: 1.5
      });
    }
    setAutoWards(newWards);
    setMiniMaps(newWards.map(w => ({ ward: w, gpsTrails: [], gpsPoints: [] })));
    setIsMapReady(true);
  };

  // 5. GPS Real-time Polling (5s) as per README
  const fetchGPSData = async () => {
    if (!wards || wards.length === 0) {
      if (!wardsLoading) setIsMapReady(true);
      return;
    }
    try {
      const data = await Promise.all(
        wards.map(async (ward) => {
          const trails = await supabaseAdmin.getGPSTrails() || [];
          const wardTrails = trails.filter((t: any) => t.is_valid);
          let gpsPoints: GPSPoint[] = [];
          if (wardTrails.length > 0) {
            gpsPoints = await supabaseAdmin.getGPSPoints(wardTrails[0].id) || [];
          }
          return { ward, gpsTrails: wardTrails, gpsPoints };
        })
      );
      setMiniMaps(data);
      setIsMapReady(true);
    } catch (error) { setIsMapReady(true); }
  };

  useEffect(() => {
    fetchGPSData();
    const interval = setInterval(fetchGPSData, 5000); 
    return () => clearInterval(interval);
  }, [wards]);

  // SSR Guard: Application Error Prevention
  if (!hasMounted || wardsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-sky-50">
        <Loader2 className="animate-spin text-sky-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Search & Command Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-2xl p-6 border border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500 p-2 rounded-xl shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Command Center</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SWM PRO Fleet Live</p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl flex gap-3">
              <form onSubmit={handleSearch} className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-sky-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search City/Area to divide..."
                  className="w-full pl-12 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              <button 
                onClick={generateWards}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl transition-all"
              >
                <Layers className="w-4 h-4" /> DIVIDE 10 WARDS
              </button>
            </div>
          </div>
        </div>

        {/* --- MAIN WORLD MAP --- */}
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white h-[500px] relative z-0">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
            <ChangeView center={mapCenter} />
            
            {autoWards.map(w => (
              <Marker key={w.id} position={w.center as any} />
            ))}
            
            {miniMaps.map(m => m.gpsPoints.length > 0 && (
              <Polyline key={m.ward.id} positions={m.gpsPoints.map(p => [p.location.coordinates[1], p.location.coordinates[0]]) as any} color="#0ea5e9" weight={4} />
            ))}
          </MapContainer>
        </div>

        {/* --- WARD CARDS --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {miniMaps.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-white/40 rounded-3xl border-2 border-dashed border-sky-100 font-bold text-gray-400 uppercase tracking-widest text-xs">Search and Divide to see fleet units</div>
          ) : (
            miniMaps.map((mapData) => (
              <div key={mapData.ward.id} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-50 text-center hover:scale-105 transition-all">
                <h3 className="font-black text-sky-600 text-lg tracking-tighter uppercase italic">Ward {mapData.ward.ward_number}</h3>
                <div className="mt-2 text-[9px] font-black text-emerald-500 bg-emerald-50 py-1 px-3 rounded-full inline-block uppercase tracking-widest border border-emerald-100">Live Syncing</div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
