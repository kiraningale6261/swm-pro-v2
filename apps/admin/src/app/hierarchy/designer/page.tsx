'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Target, Loader2, Terminal, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR SAFE COMPONENTS ---
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
    import('leaflet').then((leaflet) => setL(leaflet));
  }, []);

  // --- FORCE CLICK COMPONENT ---
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        // Prevent event from bubbling
        if (L) {
          const { lat, lng } = e.latlng;
          if (mode === 'QR') {
            setQrPoints((prev) => [...prev, { id: Date.now(), lat, lng }]);
            setLogs((prev) => [`Point Added: ${lat.toFixed(4)}`, ...prev].slice(0, 5));
          } else {
            setBoundary((prev) => [...prev, [lat, lng]]);
            setLogs((prev) => [`Boundary Node Added`, ...prev].slice(0, 5));
          }
        }
      },
    });
    return null;
  }

  // Glowing Icon
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

      toast.success("Ward Deployed! 🚀");
      setQrPoints([]); setBoundary([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden relative">
      
      {/* SIDEBAR - z-index high rakha hai taaki button click ho */}
      <aside className="w-[400px] bg-white m-6 rounded-[3rem] p-8 flex flex-col gap-6 z-[9999] shadow-2xl overflow-y-auto">
        <h2 className="text-2xl font-black italic">Ward Designer</h2>
        
        <input placeholder="Ward No. (01)" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border-none outline-none" onChange={e => setWardData({...wardData, number: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('QR')} className={`p-6 rounded-3xl font-bold ${mode === 'QR' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Plot QR</button>
          <button onClick={() => setMode('FENCE')} className={`p-6 rounded-3xl font-bold ${mode === 'FENCE' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Fence</button>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 font-mono text-[10px] text-emerald-400 min-h-[100px]">
           {logs.map((l, i) => <p key={i}>{`> ${l}`}</p>)}
        </div>

        <button onClick={handleSave} disabled={isSaving} className="bg-sky-500 text-white p-6 rounded-[2rem] font-black uppercase text-xs">
          {isSaving ? "Saving..." : "Deploy Ward"}
        </button>
      </aside>

      {/* MAP - Main interaction area */}
      <main className="flex-1 relative z-0">
        <MapContainer 
          center={[16.6780, 74.5564]} 
          zoom={17} 
          zoomControl={false} 
          className="h-full w-full"
          style={{ cursor: 'crosshair' }} // Cursor badal diya taaki pata chale click area hai
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          <MapClickHandler />
          
          {boundary.length > 0 && (
            <Polygon positions={boundary} pathOptions={{ color: '#0ea5e9', weight: 3, fillOpacity: 0.1 }} />
          )}
          
          {qrPoints.map((p, i) => L && (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />
          ))}
        </MapContainer>
        
        {/* Helper Badge */}
        <div className="absolute top-10 right-10 bg-sky-500 text-white px-6 py-2 rounded-full text-[10px] font-black z-[5000]">
          CLICK ON MAP TO {mode}
        </div>
      </main>
    </div>
  );
}
