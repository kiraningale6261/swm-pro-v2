'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Loader2, AlertCircle, MapPin, CheckCircle, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as QRCodeLib from 'qrcode';

// --- SSR Safe Map Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export default function QRManagerPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code_type: 'task_point' as 'ward' | 'task_point' | 'checkpoint' | 'depot',
    latitude: 16.6912, // Default Shirol
    longitude: 74.4962,
  });

  // --- 1. Fetch QR Points with Status Logic ---
  const { data: qrCodes = [], isLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: async () => {
      const data = await supabaseAdmin.getQRCodes();
      return data || [];
    },
  });

  // --- 2. QR Status Logic (12-Hour Reset) ---
  const getQRStatus = (qr: any) => {
    if (!qr.last_scanned_at) return 'red';
    const lastScan = new Date(qr.last_scanned_at).getTime();
    const now = new Date().getTime();
    const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);
    
    // Agar 12 ghante se upar ho gaye toh wapas Red (Pending)
    return hoursSinceLastScan > 12 ? 'red' : 'green';
  };

  // --- 3. Create QR Mutation ---
  const createQRMutation = useMutation({
    mutationFn: async () => {
      const codeValue = `SWM-${Date.now()}`;
      const newQRCode = {
        code_value: codeValue,
        code_type: formData.code_type,
        location: {
          type: 'Point',
          coordinates: [formData.longitude, formData.latitude],
        },
        is_active: true,
        // Default radius fix for 5-meter verification
        metadata: { radius_meter: 5 } 
      };
      return await supabaseAdmin.createQRCode(newQRCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR Point Registered on Map');
      setIsModalOpen(false);
    }
  });

  const downloadQR = async (value: string) => {
    const url = await QRCodeLib.toDataURL(value);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${value}.png`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header - iPhone Style */}
      <header className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800">QR Manager</h1>
          <p className="text-amber-500 font-bold text-[10px] uppercase tracking-widest mt-2">Module 1: Door-to-Door IoT</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Collection Point
        </button>
      </header>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black uppercase text-slate-400">Total Points</p>
           <h2 className="text-2xl font-black italic">{qrCodes.length}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black uppercase text-rose-400">Pending (Red)</p>
           <h2 className="text-2xl font-black italic">{qrCodes.filter(q => getQRStatus(q) === 'red').length}</h2>
        </div>
      </div>

      {/* --- Live QR Map --- */}
      <div className="h-[500px] mx-4 rounded-[4rem] overflow-hidden border-[12px] border-white shadow-2xl z-0">
        <MapContainer center={[16.6912, 74.4962]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {qrCodes.map((qr: any) => {
            const status = getQRStatus(qr);
            return (
              <Marker key={qr.id} position={[qr.location.coordinates[1], qr.location.coordinates[0]]}>
                <Popup>
                  <div className="p-2 text-center">
                    <p className="font-black uppercase text-[10px] mb-2">{qr.code_type}</p>
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${status === 'red' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <button onClick={() => downloadQR(qr.code_value)} className="bg-slate-900 text-white p-2 rounded-lg text-[8px] font-bold">Download QR</button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* --- Points Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-20">
        {qrCodes.map((qr: any) => (
          <div key={qr.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center group">
            <div className={`w-3 h-3 rounded-full self-end ${getQRStatus(qr) === 'red' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <div className="p-4 bg-slate-50 rounded-[2.5rem] mb-4 group-hover:border-sky-500 border-2 border-transparent transition-all">
               <QrCodeIcon value={qr.code_value} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-tighter italic">{qr.code_value}</h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1 tracking-widest uppercase">{qr.code_type}</p>
          </div>
        ))}
      </div>

      {/* Create Modal - iPhone Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative">
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">Register New Point</h2>
            <div className="space-y-4">
               <select className="w-full p-6 bg-slate-50 rounded-3xl font-bold outline-none" value={formData.code_type} onChange={e => setFormData({...formData, code_type: e.target.value as any})}>
                  <option value="task_point">Household (Door-to-Door)</option>
                  <option value="depot">Kachra Depot</option>
                  <option value="checkpoint">Sweeping Checkpoint</option>
               </select>
               <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Lat" type="number" step="any" className="p-6 bg-slate-50 rounded-3xl font-bold outline-none" value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
                  <input placeholder="Lng" type="number" step="any" className="p-6 bg-slate-50 rounded-3xl font-bold outline-none" value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
               </div>
               <button onClick={() => createQRMutation.mutate()} className="w-full bg-sky-500 text-white p-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl mt-6">Generate IoT Point</button>
               <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Helper for QR Preview
function QrCodeIcon({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCodeLib.toDataURL(value).then(setSrc);
  }, [value]);
  return src ? <img src={src} className="w-20 h-20" alt="qr" /> : <Loader2 className="animate-spin" />;
}
