'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MapPin, Truck, Users, AlertCircle, RefreshCw } from 'lucide-react';

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((mod) => mod.Circle), { ssr: false });

interface Worker {
  id: number;
  name: string;
  mobile: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

interface Vehicle {
  id: number;
  registration: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

interface QRPoint {
  id: number;
  code_value: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'scanned';
  created_at: string;
}

export default function CityMapPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [qrPoints, setQRPoints] = useState<QRPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<{ type: string; id: number } | null>(null);
  const mapRef = useRef(null);

  // Fetch workers with latest GPS location
  const { data: workersData = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(
            `
            id,
            name,
            mobile,
            gps_points(latitude, longitude, created_at)
          `
          )
          .eq('role', 'worker')
          .order('created_at', { foreignTable: 'gps_points', ascending: false });

        if (error) throw error;

        return (data || [])
          .map((worker: any) => ({
            id: worker.id,
            name: worker.name,
            mobile: worker.mobile,
            latitude: worker.gps_points?.[0]?.latitude || 0,
            longitude: worker.gps_points?.[0]?.longitude || 0,
            last_update: worker.gps_points?.[0]?.created_at || '',
          }))
          .filter((w) => w.latitude !== 0 && w.longitude !== 0);
      } catch (error) {
        console.error('Error fetching workers:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch vehicles with latest GPS location
  const { data: vehiclesData = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select(
            `
            id,
            registration,
            gps_points(latitude, longitude, created_at)
          `
          )
          .order('created_at', { foreignTable: 'gps_points', ascending: false });

        if (error) throw error;

        return (data || [])
          .map((vehicle: any) => ({
            id: vehicle.id,
            registration: vehicle.registration,
            latitude: vehicle.gps_points?.[0]?.latitude || 0,
            longitude: vehicle.gps_points?.[0]?.longitude || 0,
            last_update: vehicle.gps_points?.[0]?.created_at || '',
          }))
          .filter((v) => v.latitude !== 0 && v.longitude !== 0);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch QR points
  const { data: qrPointsData = [], isLoading: qrPointsLoading } = useQuery({
    queryKey: ['qr-points-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || [])
          .map((point: any) => ({
            id: point.id,
            code_value: point.code_value,
            latitude: point.location?.coordinates?.[1] || 0,
            longitude: point.location?.coordinates?.[0] || 0,
            status: point.status,
            created_at: point.created_at,
          }))
          .filter((p) => p.latitude !== 0 && p.longitude !== 0);
      } catch (error) {
        console.error('Error fetching QR points:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    setWorkers(workersData);
    setVehicles(vehiclesData);
    setQRPoints(qrPointsData);
  }, [workersData, vehiclesData, qrPointsData]);

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-sky-50 to-blue-50">
      {/* Header */}
      <div className="glass-card-lg p-4 md:p-6 m-4 md:m-6 mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-sky-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">City Command Center</h1>
              <p className="text-sm text-gray-600">Real-time GPS tracking and QR point management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Live</span>
            </label>
            <button className="glass-card p-2 hover:bg-white/40 transition-all">
              <RefreshCw className="w-5 h-5 text-sky-600" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-sky-600">{workers.length}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <Users className="w-3 h-3" /> Workers
            </p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{vehicles.length}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <Truck className="w-3 h-3" /> Vehicles
            </p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-green-600">{qrPoints.filter((p) => p.status === 'scanned').length}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> Scanned
            </p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-red-600">{qrPoints.filter((p) => p.status === 'pending').length}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Pending
            </p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 m-4 md:m-6 mt-2 rounded-lg overflow-hidden glass-card">
        {typeof window !== 'undefined' && (
          <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%' }} ref={mapRef}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Worker Markers */}
            {workers.map((worker) => (
              <Marker
                key={`worker-${worker.id}`}
                position={[worker.latitude, worker.longitude]}
                eventHandlers={{
                  click: () => setSelectedMarker({ type: 'worker', id: worker.id }),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">{worker.name}</p>
                    <p className="text-gray-600">{worker.mobile}</p>
                    <p className="text-xs text-gray-500 mt-1">Last: {formatTime(worker.last_update)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Vehicle Markers */}
            {vehicles.map((vehicle) => (
              <Marker
                key={`vehicle-${vehicle.id}`}
                position={[vehicle.latitude, vehicle.longitude]}
                eventHandlers={{
                  click: () => setSelectedMarker({ type: 'vehicle', id: vehicle.id }),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">{vehicle.registration}</p>
                    <p className="text-xs text-gray-500 mt-1">Last: {formatTime(vehicle.last_update)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* QR Point Markers */}
            {qrPoints.map((point) => (
              <React.Fragment key={`qr-${point.id}`}>
                {/* 5m Proximity Circle */}
                <Circle
                  center={[point.latitude, point.longitude]}
                  radius={5}
                  pathOptions={{
                    color: point.status === 'scanned' ? '#22c55e' : '#ef4444',
                    fillColor: point.status === 'scanned' ? '#22c55e' : '#ef4444',
                    fillOpacity: 0.1,
                    weight: 1,
                  }}
                />

                {/* QR Point Marker */}
                <Marker
                  position={[point.latitude, point.longitude]}
                  eventHandlers={{
                    click: () => setSelectedMarker({ type: 'qr', id: point.id }),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-gray-800">{point.code_value}</p>
                      <p className={`text-xs font-semibold ${point.status === 'scanned' ? 'text-green-600' : 'text-red-600'}`}>
                        Status: {point.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Created: {formatTime(point.created_at)}</p>
                      <p className="text-xs text-gray-500">
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="glass-card-lg p-4 md:p-6 m-4 md:m-6 mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-gray-700">Worker Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-700">Vehicle Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-700">QR Scanned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700">QR Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
