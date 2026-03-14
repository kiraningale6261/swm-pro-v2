'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, MapPin, QrCode, BarChart3, LogOut, Map } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/management', label: 'Management', icon: Users },
  { href: '/city-map', label: 'City Map', icon: Map },
  { href: '/dashboard', label: 'GPS Tracking', icon: MapPin },
  { href: '/qr-manager', label: 'QR Manager', icon: QrCode },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gradient-to-b from-sky-900 to-blue-900 text-white h-screen flex flex-col fixed left-0 top-0 shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold">SWM</span>
          </div>
          PRO
        </h1>
        <p className="text-xs text-blue-200 mt-1">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-sky-400 text-blue-900 font-semibold shadow-lg'
                    : 'text-blue-100 hover:bg-blue-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-blue-700 space-y-2">
        <div className="px-4 py-2 text-xs text-blue-200">
          <p>Logged in as Admin</p>
          <p className="text-blue-300 font-semibold mt-1">SWM PRO v2.0</p>
        </div>
        <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-all text-sm font-semibold">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
