'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Edit3, Trash2, Layers, Globe, MousePointer2 } from 'lucide-react';
import React from 'react';
import Script from 'next/script';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, FeatureGroup } = mod;
  // Leaflet Draw is imported only on client-side to prevent build failure
  const { EditControl } = require('react-leaflet-draw'); 
  require('leaflet-draw/dist/leaflet.draw.css');

  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 15, { duration: 2 }); }, [center]);
    return null;
  };

  return function Map({ center, wards, onCreated, featureGroupRef }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapFlyController center={center} />
        
        {/* Draw Tool Logic */}
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={onCreated}
            draw={{
              rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
              polygon: { allowIntersection: false, drawError: { color: '#ef4444', message: 'Lines cannot cross!' }, shapeOptions: { color: '#3b82f6' } }
            }}
          />
        </FeatureGroup>

        {/* Professional Wards (Image 3 Style) */}
        {wards.map((w: any) => (
          <Polygon key={w.id} positions={w.bounds} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.35, weight: 2 }} />
        ))}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-black">Loading Draw Engine...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null);
  const featureGroupRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  // --- Draw Event Handler ---
  const _onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const geojson = layer.toGeoJSON();
      setDrawnPolygon(geojson);
    }
  };

  // --- Image 2 & 3 Jaisa Professional Partition Logic ---
  const partitionDrawnArea = () => {
    // @ts-ignore (Accessing Turf from CDN to fix Build Error)
    const turf = window.turf;
    if (!turf || !drawnPolygon) {
      alert("Please draw an area on the map first!");
      return;
    }

    const mainPoly = turf.feature(drawnPolygon.geometry);
    const bbox = turf.bbox(mainPoly);
    const points = turf.randomPoint(15, { bbox }); // Random seeds for natural shapes
    const voronoi = turf.voronoi(points, { bbox });
    
    const results: any[] = [];
    voronoi.features.forEach((vFeature: any, i: number) => {
      const intersect = turf.intersect(turf.featureCollection([mainPoly, vFeature]));
      if (intersect && results.length < 10) {
        const coords = intersect.geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
        results.push({ id: i, bounds: coords });
      }
    });
    setAutoWards(results);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8">
      {/* Build Safety: Script tag for Turf */}
      <Script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js" strategy="beforeInteractive" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-[#222222] shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 text-white">
              <Edit3 className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Custom Ward Designer</h1>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Manual Boundary Control Active</p>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => { setAutoWards([]); setDrawnPolygon(null); if(featureGroupRef.current) featureGroupRef.current.clearLayers(); }}
                className="flex-1 bg-red-600/10 text-red-500 px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-red-500/20"
              >
                <Trash2 className="w-4 h-4" /> Reset
              </button>
              <button 
                onClick={partitionDrawnArea}
                className="flex-1 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 transition-all hover:scale-105"
              >
                <Layers className="w-4 h-4" /> Partition Area
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3">
            <MousePointer2 className="w-5 h-5 text-blue-500" />
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-tight">
              Instruction: Use the Polygon tool (top-left) to draw your exact border, then click 'Partition Area'.
            </p>
          </div>
        </div>

        <div className="h-[600px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[#1a1a1a] relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} onCreated={_onCreated} featureGroupRef={featureGroupRef} />
        </div>
      </div>
    </div>
  );
}
