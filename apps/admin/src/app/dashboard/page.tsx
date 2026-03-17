'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Activity } from 'lucide-react';
import React from 'react'; // FIX: toast hata diya gaya hai yahan se

// FIX: Shared library ki jagah local interfaces use kar rahe hain taaki build pass ho jaye
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
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), {
  ssr: false,
});

interface MiniMapData {
  ward: Ward;
  gpsTrails: GPSTrail[];
  gpsPoints: GPSPoint[];
}

export default function DashboardPage() {
  const [miniMaps, setMiniMaps] = useState<MiniMapData[]>([]);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

  // Fetch GPS Data
  const fetchGPSData = async () => {
    if (wards.length === 0) return;

    try {
      const data = await Promise.all(
        wards.map(async (ward) => {
          const trails = await supabaseAdmin.getGPSTrails();
          const wardTrails = trails.filter((t: any) => t.is_valid);

          let gpsPoints: GPSPoint[] = [];
          if (wardTrails.length > 0) {
            gpsPoints = await supabaseAdmin.getGPSPoints(wardTrails[0].id);
          }

          return {
            ward,
            gpsTrails: wardTrails,
            gpsPoints,
          };
        })
      );

      setMiniMaps(data);
      setIsMapReady(true);
    } catch (error) {
      console.error('Error fetching GPS data:', error);
    }
  };

  useEffect(() => {
    fetchGPSData();
    const interval = setInterval(fetchGPSData, 5000);
    return () => clearInterval(interval);
  }, [wards]);

  if (wardsLoading || !isMapReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Synchronizing Fleet Data...</p>
        </div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-500 p-2 rounded-xl shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Live Dashboard</h1>
              <p className="text-gray-500 font-medium tracking-wide">Command Center: Monitoring Active Wards</p>
            </div>
          </div>
        </div>

        {/* Mini-Maps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {miniMaps.map((mapData) => (
            <div
              key={mapData.ward.id}
              className="bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border border-white/40 group"
              onClick={() => setSelectedWard(mapData.ward)}
            >
              <div className="relative h-44 bg-gray-100">
                <MapContainer
                  {...({
                    center: defaultCenter,
                    zoom: 12,
                    style: { height: '100%', width: '100%' },
                    zoomControl: false,
                    scrollWheelZoom: false,
                  } as any)}
                >
                  <TileLayer
                    {...({
                      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                      attribution: '&copy; OSM'
                    } as any)}
                  />

                  {mapData.gpsPoints.length > 0 && (
                    <Polyline
                      {...({
                        positions: mapData.gpsPoints
                          .map((p) => {
                            if (p.location && 'coordinates' in p.location) {
                              const coords = p.location.coordinates;
                              return [coords[1], coords[0]] as [number, number];
                            }
                            return null;
                          })
                          .filter(Boolean) as [number, number][],
                        color: "#0ea5e9",
                        weight: 3,
                        opacity: 0.8
                      } as any)}
                    />
                  )}
                </MapContainer>
                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[10px] font-black text-sky-600 shadow-sm border border-sky-100 uppercase tracking-tighter">
                  Ward {mapData.ward.ward_number}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Activity className="w-3.5 h-3.5 text-green-500" />
                  {mapData.gpsPoints.length} Points
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        {selectedWard && (
          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/40 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Ward {selectedWard.ward_number} Analysis</h2>
              <button
                onClick={() => setSelectedWard(null)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <div className="h-[500px] rounded-3xl overflow-hidden mb-8 border-4 border-white/50 shadow-inner">
              <MapContainer
                {...({
                  center: defaultCenter,
                  zoom: 14,
                  style: { height: '100%', width: '100%' }
                } as any)}
              >
                <TileLayer
                  {...({
                    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    attribution: '&copy; OpenStreetMap'
                  } as any)}
                />

                {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsPoints.length! > 1 && (
                  <Polyline
                    {...({
                      positions: miniMaps
                        .find((m) => m.ward.id === selectedWard.id)
                        ?.gpsPoints.map((p) => {
                          if (p.location && 'coordinates' in p.location) {
                            const coords = p.location.coordinates;
                            return [coords[1], coords[0]] as [number, number];
                          }
                          return null;
                        })
                        .filter(Boolean) as [number, number][],
                      color: "#0ea5e9",
                      weight: 4,
                      opacity: 0.9
                    } as any)}
                  />
                )}
              </MapContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-sky-600">
                  {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsPoints.length || 0}
                </p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Data Nodes</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-green-600">
                  {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsTrails.length || 0}
                </p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Trails</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-blue-600">{selectedWard.area_sq_km || '--'}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Area Km²</p>
              </div>
              <div className="bg-white/50 p-6 rounded-3xl border border-white/50 text-center shadow-sm">
                <p className="text-3xl font-black text-emerald-500">LIVE</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
