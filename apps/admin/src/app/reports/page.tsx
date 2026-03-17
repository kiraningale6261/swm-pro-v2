'use client';

import { useQuery } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Users, MapPin, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  // Fetch data for charts
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-report'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getUsers();
        return data;
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments-report'],
    queryFn: async () => {
      try {
        const data = await supabaseAdmin.getWorkAssignments();
        return data;
      } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
    },
  });

  // Prepare chart data
  const statusData = [
    {
      name: 'Assigned',
      value: assignments.filter((a: any) => a.status === 'assigned').length,
    },
    {
      name: 'Started',
      value: assignments.filter((a: any) => a.status === 'started').length,
    },
    {
      name: 'Completed',
      value: assignments.filter((a: any) => a.status === 'completed').length,
    },
    {
      name: 'Cancelled',
      value: assignments.filter((a: any) => a.status === 'cancelled').length,
    },
  ];

  const roleData = [
    {
      name: 'Workers',
      value: users.filter((u: any) => u.role === 'worker').length,
    },
    {
      name: 'Admins',
      value: users.filter((u: any) => u.role === 'admin').length,
    },
  ];

  const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (usersLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-sky-600" />
            <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          </div>
          <p className="text-gray-600">Performance metrics and system statistics</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-sky-600">{users.length}</p>
              </div>
              <Users className="w-12 h-12 text-sky-200" />
            </div>
          </div>

          <div className="glass-card-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Active Workers</p>
                <p className="text-3xl font-bold text-green-600">
                  {users.filter((u: any) => u.role === 'worker' && u.is_active).length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="glass-card-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Assignments</p>
                <p className="text-3xl font-bold text-blue-600">{assignments.length}</p>
              </div>
              <MapPin className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="glass-card-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {assignments.length > 0
                    ? Math.round(
                        (assignments.filter((a: any) => a.status === 'completed').length /
                          assignments.length) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Assignment Status Chart */}
          <div className="glass-card-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Assignment Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* User Role Distribution */}
          <div className="glass-card-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">User Role Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(0,0,0,0.5)" />
                <YAxis stroke="rgba(0,0,0,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)' }} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assignment Status Table */}
        <div className="glass-card-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Assignment Status Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-cell text-left">Status</th>
                  <th className="table-cell text-left">Count</th>
                  <th className="table-cell text-left">Percentage</th>
                  <th className="table-cell text-left">Trend</th>
                </tr>
              </thead>
              <tbody>
                {statusData.map((item, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="table-cell font-semibold text-gray-800">{item.name}</td>
                    <td className="table-cell text-gray-600">{item.value}</td>
                    <td className="table-cell text-gray-600">
                      {assignments.length > 0
                        ? Math.round((item.value / assignments.length) * 100)
                        : 0}
                      %
                    </td>
                    <td className="table-cell">
                      <div className="w-24 bg-white/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-400 to-blue-600 h-full"
                          style={{
                            width: `${
                              assignments.length > 0
                                ? (item.value / assignments.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="glass-card-lg p-8 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">User Activity Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-cell text-left">User Name</th>
                  <th className="table-cell text-left">Role</th>
                  <th className="table-cell text-left">Status</th>
                  <th className="table-cell text-left">Last Login</th>
                  <th className="table-cell text-left">Device ID</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-cell text-center py-8 text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell font-semibold text-gray-800">{user.name}</td>
                      <td className="table-cell">
                        <span className="badge-active">{user.role}</span>
                      </td>
                      <td className="table-cell">
                        {user.is_active ? (
                          <span className="badge-active">Active</span>
                        ) : (
                          <span className="badge-inactive">Inactive</span>
                        )}
                      </td>
                      <td className="table-cell text-sm text-gray-600">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : '-'}
                      </td>
                      <td className="table-cell text-xs font-mono text-gray-600">
                        {user.device_id ? user.device_id.substring(0, 12) + '...' : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
