'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Router import kiya
import { supabase } from '@/lib/supabase'; // Supabase client import kiya
import { Loader2, Users, MapPin, QrCode, Zap } from 'lucide-react';
import LiveAuthMonitor from '@/components/LiveAuthMonitor';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check karo ki banda logged in hai ya nahi
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 2. Agar login nahi hai, toh seedha /login par bhejo
        router.replace('/login');
      } else {
        // 3. Agar login hai, toh loading khatam karo
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600 font-bold animate-pulse">Verifying Admin Session...</p>
        </div>
      </div>
    );
  }

  // Aapka asli Business Dashboard ka Design yahan se shuru hota hai (Bina change kiye)
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="glass-card-lg p-8 mb-8 border border-white/40">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
            SWM PRO Admin Dashboard
          </h1>
          <p className="text-gray-600 font-medium italic">Solid Waste Management - Security Active 🔐</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/management">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full border border-white/50">
              <div className="p-6">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Management</h3>
                <p className="text-sm text-gray-600">Workers, vehicles, and ward assignments</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full border border-white/50">
              <div className="p-6">
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Live Map</h3>
                <p className="text-sm text-gray-600">Real-time GPS tracking & trails</p>
              </div>
            </div>
          </Link>

          <Link href="/qr-manager">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full border border-white/50">
              <div className="p-6">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">QR Manager</h3>
                <p className="text-sm text-gray-600">Track red-to-green QR points</p>
              </div>
            </div>
          </Link>

          <Link href="/reports">
            <div className="glass-card hover:glass-card-lg transition-all cursor-pointer group h-full border border-white/50">
              <div className="p-6">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Reports</h3>
                <p className="text-sm text-gray-600">Analytics and performance logs</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="glass-card-lg p-8 border border-white/40">
          <h2 className="text-2xl font-black text-gray-800 mb-6 tracking-tight uppercase text-xs">Live System Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center">
              <p className="text-3xl font-black text-sky-600 tracking-tighter">--</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Active Workers</p>
            </div>
            <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center">
              <p className="text-3xl font-black text-green-600 tracking-tighter">--</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Fleet Size</p>
            </div>
            <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center">
              <p className="text-3xl font-black text-blue-600 tracking-tighter">--</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Total Wards</p>
            </div>
            <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center">
              <p className="text-3xl font-black text-purple-600 tracking-tighter">--</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Points Scanned</p>
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
