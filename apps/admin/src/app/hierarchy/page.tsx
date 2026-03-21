'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Navigation connect karne ke liye
import { supabaseAdmin } from '@/lib/supabase';
import { Globe, MapPin, Landmark, Building2, Home, Plus, Loader2, Trash2, Map as MapIcon } from 'lucide-react';

export default function HierarchyPage() {
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState('Village');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 1. Real Fetch Logic (Database se connect) ---
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await supabaseAdmin.getHierarchy(activeLevel);
      setItems(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [activeLevel]);

  // --- 2. Real Add Logic ---
  const handleAdd = async () => {
    const name = prompt(`Enter ${activeLevel} Name (e.g., Shirol):`);
    if (!name) return;

    try {
      const newItem = { 
        name, 
        code: `${activeLevel.slice(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}` 
      };
      await supabaseAdmin.createHierarchyItem(activeLevel, newItem);
      loadData(); // List refresh karein
    } catch (err) {
      alert("Error adding item. Tables check karein.");
    }
  };

  // --- 3. Real Delete Logic ---
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await supabaseAdmin.deleteHierarchyItem(activeLevel, id);
      loadData();
    } catch (err) {
      alert("Delete failed!");
    }
  };

  const levels = [
    { name: 'Country', icon: Globe },
    { name: 'State', icon: MapPin },
    { name: 'District', icon: Landmark },
    { name: 'Taluka', icon: Building2 },
    { name: 'Village', icon: Home },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header - iPhone Style */}
      <header className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800 leading-none">Hierarchy</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Module 0: Admin Infrastructure</p>
        </div>
        
        <div className="flex gap-4">
          {/* Naya Button: Designer Map Page par jane ke liye */}
          <button 
            onClick={() => router.push('/hierarchy/designer')}
            className="bg-slate-900 text-white px-8 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-xl hover:bg-emerald-500 transition-all flex items-center gap-2"
          >
            <MapIcon className="w-4 h-4" /> Open Map Designer
          </button>

          <button 
            onClick={handleAdd}
            className="bg-sky-500 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add {activeLevel}
          </button>
        </div>
      </header>

      {/* Level Picker */}
      <div className="flex bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 w-fit mx-4 overflow-x-auto">
        {levels.map((lvl) => (
          <button 
            key={lvl.name}
            onClick={() => setActiveLevel(lvl.name)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase transition-all whitespace-nowrap ${
              activeLevel === lvl.name ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <lvl.icon className="w-4 h-4" /> {lvl.name}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px] relative mx-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
            <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-12 py-7">Official Name</th>
                <th className="px-12 py-7">Admin Code</th>
                <th className="px-12 py-7 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-12 py-9 font-bold text-slate-700 text-lg tracking-tighter">{item.name}</td>
                  <td className="px-12 py-9 font-mono text-xs text-slate-400 uppercase tracking-widest">{item.code}</td>
                  <td className="px-12 py-9 text-right">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-4 text-slate-200 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-32 text-center text-slate-200 font-black uppercase text-[10px] tracking-[0.5em]">
                    No Data Found in {activeLevel}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
