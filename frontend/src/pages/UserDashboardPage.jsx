import React from 'react';
import { UserSidebar } from '../components/Sidebar';
import { MasjidDashboard } from '../components/MasjidDashboard';

export const UserDashboardPage = () => {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <UserSidebar />
      <div className="flex-1 flex flex-col min-h-screen justify-between overflow-y-auto">
        <main className="flex-1">
          <MasjidDashboard />
        </main>
        <footer className="text-center py-4 border-t border-slate-200/60 bg-[#f8fafc] text-slate-400 text-xs font-medium shrink-0">
          Masjid Manager • Live PostgreSQL Backend Connected
        </footer>
      </div>
    </div>
  );
};


