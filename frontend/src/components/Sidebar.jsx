import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Menu, X } from 'lucide-react';
import { ModernUserSidebar } from './ModernUserSidebar';

export const AdminSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Signup Requests', path: '/admin/signup-requests', icon: FileText },
  ];

  const content = (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 h-full flex flex-col justify-between shrink-0 font-sans text-slate-100">
      <div className="space-y-6">
        <div className="flex items-center justify-between lg:justify-start">
          <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Admin Controls
          </h3>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg"
            aria-label="Close Admin Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="mt-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Phase 1 Active</p>
        <p className="text-[11px] mt-0.5 text-slate-500">Registration & Authentication System</p>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex items-center justify-center rounded-xl bg-slate-900 p-2.5 text-white shadow-xl lg:hidden border border-slate-800"
        aria-label="Open Admin Navigation"
      >
        <Menu className="w-5 h-5 text-slate-200" />
      </button>

      <div className="hidden h-screen w-64 shrink-0 lg:block sticky top-0 z-30">
        {content}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close Admin Navigation Overlay"
          />
          <div className="relative h-full w-64 z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export const UserSidebar = () => {
  return <ModernUserSidebar />;
};

