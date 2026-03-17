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
  const mapRef = useRef(null);

  // Fetch workers with latest GPS location
  const { data: workersData = [] } = useQuery({
    queryKey: ['workers-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            name,
            mobile,
            gps_points(latitude, longitude, created_at)
          `)
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
  const { data: vehiclesData = [] } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select(`
            id,
            registration,
            gps_points(latitude, longitude, created_at)
          `)
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
  const { data: qrPointsData = [] } = useQuery({
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
            status: point.status || 'pending',
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
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-6 m-6 mb-0 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">City Command Center</h1>
              <p className="text-sm text-gray-600">GPS Live Tracking & QR Points</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white/50 px-3 py-1.5 rounded-lg border border-sky-100">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded text-sky-500"
              />
              <span className="text-sm font-semibold text-gray-700">Auto-Sync</span>
            </label>
            <button className="p-2 bg-sky-500 rounded-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-100">
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/50 p-3 rounded-xl border border-white/50 text-center shadow-sm">
            <p className="text-xl font-bold text-sky-600">{workers.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
              <Users className="w-3 h-3" /> Workers
            </p>
          </div>
          <div className="bg-white/50 p-3 rounded-xl border border-white/50 text-center shadow-sm">
            <p className="text-xl font-bold text-blue-600">{vehicles.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
              <Truck className="w-3 h-3" /> Vehicles
            </p>
          </div>
          <div className="bg-white/50 p-3 rounded-xl border border-white/50 text-center shadow-sm">
            <p className="text-xl font-bold text-green-600">{qrPoints.filter((p) => p.status === 'scanned').length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> Scanned
            </p>
          </div>
          <div className="bg-white/50 p-3 rounded-xl border border-white/50 text-center shadow-sm">
            <p className="text-xl font-bold text-red-600">{qrPoints.filter((p) => p.status === 'pending').length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Pending
            </p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 m-6 mt-4 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 relative">
        {typeof window !== 'undefined' && (
          <MapContainer 
            {...({ 
              center: defaultCenter, 
              zoom: 5, 
              style: { height: '100%', width: '100%' }, 
              ref: mapRef 
            } as any)}
          >
            <TileLayer
              {...({
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                attribution: '&copy; OpenStreetMap'
              } as any)}
            />

            {/* Worker Markers */}
            {workers.map((worker) => (
              <Marker key={`worker-${worker.id}`} position={[worker.latitude, worker.longitude]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-gray-800">{worker.name}</p>
                    <p className="text-xs text-gray-500">{worker.mobile}</p>
                    <p className="text-[10px] text-sky-600 font-bold mt-2">Active: {formatTime(worker.last_update)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Vehicle Markers */}
            {vehicles.map((vehicle) => (
              <Marker key={`vehicle-${vehicle.id}`} position={[vehicle.latitude, vehicle.longitude]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-gray-800">{vehicle.registration}</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">GPS: {formatTime(vehicle.last_update)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* QR Point Markers */}
            {qrPoints.map((point) => (
              <React.Fragment key={`qr-${point.id}`}>
                {/* FIX: Circle props bypass using as any */}
                <Circle
                  {...({
                    center: [point.latitude, point.longitude],
                    radius: 5,
                    pathOptions: {
                      color: point.status === 'scanned' ? '#22c55e' : '#ef4444',
                      fillColor: point.status === 'scanned' ? '#22c55e' : '#ef4444',
                      fillOpacity: 0.2,
                      weight: 1,
                    }
                  } as any)}
                />
                <Marker position={[point.latitude, point.longitude]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-gray-800 text-xs">{point.code_value}</p>
                      <div className={`mt-2 text-[10px] font-bold py-1 px-2 rounded-full inline-block ${point.status === 'scanned' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {point.status.toUpperCase()}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 italic">{formatTime(point.created_at)}</p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-4 m-6 mt-0 border border-white/20">
        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm" />
            <span className="text-gray-600">Worker</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
            <span className="text-gray-700">Vehicle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
            <span className="text-gray-700">QR Scanned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
            <span className="text-gray-700">QR Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
                                                               }
