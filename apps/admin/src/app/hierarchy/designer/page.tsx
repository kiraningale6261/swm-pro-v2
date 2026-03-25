'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Trash2, MapPin, Target, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// SSR Safe Imports
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function QRLocationSyncDesigner() {
  const [qrPoints, setQrPoints] = useState<any[]>([]); // QR Locations
  const [boundary, setBoundary] = useState<any[]>([]); // Ward Fence
  const [mode, setMode] = useState<'QR' | 'FENCE'>('QR');
  const [wardData, setWardData] = useState({ name: '', number: '' });

  // --- Click to Sync QR Location ---
  function MapInteraction() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          const newQR = { 
            id: Date.now(), 
            lat, 
            lng, 
            qr_id: `QR-${wardData.number || '0'}-${qrPoints.length + 1}` 
          };
          setQrPoints([...qrPoints, newQR]);
        } else {
          setBoundary([...boundary, [lat, lng]]);
        }
      },
    });
    return null;
  }

  const saveToSync = async () => {
    if (!wardData.name || qrPoints.length === 0) return toast.error("Data missing!");

    // 1. Create Ward Geofence
    const { data: ward } = await supabase.from('wards').insert({
      ward_name: wardData.name,
      ward_number: wardData.number,
      boundary_geojson: { type: 'Polygon', coordinates: [boundary] }
    }).select().single();

    if (ward) {
      // 2. Sync QR IDs with fixed GPS Coords [The WeVois Secret]
      const syncPoints = qrPoints.map(p => ({
        ward_id: ward.id,
        qr_id: p.qr_id,
        lat: p.lat,
        lng: p.lng,
        status: 'RED' // Default status
      }));

      const { error } = await supabase.from('qr_codes').insert(syncPoints);
      if (!error) toast.success(`${qrPoints.length} QR locations synced! 🚀`);
    }
  };

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden font-sans">
      
      {/* Left Control Panel: Solid WeVois Style */}
      <aside className="w-[450px] border-r border-slate-100 flex flex-col p-10 bg-white z-50 wevois-panel m-6 rounded-wevois-sm">
        <header className="mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase italic">Sync Designer</h2>
          <p className="text-sky-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">QR + Location Mapping</p>
        </header>

        <div className="space-y-6 mb-10">
          <input 
            placeholder="Ward Name" 
            className="w-full bg-slate-50 p-6 rounded-3xl font-bold outline-none border-2 border-transparent focus:border-slate-900 transition-all"
            onChange={e => setWardData({...wardData, name: e.target.value})}
          />
          <input 
            placeholder="Ward ID / No." 
            className="w-full bg-slate-50 p-6 rounded-3xl font-bold outline-none border-2 border-transparent focus:border-slate-900 transition-all"
            onChange={e => setWardData({...wardData, number: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <button 
            onClick={() => setMode('QR')}
            className={`flex flex-col items-center gap-3 p-8 rounded-[2.5rem] transition-all ${mode === 'QR' ? 'bg-slate-900 text-white shadow-2xl' : 'bg-slate-50 text-slate-400'}`}
          >
            <QrCode className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase">Sync QR</span>
          </button>
          <button 
            onClick={() => setMode('FENCE')}
            className={`flex flex-col items-center gap-3 p-8 rounded-[2.5rem] transition-all ${mode === 'FENCE' ? 'bg-slate-900 text-white shadow-2xl' : 'bg-slate-50 text-slate-400'}`}
          >
            <Target className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase">Draw Fence</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">Mapped Points ({qrPoints.length})</p>
          {qrPoints.map((p, idx) => (
            <div key={p.id} className="bg-slate-50 p-5 rounded-3xl flex justify-between items-center group">
              <div>
                <p className="text-[10px] font-black text-slate-900">{p.qr_id}</p>
                <p className="text-[9px] text-slate-400 font-bold">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>
              </div>
              <button onClick={() => setQrPoints(qrPoints.filter(q => q.id !== p.id))}><Trash2 className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 transition-all" /></button>
            </div>
          ))}
        </div>

        <button 
          onClick={saveToSync}
          className="mt-8 bg-emerald-500 text-white p-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-100"
        >
          <Save className="w-5 h-5" /> Deploy Ward Sync
        </button>
      </aside>

      {/* Main Designer Map */}
      <main className="flex-1 relative">
        <MapContainer center={[16.6912, 74.4962]} zoom={18} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
          <MapInteraction />

          {/* Draw Ward Boundary */}
          {boundary.length > 0 && (
            <Polygon positions={boundary} pathOptions={{ color: '#0F172A', fillColor: '#0F172A', fillOpacity: 0.1, weight: 3 }} />
          )}

          {/* QR Locations with Sync Labels */}
          {qrPoints.map((p, i) => (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <div className="flex flex-col items-center">
                 <div className="bg-slate-900 text-white w-7 h-7 flex items-center justify-center rounded-full text-[9px] font-black border-2 border-white shadow-xl">
                   {i + 1}
                 </div>
              </div>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Floating Indicator */}
        <div className="absolute top-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest z-[1000] shadow-2xl italic">
          Mode: {mode === 'QR' ? 'Drop QR Sync Points' : 'Drawing Ward Fence'}
        </div>
      </main>
    </div>
  );
}
