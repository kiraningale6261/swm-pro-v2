'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { QRCode, QRScan } from '@swm-pro/shared';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Loader2, AlertCircle, MapPin, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import * as QRCodeLib from 'qrcode'; // FIX: Yahan 'as' ki jagah '* as' kar diya hai

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

interface QRCodeWithScans extends QRCode {
  scans?: QRScan[];
}

export default function QRManagerPage() {
  const queryClient = useQueryClient();
  const [qrCodes, setQRCodes] = useState<QRCodeWithScans[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [qrCodeImage, setQRCodeImage] = useState<string>('');

  const [formData, setFormData] = useState({
    code_type: 'task_point' as 'ward' | 'task_point' | 'checkpoint',
    latitude: 20.5937,
    longitude: 78.9629,
  });

  // Fetch QR Codes
  const { data: fetchedQRCodes = [], isLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getQRCodes();
        return data as QRCodeWithScans[];
      } catch (error) {
        console.error('Error fetching QR codes:', error);
        throw error;
      }
    },
  });

  useEffect(() => {
    setQRCodes(fetchedQRCodes);
    setIsMapReady(true);
  }, [fetchedQRCodes]);

  // Create QR Code Mutation
  const createQRMutation = useMutation({
    mutationFn: async () => {
      const codeValue = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Generate QR code image
      const qrImage = await QRCodeLib.toDataURL(codeValue);
      setQRCodeImage(qrImage);

      const newQRCode = {
        code_value: codeValue,
        code_type: formData.code_type,
        location: {
          type: 'Point' as const,
          coordinates: [formData.longitude, formData.latitude],
        },
        is_active: true,
      };

      const created = await supabaseAdmin.createQRCode(newQRCode);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR Code created successfully');
      setIsModalOpen(false);
      setFormData({
        code_type: 'task_point',
        latitude: 20.5937,
        longitude: 78.9629,
      });
      setQRCodeImage('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create QR code');
    },
  });

  // Delete QR Code Mutation
  const deleteQRMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabaseAdmin.supabase.from('qr_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR Code deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete QR code');
    },
  });

  // Toggle QR Code Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return await supabaseAdmin.updateQRCode(id, { is_active: !is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR Code status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update QR code');
    },
  });

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation([lat, lng]);
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng,
    });
  };

  const getQRStatus = (qr: QRCodeWithScans) => {
    const scanCount = qr.scans?.length || 0;
    if (scanCount === 0) return 'red';
    if (scanCount < 5) return 'yellow';
    return 'green';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'red':
        return <Clock className="w-4 h-4" />;
      case 'yellow':
        return <AlertCircle className="w-4 h-4" />;
      case 'green':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-8 mb-8 border border-white/20">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">QR Code Manager</h1>
          <p className="text-gray-600">Create and track QR codes with red-to-green status transitions</p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-sky-500 text-white hover:bg-sky-600 px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-sky-200"
          >
            <Plus className="w-5 h-5" />
            Create QR Code
          </button>
        </div>

        {/* QR Codes Grid */}
        {isLoading ? (
          <div className="bg-white/50 rounded-2xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="bg-white/50 rounded-2xl p-12 text-center border border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No QR codes created yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {qrCodes.map((qr) => {
              const status = getQRStatus(qr);
              const scanCount = qr.scans?.length || 0;

              return (
                <div key={qr.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all">
                  {/* QR Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm mb-1">
                          {qr.code_value.substring(0, 20)}...
                        </h3>
                        <p className="text-xs text-gray-600 uppercase tracking-wider">Type: {qr.code_type}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${getStatusColor(status)} shadow-sm`}
                      >
                        {getStatusIcon(status)}
                        {status.toUpperCase()}
                      </span>
                    </div>

                    {/* Scans Info */}
                    <div className="mb-4 p-4 bg-white/40 rounded-xl border border-white/50">
                      <div className="flex justify-between items-center mb-2">
                         <p className="text-sm font-bold text-gray-700">Scans: {scanCount}</p>
                         <span className="text-xs text-gray-500">Target: 10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min((scanCount / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-4 h-4 text-sky-500" />
                      <span>
                        {qr.location && 'coordinates' in qr.location
                          ? `${qr.location.coordinates[1].toFixed(4)}, ${qr.location.coordinates[0].toFixed(4)}`
                          : 'No location'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => deleteQRMutation.mutate(qr.id)}
                        className="flex-1 py-2 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: qr.id, is_active: qr.is_active })}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${qr.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map View */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Live QR Map</h2>
          <div className="h-[500px] rounded-xl overflow-hidden border-4 border-white/50 shadow-inner">
            {isMapReady && (
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />

                {qrCodes.map((qr) => {
                  if (qr.location && 'coordinates' in qr.location) {
                    const coords = qr.location.coordinates;
                    const status = getQRStatus(qr);

                    return (
                      <Marker key={qr.id} position={[coords[1], coords[0]]}>
                        <Popup>
                          <div className="p-1">
                            <p className="font-bold text-sky-600 mb-1 capitalize">{qr.code_type}</p>
                            <p className="text-[10px] text-gray-400 mb-2 truncate w-32">{qr.code_value}</p>
                            <div className={`text-[10px] font-bold py-1 px-2 rounded-full inline-block ${getStatusColor(status)}`}>
                              {status.toUpperCase()} ({scanCount} scans)
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
                })}
              </MapContainer>
            )}
          </div>
        </div>
      </div>

      {/* Create QR Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-sky-500 p-6">
              <h2 className="text-2xl font-bold text-white">New QR Registration</h2>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Point Category</label>
                <select
                  value={formData.code_type}
                  onChange={(e) => setFormData({ ...formData, code_type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="task_point">Task Point</option>
                  <option value="checkpoint">Checkpoint</option>
                  <option value="ward">Ward</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Lat</label>
                  <input
                    type="number"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Lng</label>
                  <input
                    type="number"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => createQRMutation.mutate()}
                  disabled={createQRMutation.isPending}
                  className="flex-1 bg-sky-500 text-white font-bold py-4 rounded-2xl hover:bg-sky-600 transition-all disabled:opacity-50 shadow-lg shadow-sky-100"
                >
                  {createQRMutation.isPending ? 'Processing...' : 'Generate & Save'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
