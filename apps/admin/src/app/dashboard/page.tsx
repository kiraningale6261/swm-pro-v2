'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Trash2, Zap, Save, QrCode, Download, MousePointer2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import Script from 'next/script';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, Polyline, LayersControl, Tooltip } = mod;
  
  return function Map({ center, wards, drawPoints, onMapClick }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard Map"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></LayersControl.BaseLayer>
        </LayersControl>

        {drawPoints.length > 0 && drawPoints.map((p: any, i: number) => <Marker key={i} position={p} />)}
        {drawPoints.length > 1 && <Polyline positions={drawPoints} color="#0ea5e9" weight={3} />}

        {wards.map((w: any, idx: number) => (
          <Polygon key={w.id || idx} positions={w.bounds} pathOptions={{ 
            color: w.status === 'Green' ? '#10b981' : w.status === 'Yellow' ? '#f59e0b' : '#ef4444', 
            fillColor: w.status === 'Green' ? '#10b981' : w.status === 'Yellow' ? '#f59e0b' : '#ef4444',
            fillOpacity: 0.4, weight: 2 
          }}>
            <Tooltip permanent direction="center" className="bg-white/90 px-2 py-1 rounded-lg font-black text-slate-700 uppercase text-[9px]">
              Ward {String(idx + 1).padStart(2, '0')}
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-slate-50 flex items-center justify-center font-black text-slate-400">LOADING SWM PRO...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [view, setView] = useState<'MAP' | 'QR'>('MAP');

  useEffect(() => { setMounted(true); }, []);

  const partitionArea = () => {
    const turf = (window as any).turf;
    if (!turf || drawPoints.length < 3) return alert("Pehle 3 points click karke border draw karein!");
    const polygon = turf.polygon([[...drawPoints, drawPoints[0]].map(p => [p[1], p[0]])]);
    const bbox = turf.bbox(polygon);
    const points = turf.randomPoint(12, { bbox });
    const voronoi = turf.voronoi(points, { bbox });
    const results: any[] = [];
    voronoi.features.forEach((vFeature: any, i: number) => {
      const intersect = turf.intersect(turf.featureCollection([polygon, vFeature]));
      if (intersect && results.length < 10) {
        results.push({ 
          id: `W-${i+1}`, ward_number: i + 1, status: 'Red',
          bounds: intersect.geometry.coordinates[0].map((c: any) => [c[1], c[0]]) 
        });
      }
    });
    setAutoWards(results);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <Script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js" strategy="lazyOnload" />
      
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 w-fit">
          <button onClick={() => setView('MAP')} className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest ${view === 'MAP' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Ward Designer</button>
          <button onClick={() => setView('QR')} className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest ${view === 'QR' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>QR Manager</button>
        </div>

        {view === 'MAP' ? (
          <>
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="Search City..." className="flex-1 p-5 bg-slate-50 rounded-3xl font-bold border-none outline-none text-slate-800" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button onClick={partitionArea} className="bg-emerald-500 text-white px-8 py-5 rounded-3xl font-black uppercase text-[10px] flex items-center gap-2"><Zap className="w-4 h-4" /> Partition</button>
                <button onClick={() => { setDrawPoints([]); setAutoWards([]); }} className="p-5 bg-slate-100 text-slate-400 rounded-3xl hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="h-[550px] rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-white relative z-0">
              <LeafletMap center={mapCenter} wards={autoWards} drawPoints={drawPoints} onMapClick={(e: any) => setDrawPoints(p => [...p, [e.latlng.lat, e.latlng.lng]])} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {autoWards.length > 0 ? autoWards.map((w) => (
              <div key={w.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4">
                <div className="w-full flex justify-between items-center px-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Ward {w.ward_number}</span>
                   <div className={`w-3 h-3 rounded-full ${w.status === 'Green' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                {/* Build-Safe QR via Google Chart API */}
                <div className="p-4 bg-slate-50 rounded-[2rem] border-2 border-slate-200">
                  <img src={`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=SWM-PRO-WARD-${w.ward_number}&choe=UTF-8`} alt="QR Code" className="w-24 h-24" />
                </div>
                <button className="w-full bg-slate-50 py-3 rounded-2xl text-[9px] font-black uppercase text-slate-500 hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center gap-2">
                   <Download className="w-3 h-3" /> Save
                </button>
              </div>
            )) : (
              <div className="col-span-full h-64 bg-white rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                <QrCode className="w-12 h-12 text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-[10px]">Generate wards first</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
