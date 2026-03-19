'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Trash2, Zap, Save, QrCode, Download, MousePointer2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import Script from 'next/script';

const MasterMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, Polyline, LayersControl, Tooltip } = mod;
  
  return function Map({ center, wards, drawPoints, onMapClick, workerPos }: any) {
    return (
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Map View"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></LayersControl.BaseLayer>
        </LayersControl>

        <ClickHandler onClick={onMapClick} />
        <MapFlyController center={center} />

        {/* --- LIVE WORKER SYNC MARKER --- */}
        {workerPos && (
          <Marker position={workerPos}>
             <Tooltip permanent direction="top">Worker Live Pos</Tooltip>
          </Marker>
        )}

        {drawPoints.length > 0 && drawPoints.map((p: any, i: number) => <Marker key={i} position={p} />)}
        {drawPoints.length > 1 && <Polyline positions={drawPoints} color="#3b82f6" weight={3} />}

        {/* --- PARTITION WARDS --- */}
        {wards.map((w: any, idx: number) => (
          <Polygon key={idx} positions={w.bounds} pathOptions={{ color: '#10b981', fillOpacity: 0.4, weight: 2 }}>
            <Tooltip permanent direction="center" className="bg-white/95 px-2 py-1 rounded-lg font-black text-sky-700 text-[9px]">Ward {idx + 1}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>
    );
  };
  function MapFlyController({ center }: any) { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 15); }, [center, map]); return null; }
  function ClickHandler({ onClick }: any) { const map = useMap(); useEffect(() => { map.on('click', onClick); return () => map.off('click', onClick); }, [map, onClick]); return null; }
}), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6912, 74.4962]); // Shirol Center
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [liveWorker, setLiveWorker] = useState<[number, number] | null>(null);
  const [isQRModalOpen, setQRModalOpen] = useState(false);

  useEffect(() => { 
    setMounted(true);
    // Real-time Worker Location Polling (Har 5 second mein sync)
    const interval = setInterval(syncWorkerLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  const syncWorkerLocation = async () => {
    // Supabase se worker ki latest location fetch karna
    const { data } = await supabase.from('gps_points').select('latitude, longitude').order('created_at', { ascending: false }).limit(1).single();
    if (data) setLiveWorker([data.latitude, data.longitude]);
  };

  // --- PARTITION ENGINE FIX ---
  const partitionArea = () => {
    const turf = (window as any).turf;
    if (!turf || drawPoints.length < 3) return alert("Pehle 3+ points click karke area bandhein!");
    
    try {
      // Coordinate format conversion [lat, lng] -> [lng, lat] for Turf
      const coords = [...drawPoints, drawPoints[0]].map(p => [p[1], p[0]]);
      const polygon = turf.polygon([coords]);
      const bbox = turf.bbox(polygon);
      const voronoi = turf.voronoi(turf.randomPoint(15, { bbox }), { bbox });
      
      const results: any[] = [];
      voronoi.features.forEach((v: any, i: number) => {
        const intersect = turf.intersect(turf.featureCollection([polygon, v]));
        if (intersect && results.length < 10) {
          results.push({ ward_number: i + 1, bounds: intersect.geometry.coordinates[0].map((c: any) => [c[1], c[0]]) });
        }
      });
      setAutoWards(results);
    } catch (e) { alert("Partition calculation error! Area shape check karein."); }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <Script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js" strategy="lazyOnload" />
      
      {/* --- COMMAND BAR --- */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative flex gap-3">
          <input type="text" placeholder="shirol" className="w-full pl-16 p-5 bg-slate-50 rounded-[2rem] font-bold border-none text-slate-800 outline-none" />
          <button className="bg-slate-900 text-white px-10 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Locate</button>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setQRModalOpen(true)} className="bg-sky-50 text-sky-600 px-8 py-5 rounded-[2rem] font-black uppercase text-[10px] flex items-center gap-2 border-2 border-dashed border-sky-100 shadow-sm transition-all hover:bg-sky-500 hover:text-white">
            <QrCode className="w-4 h-4" /> New QR Sync
          </button>
          <button onClick={partitionArea} className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-lg flex items-center gap-2 hover:bg-emerald-600">
            <Zap className="w-4 h-4" /> Partition
          </button>
          <button onClick={() => { setDrawPoints([]); setAutoWards([]); }} className="p-5 bg-slate-100 rounded-[2rem] text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"><Trash2 /></button>
        </div>
      </div>

      <div className="h-[600px] rounded-[4rem] overflow-hidden border-[15px] border-white shadow-2xl relative">
        <MasterMap center={mapCenter} wards={autoWards} drawPoints={drawPoints} workerPos={liveWorker} onMapClick={(e: any) => setDrawPoints(p => [...p, [e.latlng.lat, e.latlng.lng]])} />
      </div>

      {/* --- QR REGISTRATION MODAL FIX --- */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-white animate-slide-up">
            <div className="bg-sky-500 p-8 text-white">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">Sync QR Registration</h2>
               <p className="text-[10px] font-bold uppercase opacity-80 mt-1">Registering Point for Shirol Municipal Council</p>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Worker Live Location Sync</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Latitude</p>
                    <p className="font-mono font-bold text-sky-600 text-sm mt-1">{liveWorker ? liveWorker[0].toFixed(6) : 'SYNCING...'}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Longitude</p>
                    <p className="font-mono font-bold text-sky-600 text-sm mt-1">{liveWorker ? liveWorker[1].toFixed(6) : 'SYNCING...'}</p>
                  </div>
                </div>
              </div>
              <button className="w-full bg-sky-500 text-white p-6 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-sky-100 hover:bg-sky-600" onClick={() => setQRModalOpen(false)}>Generate & Sync QR</button>
              <button className="w-full text-slate-400 font-black uppercase text-[10px] hover:text-slate-600" onClick={() => setQRModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
