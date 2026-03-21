'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, Search, Gps, Save, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ vehicle_number: '', imei_no: '', vehicle_type: 'TRUCK' });

  const loadVehicles = async () => {
    const { data } = await supabase.from('vehicles').select('*');
    setVehicles(data || []);
  };

  useEffect(() => { loadVehicles(); }, []);

  const handleSave = async () => {
    if (!formData.vehicle_number || !formData.imei_no) return toast.error("Number and IMEI required!");
    const { error } = await supabase.from('vehicles').insert([formData]);
    if (!error) {
      toast.success("Vehicle Added for Tracking!");
      setShowModal(false);
      loadVehicles();
    }
  };

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800">Fleet Assets</h1>
          <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Module 0: GPS Tracking Setup</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-500 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl flex items-center gap-3">
          <Truck className="w-5 h-5" /> Add Vehicle
        </button>
      </header>

      {/* Vehicle Grid UI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
              <Truck className="w-10 h-10 text-slate-800" />
            </div>
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter text-slate-800">{v.vehicle_number}</h3>
              <p className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest mt-1">IMEI: {v.imei_no}</p>
            </div>
            <span className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">{v.status}</span>
          </div>
        ))}
      </div>

      {/* Vehicle Modal - iPhone Style */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative">
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter text-emerald-600">Link New Asset</h2>
            <div className="space-y-4">
              <input placeholder="Vehicle Number (e.g. MH-09-1234)" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, vehicle_number: e.target.value})} />
              <input placeholder="GPS Chip IMEI Number" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, imei_no: e.target.value})} />
              <select className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, vehicle_type: e.target.value})}>
                <option value="TRUCK">Heavy Truck</option>
                <option value="RICKSHAW">Auto Rickshaw</option>
                <option value="TRACTOR">Tractor</option>
              </select>
              <button onClick={handleSave} className="w-full bg-emerald-500 text-white p-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl mt-6">Activate Tracking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
