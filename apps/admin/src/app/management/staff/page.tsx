'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffRegistry() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', employee_id: '', role: 'Sweeper' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Exact Supabase Save Logic
    const { error } = await supabase.from('staff').insert([{
      name: formData.name,
      phone: formData.phone,
      employee_id: formData.employee_id,
      role: formData.role
    }]);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success("Staff Member Added Successfully! 🚀");
      setShowModal(false);
      window.location.reload(); // Real-time refresh
    }
    setLoading(false);
  };

  return (
    <div className="p-10 space-y-8 animate-wevois-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Staff Registry</h1>
          <p className="text-sky-500 text-xs font-bold uppercase tracking-widest mt-1">Module 0: Human Resources</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 transition-all">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </header>

      {/* Real Form Modal [Match: data entry save nahi ho rahi.png] */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form onSubmit={handleCreate} className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-2xl space-y-6">
            <h2 className="text-2xl font-black italic uppercase text-center mb-8">Add Staff Member</h2>
            <input required placeholder="Full Name" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none focus:ring-2 focus:ring-sky-500" onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required placeholder="Phone Number" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none focus:ring-2 focus:ring-sky-500" onChange={e => setFormData({...formData, phone: e.target.value})} />
            <div className="flex gap-4">
              <input required placeholder="Emp ID" className="flex-1 bg-slate-50 p-6 rounded-3xl font-bold border-none outline-none" onChange={e => setFormData({...formData, employee_id: e.target.value})} />
              <select className="flex-1 bg-slate-50 p-6 rounded-3xl font-bold outline-none" onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="Sweeper">Sweeper</option>
                <option value="Driver">Driver</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>
            <button disabled={loading} className="w-full bg-sky-500 text-white p-7 rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Create Account"}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
