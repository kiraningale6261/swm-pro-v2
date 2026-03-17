'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users, MapPin, QrCode, Zap } from 'lucide-react';
import LiveAuthMonitor from '@/components/LiveAuthMonitor';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="glass-card-lg p-8 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
            SWM PRO Admin Dashboard
          </h1>
          <p className="text-gray-600">Solid Waste Management - Worker & Vehicle Management System</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Management Card */}
          <Link href="/management">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full">
              <div className="p-6">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Management</h3>
                <p className="text-sm text-gray-600">Add & manage workers, vehicles, and ward assignments</p>
              </div>
            </div>
          </Link>

          {/* Dashboard Card */}
          <Link href="/dashboard">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full">
              <div className="p-6">
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Dashboard</h3>
                <p className="text-sm text-gray-600">View 10 ward maps with live GPS trails</p>
              </div>
            </div>
          </Link>

          {/* QR Manager Card */}
          <Link href="/qr-manager">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full">
              <div className="p-6">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">QR Manager</h3>
                <p className="text-sm text-gray-600">Create & track red-to-green QR codes</p>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/reports">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full">
              <div className="p-6">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Reports</h3>
                <p className="text-sm text-gray-600">Analytics and performance metrics</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="glass-card-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-sky-600">--</p>
              <p className="text-sm text-gray-600 mt-2">Active Workers</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-green-600">--</p>
              <p className="text-sm text-gray-600 mt-2">Vehicles</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">--</p>
              <p className="text-sm text-gray-600 mt-2">Wards</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">--</p>
              <p className="text-sm text-gray-600 mt-2">QR Scans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Auth Monitor */}
      <div className="max-w-7xl mx-auto">
        <LiveAuthMonitor />
      </div>
    </div>
  );
}   
