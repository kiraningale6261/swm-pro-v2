import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers'; // 1. Providers ko import kiya

export const metadata: Metadata = {
  title: 'SWM PRO Admin Dashboard',
  description: 'Solid Waste Management Pro - Admin Dashboard for Worker & Vehicle Management',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      </head>
      <body className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <div className="min-h-screen">
          {/* 2. Poore children ko Providers ke andar wrap kiya */}
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
