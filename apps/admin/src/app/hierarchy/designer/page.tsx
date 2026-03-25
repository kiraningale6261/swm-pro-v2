'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Trash2, Target, Loader2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function WardDesigner() {
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

  function MapInteraction() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          setQrPoints(prev => [...prev, { id: Date.now(), lat, lng }]);
          setLogs(prev => [`Point synced at ${lat.toFixed(4)}`, ...prev].slice(0, 5));
        } else {
          setBoundary(prev => [...prev, [lat, lng]]);
          setLogs(prev => [`Boundary node added`, ...prev].slice(0, 5));
        }
      },
    });
    return null;
  }

  // Glowing Blue Icon for Dark Map
  const createIcon = (num: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background:#0ea5e9;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-weight:900;font-size:10px;box-shadow:0 0 15px rgba(14,165,233,0.6)">${num}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const handleSave = async () => {
    if (!wardData.name) return toast.error("Ward Name daalo bhai!");
    setIsSaving(true);
    setLogs(prev => ["Connecting to Database...", ...prev]);

    try {
      const { data: ward, error: wErr } = await supabase.from('wards').insert({
        ward_name: wardData.name,
        ward_number: wardData.number,
        boundary_geojson: { type: 'Polygon', coordinates: [boundary.length > 0 ? [...boundary, boundary[0]] : []] }
      }).select().single();

      if (wErr) throw wErr;

      const syncPoints = qrPoints.map((p, i) => ({
        ward_id: ward.id,
        qr_id: `QR-${wardData.number || '0'}-${i + 1}`,
        lat: p.lat,
        lng: p.lng
      }));

      const { error: pErr } = await supabase.from('qr_codes').insert(syncPoints);
      if (pErr) throw pErr;

      toast.success("Ward & QR Locations Synced! 🚀");
      setLogs(prev => ["✔ Data Saved Successfully", ...prev]);
      setQrPoints([]); setBoundary([]);
    } catch (e: any) {
      toast.error(`Save Failed: ${e.message}`);
      setLogs(prev => [`✘ Error: ${e.message}`, ...prev]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden">
      <aside className="w-[420px] bg-white border-r border-slate-100 m-6 rounded-[3.5rem] p-10 flex flex-col gap-8 z-50 shadow-2xl overflow-y-auto">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Designer</h2>
          <p className="text-sky-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Micro-Mapping Mode</p>
        </div>

        <div className="space-y-4">
          <input placeholder="Ward Name" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none" onChange={e => setWardData({...wardData, name: e.target.value})} />
          <input placeholder="Ward No." className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none" onChange={e => setWardData({...wardData, number: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMode('QR')} className={`p-6 rounded-[2rem] transition-all flex flex-col items-center gap-2 ${mode === 'QR' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}>
            <QrCode className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Sync QR</span>
          </button>
          <button onClick={() => setMode('FENCE')} className={`p-6 rounded-[2rem] transition-all flex flex-col items-center gap-2 ${mode === 'FENCE' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}>
            <Target className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Draw Fence</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 font-mono text-[10px] shadow-inner min-h-[120px]">
           <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 uppercase font-black text-slate-500"><Terminal className="w-3 h-3" /> Live Sync Console</div>
           {logs.map((log, i) => <p key={i} className="mb-1 text-emerald-400 italic">{`> ${log}`}</p>)}
        </div>

        <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white p-8 rounded-[2.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} Deploy Ward Sync
        </button>
      </aside>

      <main className="flex-1 relative">
        <MapContainer center={[16.6780, 74.5564]} zoom={17} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
          <MapInteraction />
          {boundary.length > 0 && <Polygon positions={boundary} pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.1, weight: 3 }} />}
          {qrPoints.map((p, i) => L && <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />)}
        </MapContainer>
        <div className="absolute top-10 right-10 bg-slate-900 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase z-[1000] italic">
          Active Mode: {mode}
        </div>
      </main>
    </div>
  );
}
