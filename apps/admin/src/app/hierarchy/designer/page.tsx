'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { QrCode, Save, Trash2, Target, Terminal, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// --- SSR Safe Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

export default function WardDesignerFix() {
  const [L, setL] = useState<any>(null);
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any[]>([]);
  const [mode, setMode] = useState<'QR' | 'FENCE'>('QR');
  const [wardData, setWardData] = useState({ name: '', number: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [debugLog, setDebugLog] = useState<{msg: string, type: 'info'|'success'|'error'}[]>([]);

  // 1. Leaflet Instance Load karna (Client Side Only)
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  const addLog = (msg: string, type: 'info'|'success'|'error' = 'info') => {
    setDebugLog(prev => [{ msg, type }, ...prev].slice(0, 5));
  };

  // 2. Click Interaction Logic
  function MapInteraction() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (mode === 'QR') {
          setQrPoints(prev => [...prev, { id: Date.now(), lat, lng, qr_id: `QR-${wardData.number || '0'}-${prev.length + 1}` }]);
          addLog(`Point dropped at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
        } else {
          setBoundary(prev => [...prev, [lat, lng]]);
          addLog(`Boundary point added`, 'info');
        }
      },
    });
    return null;
  }

  // 3. Save to Supabase (Real Logic)
  const saveToSync = async () => {
    if (!wardData.name || qrPoints.length === 0) return toast.error("Bhai, Ward Name aur points toh daalo!");
    setIsSaving(true);
    addLog("Connecting to Database...", 'info');

    try {
      // Step A: Ward Save
      const { data: ward, error: wErr } = await supabase.from('wards').insert({
        ward_name: wardData.name,
        ward_number: wardData.number,
        boundary_geojson: { type: 'Polygon', coordinates: [boundary.length > 0 ? [...boundary, boundary[0]] : []] }
      }).select().single();

      if (wErr) throw wErr;
      addLog("Ward created!", 'success');

      // Step B: Points Save
      const syncPoints = qrPoints.map(p => ({
        ward_id: ward.id,
        qr_id: p.qr_id,
        lat: p.lat,
        lng: p.lng
      }));

      const { error: pErr } = await supabase.from('qr_codes').insert(syncPoints);
      if (pErr) throw pErr;
      
      addLog(`${qrPoints.length} QR Points Synced!`, 'success');
      toast.success("Ready to Deploy! 🚀");
    } catch (err: any) {
      addLog(err.message, 'error');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Custom Dot Icon taaki Leaflet image error na de
  const createIcon = (num: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #0f172a; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 10px; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${num}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  return (
    <div className="h-screen w-full flex bg-slate-50 overflow-hidden font-sans">
      <aside className="w-96 wevois-panel m-6 rounded-wevois-sm p-8 z-50 flex flex-col gap-6 overflow-y-auto shrink-0">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sync Designer</h2>
          <p className="text-sky-500 text-[9px] font-black uppercase tracking-widest italic mt-1">Status: {L ? 'Ready' : 'Loading Maps...'}</p>
        </div>

        <div className="space-y-3">
          <input placeholder="Ward Name" className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border border-slate-100" onChange={e => setWardData({...wardData, name: e.target.value})} />
          <input placeholder="Ward No." className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border border-slate-100" onChange={e => setWardData({...wardData, number: e.target.value})} />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setMode('QR')} className={`flex-1 p-4 rounded-2xl transition-all ${mode === 'QR' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <QrCode className="mx-auto w-5 h-5 mb-1" /> <span className="text-[8px] font-black uppercase">Points</span>
          </button>
          <button onClick={() => setMode('FENCE')} className={`flex-1 p-4 rounded-2xl transition-all ${mode === 'FENCE' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <Target className="mx-auto w-5 h-5 mb-1" /> <span className="text-[8px] font-black uppercase">Fence</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 font-mono text-[10px]">
          <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-800 pb-1 uppercase font-black tracking-widest text-[8px]">Console</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {debugLog.map((log, i) => (
              <p key={i} className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}>
                {log.type === 'success' ? '✔' : log.type === 'error' ? '✘' : '>'} {log.msg}
              </p>
            ))}
          </div>
        </div>

        <button onClick={saveToSync} disabled={isSaving} className="bg-slate-900 text-white p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
          {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Deploy Ward
        </button>
      </aside>

      <main className="flex-1 relative">
        <MapContainer center={[16.6912, 74.4962]} zoom={18} zoomControl={false} className="h-full w-full bg-slate-200">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
          <MapInteraction />
          {boundary.length > 0 && <Polygon positions={boundary} pathOptions={{ color: '#0F172A', fillColor: '#0F172A', fillOpacity: 0.1, weight: 3 }} />}
          {qrPoints.map((p, i) => L && (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(i + 1)} />
          ))}
        </MapContainer>
        <div className="absolute top-10 right-10 bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-[1000]">
          Click on Map to drop {mode}
        </div>
      </main>
    </div>
  );
}
