'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { QRCode, QRScan } from '@swm-pro/shared';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Loader2, AlertCircle, MapPin, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import QRCode as QRCodeLib from 'qrcode';

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
        <div className="glass-card-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">QR Code Manager</h1>
          <p className="text-gray-600">Create and track QR codes with red-to-green status transitions</p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="glass-button flex items-center gap-2 bg-sky-500 text-white hover:bg-sky-600 px-6 py-3"
          >
            <Plus className="w-5 h-5" />
            Create QR Code
          </button>
        </div>

        {/* QR Codes Grid */}
        {isLoading ? (
          <div className="glass-card p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No QR codes created yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {qrCodes.map((qr) => {
              const status = getQRStatus(qr);
              const scanCount = qr.scans?.length || 0;

              return (
                <div key={qr.id} className="glass-card overflow-hidden">
                  {/* QR Code Image */}
                  <div className="bg-white/50 p-4 flex items-center justify-center h-48">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">QR Code</p>
                      <div className="bg-white p-2 rounded inline-block">
                        <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">QR Image</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Info */}
                  <div className="p-6 border-t border-white/20">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm mb-1">
                          {qr.code_value.substring(0, 20)}...
                        </h3>
                        <p className="text-xs text-gray-600">Type: {qr.code_type}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border ${getStatusColor(status)}`}
                      >
                        {getStatusIcon(status)}
                        {status.toUpperCase()}
                      </span>
                    </div>

                    {/* Scans Info */}
                    <div className="mb-4 p-3 bg-white/30 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700">Scans: {scanCount}</p>
                      <div className="w-full bg-white/50 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full transition-all"
                          style={{ width: `${Math.min((scanCount / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {qr.location && 'coordinates' in qr.location
                          ? `${qr.location.coordinates[1].toFixed(4)}, ${qr.location.coordinates[0].toFixed(4)}`
                          : 'No location'}
                      </span>
                    </div>

                    {/* Active Status */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={qr.is_active}
                          onChange={() =>
                            toggleStatusMutation.mutate({
                              id: qr.id,
                              is_active: qr.is_active,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => deleteQRMutation.mutate(qr.id)}
                      className="w-full glass-button text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map View */}
        <div className="glass-card-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">QR Codes on Map</h2>
          <div className="h-96 rounded-lg overflow-hidden">
            {isMapReady && (
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                onClick={handleMapClick}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {qrCodes.map((qr) => {
                  if (qr.location && 'coordinates' in qr.location) {
                    const coords = qr.location.coordinates;
                    const status = getQRStatus(qr);

                    return (
                      <Marker key={qr.id} position={[coords[1], coords[0]]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold mb-2">{qr.code_type}</p>
                            <p className="text-xs mb-2">{qr.code_value.substring(0, 20)}...</p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(status)}`}
                            >
                              {status.toUpperCase()} ({qr.scans?.length || 0} scans)
                            </span>
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
        <div className="modal-overlay flex items-center justify-center z-50">
          <div className="modal-content w-full max-w-2xl mx-4 p-8 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create QR Code</h2>

            <div className="space-y-4 mb-6">
              <div className="form-group">
                <label className="form-label">QR Code Type</label>
                <select
                  value={formData.code_type}
                  onChange={(e) =>
                    setFormData({ ...formData, code_type: e.target.value as any })
                  }
                  className="glass-input w-full"
                >
                  <option value="task_point">Task Point</option>
                  <option value="checkpoint">Checkpoint</option>
                  <option value="ward">Ward</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                    }
                    step="0.0001"
                    className="glass-input w-full"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                    }
                    step="0.0001"
                    className="glass-input w-full"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600">Or click on the map to select location</p>
            </div>

            {/* Mini Map for Selection */}
            <div className="h-48 rounded-lg overflow-hidden mb-6">
              {isMapReady && (
                <MapContainer
                  center={[formData.latitude, formData.longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  onClick={handleMapClick}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {selectedLocation && (
                    <Marker position={selectedLocation}>
                      <Popup>Selected Location</Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => createQRMutation.mutate()}
                disabled={createQRMutation.isPending}
                className="flex-1 glass-button bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {createQRMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create QR Code'
                )}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setQRCodeImage('');
                }}
                className="flex-1 glass-button text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
