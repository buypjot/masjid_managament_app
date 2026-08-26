import React from 'react';
import { ModernUserSidebar } from '../components/ModernUserSidebar';
import { ModernMasjidDashboard } from '../components/ModernMasjidDashboard';

export const UserDashboardPage = () => {
  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-[#f5f7fb]">
      <ModernUserSidebar />
      <div className="min-w-0 h-full flex-1 overflow-y-auto">
        <ModernMasjidDashboard />
      </div>
    </div>
  );
};

