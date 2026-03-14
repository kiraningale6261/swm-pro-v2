'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { User, Ward } from '@swm-pro/shared';
import { Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WorkerForm {
  id?: number;
  name: string;
  mobile: string;
  role: 'admin' | 'worker';
  device_id?: string;
  ward_id?: number;
}

interface VehicleForm {
  id?: number;
  name: string;
  registration: string;
  ward_id?: number;
  status: 'active' | 'inactive';
}

export default function ManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workers' | 'vehicles'>('workers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);

  // Form states
  const [workerForm, setWorkerForm] = useState<WorkerForm>({
    name: '',
    mobile: '',
    role: 'worker',
  });

  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({
    name: '',
    registration: '',
    status: 'active',
  });

  // Fetch Users
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getUsers();
        return data as User[];
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
        setWards(data as Ward[]);
      } catch (error) {
        console.error('Error fetching wards:', error);
        toast.error('Failed to load wards');
      }
    };
    fetchWards();
  }, []);

  // Create/Update User Mutation
  const userMutation = useMutation({
    mutationFn: async (data: WorkerForm) => {
      if (data.id) {
        return await supabaseAdmin.updateUser(data.id, {
          name: data.name,
          mobile: data.mobile,
          role: data.role,
          device_id: data.device_id,
        });
      } else {
        return await supabaseAdmin.createUser({
          name: data.name,
          mobile: data.mobile,
          role: data.role,
          device_id: data.device_id,
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingId ? 'Worker updated successfully' : 'Worker created successfully');
      resetWorkerForm();
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save worker');
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabaseAdmin.supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Worker deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete worker');
    },
  });

  // Assign Ward Mutation
  const assignWardMutation = useMutation({
    mutationFn: async ({ userId, wardId }: { userId: number; wardId: number }) => {
      const { error } = await supabaseAdmin.supabase
        .from('work_assignments')
        .insert([
          {
            user_id: userId,
            ward_id: wardId,
            module_type: 'door_to_door',
            status: 'assigned',
            scheduled_date: new Date().toISOString().split('T')[0],
          },
        ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Ward assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign ward');
    },
  });

  const resetWorkerForm = () => {
    setWorkerForm({
      name: '',
      mobile: '',
      role: 'worker',
    });
    setEditingId(null);
  };

  const handleEditWorker = (user: User) => {
    setWorkerForm({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      device_id: user.device_id,
    });
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleSaveWorker = () => {
    if (!workerForm.name || !workerForm.mobile) {
      toast.error('Please fill all required fields');
      return;
    }
    userMutation.mutate(workerForm);
  };

  const handleDeleteWorker = (id: number) => {
    if (confirm('Are you sure you want to delete this worker?')) {
      deleteMutation.mutate(id);
    }
  };

  const workers = users.filter((u) => u.role === 'worker');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Management</h1>
          <p className="text-gray-600">Manage workers, vehicles, and ward assignments</p>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-6">
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab('workers')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'workers'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Workers
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'vehicles'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Vehicles
            </button>
          </div>
        </div>

        {/* Workers Tab */}
        {activeTab === 'workers' && (
          <div className="space-y-6">
            {/* Add Worker Button */}
            <button
              onClick={() => {
                resetWorkerForm();
                setIsModalOpen(true);
              }}
              className="glass-button flex items-center gap-2 bg-sky-500 text-white hover:bg-sky-600 px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              Add Worker
            </button>

            {/* Workers Table */}
            {usersError ? (
              <div className="glass-card p-6 flex items-center gap-3 bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Error loading workers</p>
                  <p className="text-sm text-red-600">Please check your database connection</p>
                </div>
              </div>
            ) : usersLoading ? (
              <div className="glass-card p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-cell text-left">Name</th>
                        <th className="table-cell text-left">Mobile</th>
                        <th className="table-cell text-left">Role</th>
                        <th className="table-cell text-left">Device ID</th>
                        <th className="table-cell text-left">Status</th>
                        <th className="table-cell text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="table-cell text-center py-8 text-gray-500">
                            No workers found. Add one to get started.
                          </td>
                        </tr>
                      ) : (
                        workers.map((worker) => (
                          <tr key={worker.id} className="table-row">
                            <td className="table-cell font-semibold text-gray-800">{worker.name}</td>
                            <td className="table-cell text-gray-600">{worker.mobile}</td>
                            <td className="table-cell">
                              <span className="badge-active">{worker.role}</span>
                            </td>
                            <td className="table-cell text-gray-600 text-xs font-mono">
                              {worker.device_id ? worker.device_id.substring(0, 8) + '...' : '-'}
                            </td>
                            <td className="table-cell">
                              {worker.is_active ? (
                                <span className="badge-active">Active</span>
                              ) : (
                                <span className="badge-inactive">Inactive</span>
                              )}
                            </td>
                            <td className="table-cell">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditWorker(worker)}
                                  className="p-2 hover:bg-white/50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  className="p-2 hover:bg-white/50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
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

            {/* Ward Assignment Section */}
            {workers.length > 0 && (
              <div className="glass-card-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Assign Wards to Workers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {workers.map((worker) => (
                    <div key={worker.id} className="glass-card p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">{worker.name}</h3>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignWardMutation.mutate({
                              userId: worker.id,
                              wardId: parseInt(e.target.value),
                            });
                            e.target.value = '';
                          }
                        }}
                        className="glass-input w-full"
                      >
                        <option value="">Select a ward to assign...</option>
                        {wards.map((ward) => (
                          <option key={ward.id} value={ward.id}>
                            Ward {ward.ward_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="glass-card p-12 text-center">
            <p className="text-gray-600">Vehicle management coming soon...</p>
          </div>
        )}

        {/* Worker Modal */}
        {isModalOpen && (
          <div className="modal-overlay flex items-center justify-center z-50">
            <div className="modal-content w-full max-w-md mx-4 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingId ? 'Edit Worker' : 'Add Worker'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetWorkerForm();
                  }}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                    placeholder="Enter worker name"
                    className="glass-input w-full"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input
                    type="tel"
                    value={workerForm.mobile}
                    onChange={(e) => setWorkerForm({ ...workerForm, mobile: e.target.value })}
                    placeholder="Enter mobile number"
                    className="glass-input w-full"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={workerForm.role}
                    onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value as 'admin' | 'worker' })}
                    className="glass-input w-full"
                  >
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Device ID (IMEI)</label>
                  <input
                    type="text"
                    value={workerForm.device_id || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, device_id: e.target.value })}
                    placeholder="Enter device IMEI"
                    className="glass-input w-full"
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSaveWorker}
                    disabled={userMutation.isPending}
                    className="flex-1 glass-button bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {userMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      resetWorkerForm();
                    }}
                    className="flex-1 glass-button text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
