'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Trash2, Zap, Save, QrCode, Download, MousePointer2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import Script from 'next/script';

const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, Polyline, LayersControl, Tooltip } = mod;
  
  return function Map({ center, wards, drawPoints, onMapClick }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard Map"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></LayersControl.BaseLayer>
        </LayersControl>

        <ClickHandler onClick={onMapClick} />
        <MapFlyController center={center} />

        {drawPoints.length > 0 && drawPoints.map((p: any, i: number) => <Marker key={i} position={p} />)}
        {drawPoints.length > 1 && <Polyline positions={drawPoints} color="#0ea5e9" weight={3} />}

        {wards.map((w: any, idx: number) => (
          <Polygon key={idx} positions={w.bounds} pathOptions={{ 
            color: '#10b981', 
            fillColor: '#10b981',
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
  function MapFlyController({ center }: any) { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 15); }, [center, map]); return null; }
  function ClickHandler({ onClick }: any) { const map = useMap(); useEffect(() => { map.on('click', onClick); return () => map.off('click', onClick); }, [map, onClick]); return null; }
}), { ssr: false, loading: () => <div className="h-full w-full bg-slate-50 flex items-center justify-center font-black text-slate-400">LOADING SWM PRO...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.6912, 74.4962]); // Default Shirol
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [view, setView] = useState<'MAP' | 'QR'>('MAP');

  useEffect(() => { setMounted(true); }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) alert(`Plan Loaded: ${file.name}. Aligning Shirol Municipal Council`);
  };

  const partitionArea = () => {
    const turf = (window as any).turf;
    if (!turf || drawPoints.length < 3) return alert("Pehle area draw karein!");
    try {
      // Fix: Ensure first and last points are connected for Turf
      const coords = [...drawPoints, drawPoints[0]].map(p => [p[1], p[0]]);
      const polygon = turf.polygon([coords]);
      const bbox = turf.bbox(polygon);
      const voronoi = turf.voronoi(turf.randomPoint(15, { bbox }), { bbox });
      
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
    } catch (e) { alert("Partition error. Boundary shape check karein."); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <Script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js" strategy="lazyOnload" />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* --- View Switcher --- */}
        <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 w-fit">
          <button onClick={() => setView('MAP')} className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest ${view === 'MAP' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Ward Designer</button>
          <button onClick={() => setView('QR')} className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest ${view === 'QR' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>QR Manager</button>
        </div>

        {view === 'MAP' ? (
          <>
            {/* --- Original Command Hub --- */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="shirol" className="flex-1 p-5 bg-slate-50 rounded-3xl font-bold border-none outline-none text-slate-800" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                
                {/* PDF Upload Button (Restored) */}
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                  <div className="bg-sky-50 text-sky-600 px-8 py-5 rounded-3xl font-black uppercase text-[10px] flex items-center gap-2 border-2 border-dashed border-sky-100">
                    <Upload className="w-4 h-4" /> Upload Map PDF
                  </div>
                </label>

                <button onClick={partitionArea} className="bg-emerald-500 text-white px-8 py-5 rounded-3xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all"><Zap className="w-4 h-4" /> Partition</button>
                <button onClick={() => { setDrawPoints([]); setAutoWards([]); }} className="p-5 bg-slate-100 text-slate-400 rounded-3xl hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>

            {/* --- Master Map --- */}
            <div className="h-[550px] rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-white relative z-0">
              <LeafletMap center={mapCenter} wards={autoWards} drawPoints={drawPoints} onMapClick={(e: any) => setDrawPoints(p => [...p, [e.latlng.lat, e.latlng.lng]])} />
            </div>
          </>
        ) : (
          /* --- QR Manager --- */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {autoWards.length > 0 ? autoWards.map((w) => (
              <div key={w.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 group hover:shadow-2xl transition-all">
                <div className="w-full flex justify-between items-center px-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward {w.ward_number}</span>
                   <div className="w-3 h-3 rounded-full bg-rose-500" />
                </div>
                <div className="p-4 bg-slate-50 rounded-[2rem] border-2 border-slate-100 group-hover:border-sky-500 transition-all">
                  <img src={`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=SWM-PRO-WARD-${w.ward_number}&choe=UTF-8`} alt="QR Code" className="w-24 h-24" />
                </div>
                <button className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                   <Download className="w-3 h-3" /> Save QR
                </button>
              </div>
            )) : (
              <div className="col-span-full h-64 bg-white rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                <QrCode className="w-12 h-12 text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-[10px]">Draw area then Partition</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
