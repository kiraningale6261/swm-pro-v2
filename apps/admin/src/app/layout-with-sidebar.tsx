'use client';

import React, { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';

export default function LayoutWithSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
