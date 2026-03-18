'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Search, Layers, Globe, Navigation } from 'lucide-react';
import React from 'react';

// --- Client-Only Leaflet Engine ---
const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  const { MapContainer, TileLayer, Polygon, Marker, useMap, GeoJSON } = mod;
  
  const MapFlyController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { 
      if (center) {
        // City ke exact center par zoom focus
        map.flyTo(center, 15, { animate: true, duration: 2.5 }); 
      }
    }, [center, map]);
    return null;
  };

  return function Map({ center, wards, cityGeoJSON }: any) {
    return (
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        {/* Dark Mode Theme (Apple Maps Style) */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapFlyController center={center} />
        
        {/* Exact Official Boundary */}
        {cityGeoJSON && (
          <GeoJSON 
            key={JSON.stringify(cityGeoJSON)} 
            data={cityGeoJSON} 
            style={{ color: '#ef4444', weight: 4, fillOpacity: 0.1, fillColor: '#ef4444' }} 
          />
        )}

        {/* Professional Ward Partitions (Inside Border Only) */}
        {wards.map((w: any) => (
          <Polygon 
            key={w.id} 
            positions={w.bounds} 
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 1.5 }} 
          />
        ))}
        {center && <Marker position={center} />}
      </MapContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-full w-full bg-[#111827] flex items-center justify-center font-black text-gray-400">SYNCING OFFICIAL BOUNDARIES...</div> });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); 
  const [autoWards, setAutoWards] = useState<any[]>([]);
  const [cityGeoJSON, setCityGeoJSON] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // --- Universal Search: official Boundary Fetching ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setAutoWards([]); 
    
    try {
      // Nominatim API se exact Polygon data fetch karna
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&addressdetails=1&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setCityGeoJSON(result.geojson);
        // Map ko exact center par bhejna
        setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
      } else {
        alert("City boundary not found! Please try: Shirol, Maharashtra");
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  // --- smart Partition Logic: clipping Wards Inside Real Border ---
  const generateSmartWards = () => {
    if (!cityGeoJSON || !mapCenter) return;

    let borderPoints = [];
    if (cityGeoJSON.type === 'Polygon') {
      borderPoints = cityGeoJSON.coordinates[0];
    } else if (cityGeoJSON.type === 'MultiPolygon') {
      borderPoints = cityGeoJSON.coordinates[0][0];
    } else {
      alert("Geometry format not supported for partition.");
      return;
    }

    const newWards = [];
    const step = Math.floor(borderPoints.length / 10);

    for (let i = 0; i < 10; i++) {
      const start = i * step;
      const end = (i === 9) ? borderPoints.length : (i + 1) * step;

      // Center point se boundary points tak ke polygon banana
      const wardBounds = [
        mapCenter,
        ...borderPoints.slice(start, end).map((c: any) => [c[1], c[0]]),
        mapCenter
      ];

      newWards.push({ id: Date.now() + i, ward_number: i + 1, bounds: wardBounds });
    }
    setAutoWards(newWards);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8 font-sans text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- Global Command Panel (Apple Maps Style UI) --- */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-slate-800">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-500 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Navigation className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">SWM Command Center</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Global Fleet Sync Active</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative group">
              <Search className="absolute left-5 top-5 text-slate-500 w-6 h-6 group-focus-within:text-blue-500 transition-all" />
              <input 
                type="text" placeholder="Search any City or Village..." 
                className="w-full pl-14 p-5 bg-slate-800/50 border border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button 
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-widest"
            >
              {isSearching ? "Locating..." : "Locate"}
            </button>
          </div>

          <button 
            onClick={generateSmartWards}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-sm"
          >
            <Layers className="w-6 h-6" /> Auto-Divide Inside Official Borders
          </button>
        </div>

        {/* --- Professional Unified Map --- */}
        <div className="h-[600px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-slate-900 relative z-0">
          <LeafletMap center={mapCenter} wards={autoWards} cityGeoJSON={cityGeoJSON} />
        </div>

      </div>
    </div>
  );
}
