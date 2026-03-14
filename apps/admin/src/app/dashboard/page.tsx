'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { Ward, GPSTrail, GPSPoint } from '@swm-pro/shared';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Activity } from 'lucide-react';
import { toast } from 'sonner';

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
        return (data as Ward[]).slice(0, 10); // Limit to 10 wards
      } catch (error) {
        console.error('Error fetching wards:', error);
        throw error;
      }
    },
  });

  // Fetch GPS Trails for all wards
  useEffect(() => {
    const fetchGPSData = async () => {
      if (wards.length === 0) return;

      try {
        const data = await Promise.all(
          wards.map(async (ward) => {
            const trails = await supabaseAdmin.getGPSTrails();
            const wardTrails = trails.filter((t: GPSTrail) => t.is_valid);

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
        toast.error('Failed to load GPS data');
      }
    };

    fetchGPSData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchGPSData, 5000);
    return () => clearInterval(interval);
  }, [wards]);

  if (wardsLoading || !isMapReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-sky-600" />
            <h1 className="text-3xl font-bold text-gray-800">Live Dashboard</h1>
          </div>
          <p className="text-gray-600">Real-time monitoring of 10 wards with live GPS trails</p>
        </div>

        {/* Mini-Maps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {miniMaps.map((mapData, idx) => (
            <div
              key={mapData.ward.id}
              className="glass-card overflow-hidden cursor-pointer hover:shadow-xl transition-all group"
              onClick={() => setSelectedWard(mapData.ward)}
            >
              {/* Map Container */}
              <div className="relative h-48 bg-white/50">
                {isMapReady && (
                  <MapContainer
                    center={[20.5937, 78.9629]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />

                    {/* GPS Trails */}
                    {mapData.gpsPoints.length > 0 && (
                      <Polyline
                        positions={mapData.gpsPoints
                          .map((p) => {
                            if (p.location && 'coordinates' in p.location) {
                              const coords = p.location.coordinates;
                              return [coords[1], coords[0]] as [number, number];
                            }
                            return null;
                          })
                          .filter(Boolean) as [number, number][]}
                        color="#0ea5e9"
                        weight={2}
                        opacity={0.7}
                      />
                    )}

                    {/* Current Location Marker */}
                    {mapData.gpsPoints.length > 0 && (
                      <Marker
                        position={
                          (() => {
                            const lastPoint = mapData.gpsPoints[mapData.gpsPoints.length - 1];
                            if (lastPoint.location && 'coordinates' in lastPoint.location) {
                              const coords = lastPoint.location.coordinates;
                              return [coords[1], coords[0]] as [number, number];
                            }
                            return [20.5937, 78.9629];
                          })()
                        }
                      >
                        <Popup>Ward {mapData.ward.ward_number}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                )}
              </div>

              {/* Ward Info */}
              <div className="p-4 border-t border-white/20">
                <h3 className="font-semibold text-gray-800 mb-1">Ward {mapData.ward.ward_number}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span>{mapData.gpsPoints.length} GPS points</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {mapData.ward.area_sq_km ? `${mapData.ward.area_sq_km} sq km` : 'Area unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        {selectedWard && (
          <div className="glass-card-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ward {selectedWard.ward_number} - Detailed View</h2>
              <button
                onClick={() => setSelectedWard(null)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Full Map */}
            <div className="h-96 rounded-lg overflow-hidden mb-6">
              {isMapReady && (
                <MapContainer
                  center={[20.5937, 78.9629]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />

                  {/* GPS Trails */}
                  {miniMaps
                    .find((m) => m.ward.id === selectedWard.id)
                    ?.gpsPoints.map((point, idx) => {
                      if (point.location && 'coordinates' in point.location) {
                        const coords = point.location.coordinates;
                        return (
                          <Marker key={idx} position={[coords[1], coords[0]]}>
                            <Popup>
                              <div className="text-sm">
                                <p className="font-semibold">GPS Point {idx + 1}</p>
                                <p>Accuracy: {point.accuracy}m</p>
                                <p>Speed: {point.speed || 0} m/s</p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      }
                      return null;
                    })}

                  {/* Trail Line */}
                  {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsPoints.length ?? 0 > 1 && (
                    <Polyline
                      positions={
                        miniMaps
                          .find((m) => m.ward.id === selectedWard.id)
                          ?.gpsPoints.map((p) => {
                            if (p.location && 'coordinates' in p.location) {
                              const coords = p.location.coordinates;
                              return [coords[1], coords[0]] as [number, number];
                            }
                            return null;
                          })
                          .filter(Boolean) as [number, number][]
                      }
                      color="#0ea5e9"
                      weight={3}
                      opacity={0.8}
                    />
                  )}
                </MapContainer>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-sky-600">
                  {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsPoints.length || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">GPS Points</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {miniMaps.find((m) => m.ward.id === selectedWard.id)?.gpsTrails.length || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Active Trails</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{selectedWard.area_sq_km || '--'}</p>
                <p className="text-sm text-gray-600 mt-1">Area (sq km)</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">Live</p>
                <p className="text-sm text-gray-600 mt-1">Status</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
