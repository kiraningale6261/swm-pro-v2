'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Target, Loader2, Terminal, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Leaflet Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function WeVoisWardDesigner() {
  const [L, setL] = useState<any>(null);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any[]>([]);
  const [mode, setMode] = useState<'QR' | 'FENCE'>('QR');
  const [wardData, setWardData] = useState({ name: '', number: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    import('leaflet').then((leaflet) => setL(leaflet));
  }, []);

  // --- Click to Plot Logic ---
  function MapInteraction() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          setQrPoints(prev => [...prev, { id: Date.now(), lat, lng }]);
          setLogs(prev => [`Sync Point: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, ...prev].slice(0, 5));
        } else {
          setBoundary(prev => [...prev, [lat, lng]]);
          setLogs(prev => [`Boundary node added`, ...prev].slice(0, 5));
        }
      },
    });
    return null;
  }

  // --- WeVois Style Glowing Icon ---
  const createIcon = (num: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background:#0ea5e9;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-weight:900;font-size:10px;box-shadow:0 0 15px rgba(14,165,233,0.7)">${num}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  // --- Save to Supabase ---
  const handleSave = async () => {
    if (!wardData.number) return toast.error("Bhai, Ward Number (e.g. 01) likho!");
    if (qrPoints.length === 0) return toast.error("Map par points plot karo!");
    
    setIsSaving(true);
    setLogs(prev => ["Connecting to War-Room Database...", ...prev]);

    try {
      // 1. Save or Update Ward
      const { data: ward, error: wErr } = await supabase.from('wards').upsert({
        ward_number: wardData.number,
        ward_name: wardData.name || `Ward ${wardData.number}`,
        boundary_geojson: { type: 'Polygon', coordinates: [boundary.length > 0 ? [...boundary, boundary[0]] : []] }
      }, { onConflict: 'ward_number' }).select().single();

      if (wErr) throw wErr;

      // 2. Clear old points and Save new QR Sync Points
      const syncPoints = qrPoints.map((p, i) => ({
        ward_id: ward.id,
        qr_id: `QR-${wardData.number}-${i + 1}`,
        lat: p.lat,
        lng: p.lng,
        status: 'RED'
      }));

      const { error: pErr } = await supabase.from('qr_codes').insert(syncPoints);
      if (pErr) throw pErr;

      toast.success(`Ward ${wardData.number} Deployed Successfully! 🚀`);
      setLogs(prev => [`✔ Ward ${wardData.number} Sync Complete`, ...prev]);
      
      // Cleanup
      setQrPoints([]);
      setBoundary([]);
    } catch (e: any) {
      toast.error(`Save Failed: ${e.message}`);
      setLogs(prev => [`✘ Error: ${e.message}`, ...prev]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden font-sans">
      
      {/* Sidebar Panel - WeVois Match */}
      <aside className="w-[420px] bg-white m-6 rounded-[3.5rem] p-10 flex flex-col gap-8 z-50 shadow-2xl overflow-y-auto">
        <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><MapIcon className="w-6 h-6" /></div>
            <div>
                <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-slate-900">Designer</h2>
                <p className="text-sky-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Micro-Mapping Mode</p>
            </div>
        </div>

        <div className="space-y-4">
          <input 
            placeholder="Ward Number (e.g. 01)" 
            className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none focus:ring-2 ring-sky-500 transition-all" 
            value={wardData.number} 
            onChange={e => setWardData({...wardData, number: e.target.value})} 
          />
          <input 
            placeholder="Ward Name (Optional)" 
            className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none focus:ring-2 ring-sky-500 transition-all" 
            value={wardData.name} 
            onChange={e => setWardData({...wardData, name: e.target.value})} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setMode('QR')} 
            className={`p-7 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 shadow-sm ${mode === 'QR' ? 'bg-slate-900 text-white scale-105 shadow-2xl' : 'bg-slate-50 text-slate-400'}`}
          >
            <QrCode className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Plot QR</span>
          </button>
          <button 
            onClick={() => setMode('FENCE')} 
            className={`p-7 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 shadow-sm ${mode === 'FENCE' ? 'bg-slate-900 text-white scale-105 shadow-2xl' : 'bg-slate-50 text-slate-400'}`}
          >
            <Target className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Boundary</span>
          </button>
        </div>

        {/* Debug Console */}
        <div className="bg-slate-900 rounded-[2.5rem] p-7 font-mono text-[10px] text-emerald-400 min-h-[140px] shadow-inner border border-slate-800">
           <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2 uppercase font-black text-slate-500 tracking-widest"><Terminal className="w-3 h-3" /> Sync Console</div>
           <div className="space-y-1">
            {logs.length === 0 && <p className="text-slate-700 italic">Waiting for interaction...</p>}
            {logs.map((log, i) => <p key={i} className="animate-in fade-in slide-in-from-left">{`> ${log}`}</p>)}
           </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-sky-500 text-white p-8 rounded-[3rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 shadow-xl shadow-sky-100 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} 
          {isSaving ? "Syncing..." : "Deploy Ward"}
        </button>
      </aside>

      {/* Main Dark Map View */}
      <main className="flex-1 relative">
        <MapContainer center={[16.6780, 74.5564]} zoom={17} zoomControl={false} className="h-full w-full">
          {/* WeVois Exact Dark Theme */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          <MapInteraction />
          
          {boundary.length > 0 && (
            <Polygon 
              positions={boundary} 
              pathOptions={{ color: '#0ea5e9', weight: 3, fillOpacity: 0.1, dashArray: '10, 10' }} 
            />
          )}
          
          {qrPoints.map((p, i) => L && (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />
          ))}
        </MapContainer>
        
        {/* Floating Mode Indicator */}
        <div className="absolute top-10 right-10 bg-slate-900/80 backdrop-blur-md text-white px-8 py-3 rounded-full text-[10px] font-black uppercase z-[1000] italic border border-white/10 shadow-2xl">
          Active Mode: {mode === 'QR' ? 'QR Plotting' : 'Boundary Draw'}
        </div>
      </main>
    </div>
  );
}
