'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Activity, Search, Navigation } from 'lucide-react';
import React from 'react';

// FIX: Shared library ki jagah local interfaces
interface Ward {
  id: number;
  ward_number: string;
  area_sq_km?: number;
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

// Dynamically import Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then((mod) => ({ default: mod.useMap })), { ssr: false });

// --- Map Controller (Search par focus change karne ke liye) ---
function ChangeView({ center }: { center: [number, number] }) {
  const map = (useMap as any)();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 2 });
  }, [center, map]);
  return null;
}

interface MiniMapData {
  ward: Ward;
  gpsTrails: GPSTrail[];
  gpsPoints: GPSPoint[];
}

export default function DashboardPage() {
  const [miniMaps, setMiniMaps] = useState<MiniMapData[]>([]);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch Wards
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

  // World Search Function
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

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
    } catch (error) {
      console.error('Error fetching GPS data:', error);
      setIsMapReady(true);
    }
  };

  useEffect(() => {
    fetchGPSData();
    const interval = setInterval(fetchGPSData, 5000);
    return () => clearInterval(interval);
  }, [wards, wardsLoading]);

  if (wardsLoading || !isMapReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600 font-bold tracking-tighter uppercase">Synchronizing Fleet Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Search Bar */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-6 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500 p-2 rounded-xl shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">Live Command Center</h1>
                <p className="text-gray-500 text-xs font-bold uppercase">Global Fleet Tracking</p>
              </div>
            </div>

            {/* Google Maps Style Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-sky-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search world areas (e.g. Pune, London...)"
                className="w-full pl-12 pr-24 p-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 bg-sky-500 hover:bg-sky-600 text-white px-4 rounded-xl text-xs font-black shadow-lg shadow-sky-100 flex items-center gap-2 transition-all"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                LOCATE
              </button>
            </form>
          </div>
        </div>

        {/* Mini-Maps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {miniMaps.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-sky-200">
              <p className="text-gray-400 font-black uppercase tracking-widest">No Active Wards Found</p>
            </div>
          ) : (
            miniMaps.map((mapData) => (
              <div
                key={mapData.ward.id}
                className="bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border border-white/40 group"
                onClick={() => setSelectedWard(mapData.ward)}
              >
                <div className="relative h-44 bg-gray-100">
                  <MapContainer
                    {...({
                      center: mapCenter, // Search follow karega
                      zoom: 12,
                      style: { height: '100%', width: '100%' },
                      zoomControl: false,
                      scrollWheelZoom: false,
                    } as any)}
                  >
                    <TileLayer {...({ url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; OSM' } as any)} />
                    <ChangeView center={mapCenter} />
                    {mapData.gpsPoints.length > 0 && (
                      <Polyline {...({
                        positions: mapData.gpsPoints.map(p => p.location?.coordinates ? [p.location.coordinates[1], p.location.coordinates[0]] : null).filter(Boolean),
                        color: "#0ea5e9", weight: 3, opacity: 0.8
                      } as any)} />
                    )}
                  </MapContainer>
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[10px] font-black text-sky-600 shadow-sm uppercase tracking-tighter">
                    Ward {mapData.ward.ward_number}
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-gray-700 uppercase tracking-tighter">
                    <Activity className="w-3.5 h-3.5 text-green-500" />
                    {mapData.gpsPoints.length} Nodes
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detailed View */}
        {selectedWard && (
          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Ward {selectedWard.ward_number} Analytics</h2>
              <button onClick={() => setSelectedWard(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold">✕</button>
            </div>
            <div className="h-[500px] rounded-[2rem] overflow-hidden mb-8 border-4 border-white shadow-inner relative">
              <MapContainer {...({ center: mapCenter, zoom: 14, style: { height: '100%', width: '100%' } } as any)}>
                <TileLayer {...({ url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; OSM' } as any)} />
                <ChangeView center={mapCenter} />
                <Polyline {...({
                  positions: miniMaps.find(m => m.ward.id === selectedWard.id)?.gpsPoints.map(p => p.location?.coordinates ? [p.location.coordinates[1], p.location.coordinates[0]] : null).filter(Boolean) || [],
                  color: "#0ea5e9", weight: 4, opacity: 0.9
                } as any)} />
              </MapContainer>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-sky-600 tracking-tighter">{miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsPoints.length || 0}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Data Nodes</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-green-600 tracking-tighter">{miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsTrails.length || 0}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Total Trails</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-blue-600 tracking-tighter">{selectedWard.area_sq_km || '--'}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Area Km²</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-emerald-500 tracking-tighter">LIVE</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Tracking</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
