'use client';

import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { 
  LayoutDashboard, Users, Map, QrCode, 
  BarChart3, Settings, ShieldCheck, 
  Truck, Droplets, Trash2, MapPin 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Active link check karne ke liye

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // Current path fetch kar rahe hain

  // Sidebar Menu Items - Updated with Ward Designer
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Hierarchy', icon: MapPin, path: '/hierarchy' },
    { name: 'Ward Designer', icon: Map, path: '/hierarchy/designer' }, // Naya Designer Page
    { name: 'Workers', icon: Users, path: '/management' },
    { name: 'QR Manager', icon: QrCode, path: '/qr-manager' },
    { name: 'Collections', icon: Trash2, path: '/monitoring/collections' },
    { name: 'Sweeping', icon: Map, path: '/monitoring/sweeping' },
    { name: 'Drainage', icon: Droplets, path: '/monitoring/drainage' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
  ];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Leaflet CSS for Map Rendering */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      </head>
      
      <body className="bg-slate-50 font-sans antialiased text-slate-900">
        <Providers>
          <div className="flex min-h-screen">
            
            {/* --- iPhone Style White Sidebar --- */}
            <aside className="w-80 bg-white border-r border-slate-100 p-10 flex flex-col gap-12 hidden md:flex sticky top-0 h-screen overflow-y-auto z-50">
              <div className="flex items-center gap-4">
                <div className="bg-sky-500 p-3 rounded-[1.25rem] shadow-xl shadow-sky-100">
                  <Trash2 className="text-white w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">SWM PRO</h1>
                  <p className="text-sky-500 text-[10px] font-bold uppercase tracking-widest mt-1">Version 2.0.0</p>
                </div>
              </div>

              <nav className="flex flex-col gap-2">
                {menuItems.map((item) => (
                  <Link 
                    key={item.path} 
                    href={item.path} 
                    className={`flex items-center gap-5 px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all duration-300 group ${
                      pathname.startsWith(item.path) 
                      ? 'bg-sky-500 text-white shadow-2xl shadow-sky-100 scale-105' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-sky-500 hover:translate-x-2'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${pathname.startsWith(item.path) ? 'text-white' : ''}`} /> 
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Extra Utility Menu */}
              <div className="mt-auto pt-8 border-t border-slate-50 flex flex-col gap-3">
                <Link href="/settings" className={`flex items-center gap-4 px-8 py-4 font-bold text-[10px] uppercase transition-colors ${pathname === '/settings' ? 'text-sky-500' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <Link href="/audit" className={`flex items-center gap-4 px-8 py-4 font-bold text-[10px] uppercase transition-colors ${pathname === '/audit' ? 'text-sky-500' : 'text-slate-400 hover:text-slate-600'}`}>
                  <ShieldCheck className="w-4 h-4" /> Audit Logs
                </Link>
              </div>
            </aside>

            {/* --- Main Content Area --- */}
            <main className="flex-1 p-10 overflow-x-hidden relative">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}
