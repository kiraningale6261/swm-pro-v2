'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Target, Loader2, Terminal, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// SSR Safe Components
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function WardDesignerFinalFix() {
  const [L, setL] = useState<any>(null);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any[]>([]);
  const [mode, setMode] = useState<'QR' | 'FENCE'>('QR');
  const [wardData, setWardData] = useState({ name: '', number: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  // --- MAP CLICK HANDLER (Fixed Interaction) ---
  function MapInteraction() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          setQrPoints((prev) => [...prev, { id: Date.now(), lat, lng }]);
          setLogs((prev) => [`Point added: ${lat.toFixed(4)}`, ...prev].slice(0, 5));
        } else {
          setBoundary((prev) => [...prev, [lat, lng]]);
          setLogs((prev) => [`Fence node added`, ...prev].slice(0, 5));
        }
      },
    });
    return null;
  }

  const createIcon = (num: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background:#0ea5e9;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-weight:900;font-size:10px;box-shadow:0 0 15px #0ea5e9">${num}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
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
        lng: p.lng,
        status: 'RED'
      }));

      const { error: pErr } = await supabase.from('qr_codes').insert(syncPoints);
      if (pErr) throw pErr;

      toast.success(`Ward ${wardData.number} Saved! 🚀`);
      setQrPoints([]); setBoundary([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0F1A] overflow-hidden">
      
      {/* SIDEBAR - Fixed Width taaki Map block na ho */}
      <aside className="w-[450px] bg-white border-r border-slate-100 flex flex-col p-8 z-[100] h-full overflow-y-auto shrink-0 shadow-2xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 p-3 rounded-2xl text-white"><MapIcon className="w-6" /></div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Designer</h2>
            <p className="text-sky-500 text-[10px] font-black uppercase tracking-widest mt-1">Micro-Mapping Mode</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <input 
            placeholder="Ward No. (e.g. 01)" 
            className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none focus:ring-2 ring-sky-500 transition-all text-sm" 
            onChange={e => setWardData({...wardData, number: e.target.value})} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => setMode('QR')} className={`p-6 rounded-[2.5rem] flex flex-col items-center gap-2 transition-all ${mode === 'QR' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
            <QrCode className="w-6 h-6" /> <span className="text-[10px] font-black uppercase tracking-widest">Plot QR</span>
          </button>
          <button onClick={() => setMode('FENCE')} className={`p-6 rounded-[2.5rem] flex flex-col items-center gap-2 transition-all ${mode === 'FENCE' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
            <Target className="w-6 h-6" /> <span className="text-[10px] font-black uppercase tracking-widest">Fence</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-6 font-mono text-[10px] text-emerald-400 min-h-[140px] shadow-inner mb-8">
           <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 uppercase font-black text-slate-500 tracking-widest"><Terminal className="w-3 h-3" /> Console</div>
           {logs.map((l, i) => <p key={i} className="animate-in fade-in slide-in-from-left">{`> ${l}`}</p>)}
        </div>

        <button onClick={handleSave} disabled={isSaving} className="bg-sky-500 text-white p-8 rounded-[3rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 active:scale-95 transition-all mt-auto flex items-center justify-center gap-3">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} {isSaving ? "Saving..." : "Deploy Ward"}
        </button>
      </aside>

      {/* MAP - Interaction Area */}
      <main className="flex-1 relative z-10 cursor-crosshair">
        <MapContainer 
          center={[16.6780, 74.5564]} 
          zoom={17} 
          zoomControl={false} 
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          <MapInteraction />
          
          {boundary.length > 0 && (
            <Polygon positions={boundary} pathOptions={{ color: '#0ea5e9', weight: 3, fillOpacity: 0.1, dashArray: '10, 10' }} />
          )}
          
          {qrPoints.map((p, i) => L && (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />
          ))}
        </MapContainer>
        
        <div className="absolute top-10 right-10 bg-slate-900/80 backdrop-blur-md text-white px-8 py-3 rounded-full text-[10px] font-black uppercase z-[1000] border border-white/10 shadow-2xl animate-pulse">
          Click Map to {mode === 'QR' ? 'Drop Sync Point' : 'Add Boundary node'}
        </div>
      </main>
    </div>
  );
}
