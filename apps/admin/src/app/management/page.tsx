'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { User, Ward } from '@swm-pro/shared';
import { Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface WorkerForm {
  id?: number;
  name: string;
  mobile: string;
  role: 'admin' | 'worker' | 'driver' | 'sweeper'; 
  pin: string; 
  village_id?: string; 
  device_id?: string;
  ward_id?: number;
}

export default function ManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workers' | 'vehicles'>('workers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [villages, setVillages] = useState<any[]>([]); 

  // Form states update
  const [workerForm, setWorkerForm] = useState<WorkerForm>({
    name: '',
    mobile: '',
    role: 'worker',
    pin: '',
    village_id: '',
  });

  // --- 1. Fetch Users (ReferenceError Fix) ---
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getUsers();
        return (data || []) as User[];
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
  });

  // Fetch Wards
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const data = await supabaseAdmin.getWards();
        setWards((data || []) as Ward[]);
      } catch (error) {
        console.error('Error fetching wards:', error);
      }
    };
    fetchWards();
  }, []);

  // Fetch Villages for dropdown
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const data = await supabaseAdmin.getHierarchy('Village');
        setVillages(data || []);
      } catch (error) { console.error(error); }
    };
    fetchVillages();
  }, []);

  // --- 2. Mutations ---
  const userMutation = useMutation({
    mutationFn: async (data: WorkerForm) => {
      const payload = {
        name: data.name,
        mobile: data.mobile,
        role: data.role,
        pin: data.pin, 
        village_id: data.village_id, 
        device_id: data.device_id,
        is_active: true,
      };

      if (data.id) {
        return await supabaseAdmin.updateUser(data.id, payload);
      } else {
        return await supabaseAdmin.createUser(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingId ? 'Worker updated' : 'Worker created');
      resetWorkerForm();
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save");
    }
  });

  // --- 3. Handlers ---
  const handleSaveWorker = () => {
    if (!workerForm.name || !workerForm.mobile || !workerForm.pin) {
      return toast.error("Please fill required fields");
    }
    userMutation.mutate(workerForm);
  };

  const handleEditWorker = (user: any) => {
    setWorkerForm({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      pin: user.pin || '',
      village_id: user.village_id || '',
      device_id: user.device_id || '',
    });
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleDeleteWorker = async (id: number) => {
    if (confirm('Delete this worker?')) {
      const { error } = await supabaseAdmin.supabase.from('users').delete().eq('id', id);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success("Deleted");
      }
    }
  };

  const resetWorkerForm = () => {
    setWorkerForm({ name: '', mobile: '', role: 'worker', pin: '', village_id: '' });
    setEditingId(null);
  };

  // Filter logic
  const workers = users.filter((u: any) => u.role !== 'admin');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - iPhone Style */}
        <div className="bg-white rounded-[3rem] p-10 mb-8 border border-slate-100 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800 leading-none">Management</h1>
            <p className="text-sky-500 font-bold text-[10px] uppercase tracking-widest mt-2">Module 1: Workforce & Assets</p>
          </div>
          <button
            onClick={() => { resetWorkerForm(); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-sky-500 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Worker
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 w-fit mb-8">
          <button onClick={() => setActiveTab('workers')} className={`px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase transition-all ${activeTab === 'workers' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400'}`}>Workers</button>
          <button onClick={() => setActiveTab('vehicles')} className={`px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase transition-all ${activeTab === 'vehicles' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400'}`}>Vehicles</button>
        </div>

        {activeTab === 'workers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-10 py-6 text-left">Worker</th>
                    <th className="px-10 py-6 text-left">Mobile & PIN</th>
                    <th className="px-10 py-6 text-left">Role & Village</th>
                    <th className="px-10 py-6 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workers.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest italic">No Workers Linked</td></tr>
                  ) : (
                    workers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center font-black text-sky-600 italic uppercase">{worker.name.charAt(0)}</div>
                            <span className="font-bold text-slate-800 text-lg tracking-tighter">{worker.name}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-sm font-bold text-slate-600">
                          {worker.mobile} <br />
                          <span className="text-[9px] font-mono text-slate-300">PIN: {worker.pin || '****'}</span>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest">{worker.role}</span>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Village ID: {worker.village_id || 'Not Set'}</p>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex gap-2">
                             <button onClick={() => handleEditWorker(worker)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-sky-500 transition-all"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => handleDeleteWorker(worker.id)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicles Tab Placeholder */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-[4rem] p-20 text-center border border-slate-100 shadow-sm">
            <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-xs italic">Vehicle Fleet Coming Soon...</p>
          </div>
        )}

        {/* Worker Modal - iPhone Style */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{editingId ? 'Update Worker' : 'New Worker'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X /></button>
              </div>

              <div className="space-y-4">
                <input placeholder="Worker Name" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" value={workerForm.name} onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })} />
                <input placeholder="Mobile Number" className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" value={workerForm.mobile} onChange={(e) => setWorkerForm({ ...workerForm, mobile: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="4-Digit PIN" maxLength={4} className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none" value={workerForm.pin} onChange={(e) => setWorkerForm({ ...workerForm, pin: e.target.value })} />
                  <select className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none appearance-none" value={workerForm.role} onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value as any })}>
                    <option value="worker">Standard Worker</option>
                    <option value="driver">Vehicle Driver</option>
                    <option value="sweeper">Road Sweeper</option>
                  </select>
                </div>
                <select className="p-6 bg-slate-50 rounded-3xl font-bold w-full outline-none appearance-none" value={workerForm.village_id} onChange={(e) => setWorkerForm({ ...workerForm, village_id: e.target.value })}>
                  <option value="">Select Village (e.g., Shirwal)</option>
                  {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                <button onClick={handleSaveWorker} className="w-full bg-sky-500 text-white p-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-100 hover:bg-slate-900 transition-all mt-6 disabled:bg-slate-200">
                  {userMutation.isPending ? 'Processing...' : 'Save Worker Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
