'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Search, Phone, ShieldCheck, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', mobile: '', role: 'DRIVER', pin: '', village_id: '' });

  const loadStaff = async () => {
    setLoading(true);
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.mobile) return toast.error("Name and Mobile are required!");
    const { error } = await supabase.from('staff').insert([formData]);
    if (!error) {
      toast.success("Staff added successfully!");
      setShowModal(false);
      loadStaff();
    } else { toast.error("Mobile number already exists!"); }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800">Staff Registry</h1>
          <p className="text-sky-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Module 0: Human Resources</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl flex items-center gap-3">
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </header>

      {/* Staff Table UI (iPhone White Style) */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-10 py-6">Member Name</th>
              <th className="px-10 py-6">Mobile & PIN</th>
              <th className="px-10 py-6">Role</th>
              <th className="px-10 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map((person) => (
              <tr key={person.id} className="hover:bg-slate-50 transition-all">
                <td className="px-10 py-8 font-bold text-slate-800 text-lg">{person.name}</td>
                <td className="px-10 py-8 font-bold text-slate-500 text-sm">
                  {person.mobile} <br/><span className="text-[9px] text-slate-300">PIN: {person.pin}</span>
                </td>
                <td className="px-10 py-8 italic font-black text-sky-500 text-[10px] uppercase">{person.role}</td>
                <td className="px-10 py-8 text-right">
                  <button className="text-slate-200 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative">
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">Add Staff Member</h2>
            <div className="space-y-4">
              <input placeholder="Full Name" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Mobile Number" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, mobile: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="4-Digit PIN" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" maxLength={4} onChange={e => setFormData({...formData, pin: e.target.value})} />
                <select className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="DRIVER">Driver</option>
                  <option value="SWEEPER">Sweeper</option>
                  <option value="SUPERVISOR">Supervisor</option>
                </select>
              </div>
              <button onClick={handleSave} className="w-full bg-sky-500 text-white p-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl mt-6">Create Account</button>
              <button onClick={() => setShowModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
