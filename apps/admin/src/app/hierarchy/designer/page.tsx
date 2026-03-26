'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Target, Loader2, Terminal, Map as MapIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Leaflet ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function WardDesignerFinal() {
  const [L, setL] = useState<any>(null);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any[]>([]);
  const [mode, setMode] = useState<'QR' | 'FENCE'>('QR');
  const [wardData, setWardData] = useState({ name: '', number: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      // Leaflet Default Icon Fix (Important for deployment)
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  // --- Click Logic ---
  function MapEvents() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          setQrPoints((prev) => [...prev, { id: Date.now(), lat, lng }]);
          setLogs((prev) => [`Point Added: ${lat.toFixed(5)}`, ...prev].slice(0, 5));
        } else {
          setBoundary((prev) => [...prev, [lat, lng]]);
          setLogs((prev) => [`Fence Node Added`, ...prev].slice(0, 5));
        }
      },
    });
    return null;
  }

  const createIcon = (num: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background:#0ea5e9;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-weight:900;font-size:10px;box-shadow:0 0 15px #0ea5e9">${num}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  const handleSave = async () => {
    if (!wardData.number || qrPoints.length === 0) return toast.error("Bhai, Details dalo!");
    setIsSaving(true);
    try {
      const { data: ward, error: wErr } = await supabase.from('wards').upsert({
        ward_number: wardData.number,
        ward_name: wardData.name || `Ward ${wardData.number}`,
        boundary_geojson: { type: 'Polygon', coordinates: [boundary.length > 0 ? [...boundary, boundary[0]] : []] }
      }, { onConflict: 'ward_number' }).select().single();

      if (wErr) throw wErr;

      const syncPoints = qrPoints.map((p, i) => ({
        ward_id: ward.id,
        qr_id: `QR-${wardData.number}-${i + 1}`,
        lat: p.lat,
        lng: p.lng
      }));

      const { error: pErr } = await supabase.from('qr_codes').insert(syncPoints);
      if (pErr) throw pErr;

      toast.success("Ward Deployed! 🚀");
      setQrPoints([]); setBoundary([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden relative">
      
      {/* Sidebar UI */}
      <aside className="w-[400px] bg-white m-6 rounded-[3rem] p-8 flex flex-col gap-6 z-[2000] shadow-2xl overflow-y-auto">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ward Designer</h2>
        
        <div className="space-y-3">
          <input placeholder="Ward Number (e.g. 01)" className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none ring-sky-500 focus:ring-2 transition-all" onChange={e => setWardData({...wardData, number: e.target.value})} />
          <input placeholder="Ward Name" className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none ring-sky-500 focus:ring-2 transition-all" onChange={e => setWardData({...wardData, name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('QR')} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${mode === 'QR' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>
            <QrCode className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Sync QR</span>
          </button>
          <button onClick={() => setMode('FENCE')} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${mode === 'FENCE' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>
            <Target className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Boundary</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 font-mono text-[10px] text-emerald-400 min-h-[100px] border border-slate-800">
           {logs.map((log, i) => <p key={i}>{`> ${log}`}</p>)}
        </div>

        <button onClick={handleSave} disabled={isSaving} className="bg-sky-500 text-white p-7 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
          {isSaving ? <Loader2 className="animate-spin" /> : "Deploy Ward Sync"}
        </button>
      </aside>

      {/* Main Map - Fixed Interaction */}
      <main className="flex-1 relative z-0">
        <MapContainer 
          center={[16.6780, 74.5564]} 
          zoom={17} 
          zoomControl={false} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          <MapEvents />
          
          {boundary.length > 0 && (
            <Polygon positions={boundary} pathOptions={{ color: '#0ea5e9', weight: 3, fillOpacity: 0.1 }} />
          )}
          
          {qrPoints.map((p, i) => L && (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />
          ))}
        </MapContainer>
        <div className="absolute top-10 right-10 bg-slate-900/80 backdrop-blur-md text-white px-8 py-3 rounded-full text-[10px] font-black uppercase z-[1000] border border-white/20">
          Click Map to {mode}
        </div>
      </main>
    </div>
  );
}
