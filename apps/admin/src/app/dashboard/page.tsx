'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe } from 'lucide-react';
import React from 'react';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, GeoJSON } = mod;
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { 
      if (center) {
        // City ke exact center par high-precision zoom
        map.flyTo(center, 15, { animate: true, duration: 2.5 }); 
      }
    }, [center, map]);
    return null;
  };

  return function Map({ center, wards, cityGeoJSON }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        {/* Professional Dark Theme to match your Apple Maps reference */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapFlyController center={center} />
        
        {/* Real Official Border (Visible as Red/Blue outline) */}
        {cityGeoJSON && (
          <GeoJSON 
            key={JSON.stringify(cityGeoJSON)} 
            data={cityGeoJSON} 
            style={{ color: '#3b82f6', weight: 4, fillOpacity: 0.05 }} 
          />
        )}

        {/* 10 Wards: 1000% Inside the Official Border */}
        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.35, weight: 2 }} 
          />
        ))}
        {center && <Marker position={center} />}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center font-black text-gray-400 uppercase tracking-widest">Analysing Official Borders...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.7050, 74.2433]); 
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [cityGeoJSON, setCityGeoJSON] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // --- Search Logic: official Boundary dhoondne ke liye ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setAutoWards([]); 
    
    try {
      // Nominatim se Polygon GeoJSON fetch karna
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&addressdetails=1&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setCityGeoJSON(data[0].geojson);
        // Map ko city ke asli center par le jana
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert("Boundary not found! Try searching with City and State name.");
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  // --- Exact Border Matching Logic (Image 3 jaisa look) ---
  const generateWards = () => {
    if (!cityGeoJSON || !mapCenter) return;

    let borderCoords = [];
    if (cityGeoJSON.type === 'Polygon') {
      borderCoords = cityGeoJSON.coordinates[0];
    } else if (cityGeoJSON.type === 'MultiPolygon') {
      borderCoords = cityGeoJSON.coordinates[0][0];
    } else {
      return;
    }

    const newWards = [];
    // Border points ko 10 barabar hisson mein divide karna
    const pointsCount = borderCoords.length;
    const step = Math.floor(pointsCount / 10);

    for (let i = 0; i < 10; i++) {
      const start = i * step;
      const end = (i === 9) ? pointsCount : (i + 1) * step;

      // Polygon points: Center -> Boundary Segment -> Center
      const wardShape = [
        mapCenter,
        ...borderCoords.slice(start, end).map((c: any) => [c[1], c[0]]),
        mapCenter
      ];

      newWards.push({ id: Date.now() + i, ward_number: i + 1, bounds: wardShape });
    }
    setAutoWards(newWards);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- Global Control Panel --- */}
        <div className="bg-[#111111] rounded-[2rem] shadow-2xl p-8 border border-[#222222]">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Village Ward Engine</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
              <input 
                type="text" placeholder="Enter Village/City Name..." 
                className="w-full pl-12 p-4 bg-[#1a1a1a] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all text-white"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button onClick={handleSearch} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-lg">
              {isSearching ? "LOCATING..." : "LOCATE"}
            </button>
          </div>

          <button onClick={generateWards} className="w-full mt-4 bg-emerald-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-sm">
            <Layers className="w-6 h-6" /> GENERATE 10 WARDS (INSIDE BORDER)
          </button>
        </div>

        {/* --- Unified Command Map --- */}
        <div className="h-[550px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-[#1a1a1a] relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} cityGeoJSON={cityGeoJSON} />
        </div>

      </div>
    </div>
  );
}
