'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MousePointer2, Layers, Globe, Trash2, Zap } from 'lucide-react';
import React from 'react';
import Script from 'next/script';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, Polyline } = mod;
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 15, { duration: 2 }); }, [center]);
    return null;
  };

  const ClickHandler = ({ onClick }: { onClick: (e: any) => void }) => {
    const map = useMap();
    useEffect(() => {
      map.on('click', onClick);
      return () => { map.off('click', onClick); };
    }, [map, onClick]);
    return null;
  };

  return function Map({ center, wards, drawPoints, onMapClick }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapFlyController center={center} />
        <ClickHandler onClick={onMapClick} />

        {/* Boundary points and visual lines */}
        {drawPoints.map((p: any, i: number) => (
          <Marker key={i} position={p} />
        ))}
        {drawPoints.length > 1 && <Polyline positions={drawPoints} color="#3b82f6" weight={3} />}
        {drawPoints.length > 2 && <Polygon positions={drawPoints} color="#3b82f6" fillOpacity={0.1} dashArray="5, 10" />}

        {/* 10 Professional Wards */}
        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 2 }} 
          />
        ))}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-black">Booting Drawing Engine...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [turfReady, setTurfReady] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [autoWards, setAutoWards] = useState<any[]>([]);

  useEffect(() => { 
    setMounted(true); 
    // Check if turf is already loaded
    if (typeof window !== 'undefined' && (window as any).turf) setTurfReady(true);
  }, []);

  const onMapClick = (e: any) => {
    setDrawPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
  };

  const partitionArea = () => {
    const turf = (window as any).turf;
    if (!turf) {
      alert("System is still loading calculation engine. Please wait 2 seconds.");
      return;
    }
    if (drawPoints.length < 3) {
      alert("Bhai, kam se kam 3 points map par click karke border draw kijiye!");
      return;
    }

    try {
      // 1. Create polygon from drawn points
      const polygonCoords = [...drawPoints, drawPoints[0]].map(p => [p[1], p[0]]);
      const polygon = turf.polygon([polygonCoords]);
      const bbox = turf.bbox(polygon);
      
      // 2. Generate 10 random seeds inside the boundary
      const points = turf.randomPoint(15, { bbox });
      const voronoi = turf.voronoi(points, { bbox });
      
      const results: any[] = [];
      voronoi.features.forEach((vFeature: any, i: number) => {
        // 3. Clip Voronoi cells with the drawn boundary
        const intersect = turf.intersect(turf.featureCollection([polygon, vFeature]));
        if (intersect && results.length < 10) {
          const coords = intersect.geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
          results.push({ id: Date.now() + i, bounds: coords });
        }
      });

      if (results.length > 0) {
        setAutoWards(results);
      } else {
        alert("Partition failed! Try drawing a larger or simpler area.");
      }
    } catch (err) {
      console.error("Partition Error:", err);
      alert("Calculation Error. Please reset and draw again.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8">
      {/* Build-Safe Turf.js */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js" 
        strategy="lazyOnload"
        onLoad={() => setTurfReady(true)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-[#111111] rounded-[2rem] p-8 border border-[#222222] shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 text-white">
              <Globe className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Precision Drawing Engine</h1>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Status: {turfReady ? 'READY' : 'LOADING ENGINE...'}</p>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => { setDrawPoints([]); setAutoWards([]); }} className="flex-1 bg-red-600/10 text-red-500 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-red-500/20">
                <Trash2 className="w-4 h-4 mr-2 inline" /> Clear
              </button>
              <button 
                onClick={partitionArea} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Partition Area
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3">
            <MousePointer2 className="w-5 h-5 text-blue-500" />
            <p className="text-[11px] font-bold text-blue-400 uppercase">
              How to: Click on the map to mark boundary points. Connect 3+ points, then click 'Partition Area'.
            </p>
          </div>
        </div>

        <div className="h-[600px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[#1a1a1a] relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} drawPoints={drawPoints} onMapClick={onMapClick} />
        </div>
      </div>
    </div>
  );
}
