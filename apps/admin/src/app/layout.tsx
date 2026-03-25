'use client';

import './globals.css';
import Providers from './providers';
import { 
  LayoutDashboard, Users, Map, QrCode, 
  Settings, ShieldCheck, Truck, Droplets, 
  Trash2, MapPin, Wind, Warehouse, Navigation 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuGroups = [
    {
      title: "Module 0: Admin & Global",
      items: [
        { name: 'Live War Room', icon: LayoutDashboard, path: '/dashboard' },
        // Fixed Path to avoid 404
        { name: 'Ward Designer', icon: Map, path: '/hierarchy/designer' },
        { name: 'Wards Mini-Maps', icon: Navigation, path: '/dashboard/wards' },
      ]
    },
    {
      title: "Staff & Fleet",
      items: [
        { name: 'Staff Registry', icon: Users, path: '/management/staff' },
        { name: 'Vehicle Assets', icon: Truck, path: '/management/vehicles' },
        { name: 'QR Manager', icon: QrCode, path: '/management/qr-manager' },
      ]
    },
    {
      title: "Operations (Tasks)",
      items: [
        { name: 'Waste Collection', icon: Trash2, path: '/monitoring/collections' },
        { name: 'Road Sweeping', icon: Wind, path: '/monitoring/sweeping' },
        { name: 'Drainage Clean', icon: Droplets, path: '/monitoring/drainage' },
      ]
    }
  ];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      </head>
      
      <body className="bg-slate-50 font-sans antialiased text-slate-900 overflow-hidden">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            
            {/* --- WeVois Style Sidebar --- */}
            <aside className="w-80 bg-white border-r border-slate-100 p-8 flex flex-col gap-10 hidden md:flex h-full overflow-y-auto shrink-0 z-50">
              <div className="flex items-center gap-4 px-2">
                <div className="bg-slate-900 p-3 rounded-[1.25rem] shadow-xl">
                  <Trash2 className="text-white w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">SWM PRO</h1>
                  <p className="text-sky-500 text-[9px] font-black uppercase tracking-widest mt-1 italic">Version 2.0.0</p>
                </div>
              </div>

              <nav className="flex flex-col gap-8">
                {menuGroups.map((group, idx) => (
                  <div key={idx} className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] px-4">
                      {group.title}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <Link 
                          key={item.path} 
                          href={item.path} 
                          className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] font-bold text-[11px] uppercase tracking-wider transition-all duration-300 group ${
                            pathname === item.path 
                            ? 'bg-sky-500 text-white shadow-xl shadow-sky-100 scale-105 translate-x-2' 
                            : 'text-slate-400 hover:bg-slate-50 hover:text-sky-500'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110`} /> 
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-slate-50 flex flex-col gap-2">
                <Link href="/settings" className="flex items-center gap-4 px-6 py-3 font-black text-[9px] uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <Link href="/audit" className="flex items-center gap-4 px-6 py-3 font-black text-[9px] uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors">
                  <ShieldCheck className="w-4 h-4" /> Audit Logs
                </Link>
              </div>
            </aside>

            {/* --- Main Dashboard Area (Fixed Padding for Full Map) --- */}
            <main className="flex-1 bg-slate-50 relative h-full overflow-hidden">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}
