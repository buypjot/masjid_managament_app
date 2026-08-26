import React from 'react';
import { ModernUserSidebar } from '../components/ModernUserSidebar';
import { ModernMasjidDashboard } from '../components/ModernMasjidDashboard';

export const UserDashboardPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="flex min-h-screen">
        <ModernUserSidebar />
        <div className="min-w-0 flex-1">
          <ModernMasjidDashboard />
        </div>
      </div>
    </div>
  );
};
