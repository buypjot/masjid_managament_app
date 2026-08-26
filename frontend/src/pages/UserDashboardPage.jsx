import React from 'react';
import { ModernUserSidebar } from '../components/ModernUserSidebar';
import { ModernMasjidDashboard } from '../components/ModernMasjidDashboard';

export const UserDashboardPage = () => {
  return (
    <div className="dashboard-theme h-screen overflow-hidden bg-[#f5f7fb]">
      <div className="dashboard-app-content flex h-full min-h-0 overflow-hidden">
        <ModernUserSidebar />
        <div className="min-w-0 min-h-0 flex-1 overflow-hidden">
          <ModernMasjidDashboard />
        </div>
      </div>
    </div>
  );
};
