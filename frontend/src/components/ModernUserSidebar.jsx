import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLoggedInUsers } from '../services/api';
import { Avatar } from './Avatar';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import {
  LayoutDashboard, Bell, Users, Wallet, Landmark, Building2, Package, Heart,
  UserCheck, ShieldCheck, PlusCircle, FileText, BarChart3, Settings,
  ChevronDown, ChevronRight, Home, User, IndianRupee, AlertCircle,
  LayoutGrid, Sparkles, Menu, X, LogOut
} from 'lucide-react';

const navMenuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
  { name: 'Community', icon: Users, subItems: [
    { name: 'Families & Members', path: '/dashboard/community/families', icon: Users },
    { name: 'Family Head Changes', path: '/dashboard/community/head-changes', icon: UserCheck },
    { name: 'Member Requests', path: '/dashboard/community/member-requests', icon: FileText },
    { name: 'Family Statements', path: '/dashboard/community/statements', icon: FileText },
    { name: 'Functions & Community Charges', path: '/dashboard/community/functions', icon: PlusCircle },
  ]},
  { name: 'Collections', icon: Wallet, subItems: [
    { name: 'Santha', path: '/dashboard/collections/santha', icon: Wallet },
    { name: 'Santha Arrears', path: '/dashboard/collections/santha-arrears', icon: AlertCircle },
    { name: 'Santha Advances', path: '/dashboard/collections/santha-advances', icon: PlusCircle },
    { name: 'Santha Receipts', path: '/dashboard/collections/santha-receipts', icon: FileText },
    { name: 'Juma Collection', path: '/dashboard/collections/juma-collection', icon: Landmark },
    { name: 'Donations', path: '/dashboard/collections/donations', icon: Heart },
  ]},
  { name: 'Finance', icon: Landmark, subItems: [{ name: 'Income Ledger' }, { name: 'Expense Receipts' }, { name: 'Bank Accounts' }] },
  { name: 'Properties', icon: Building2, subItems: [
    { name: 'Properties & Rent', path: '/dashboard/properties/properties-rent', icon: Home },
    { name: 'Tenants', path: '/dashboard/properties/tenants', icon: User },
    { name: 'Rent Collection', path: '/dashboard/properties/rent-collection', icon: IndianRupee },
    { name: 'Rent Arrears', path: '/dashboard/properties/rent-arrears', icon: AlertCircle },
    { name: 'Hall Bookings', path: '/dashboard/properties/hall-bookings', icon: LayoutGrid },
    { name: 'Cooking Vessels', path: '/dashboard/properties/cooking-vessels', icon: Sparkles },
    { name: 'Property Documents', path: '/dashboard/properties/property-documents', icon: FileText },
  ]},
  { name: 'Assets', icon: Package, subItems: [{ name: 'Equipment Inventory' }, { name: 'Maintenance Records' }] },
  { name: 'Welfare', icon: Heart, subItems: [{ name: 'Zakat Distribution' }, { name: 'Medical Assistance' }, { name: 'Scholarships' }] },
  { name: 'People & Payroll', icon: UserCheck, subItems: [{ name: 'Imam & Staff Payroll' }, { name: 'Duty Rosters' }] },
  { name: 'Trustees & Management', icon: ShieldCheck, subItems: [{ name: 'Trustees & Members' }, { name: 'Meeting Minutes' }] },
  { name: 'Community Services', icon: PlusCircle, subItems: [{ name: 'Nikah & Marriage Charges' }, { name: 'Circumcision / Events' }, { name: 'Janazah Services' }] },
  { name: 'Documents', icon: FileText, subItems: [{ name: 'Certificates' }, { name: 'Official Letters' }] },
  { name: 'Reports', icon: BarChart3, subItems: [{ name: 'Annual Financial Audit' }, { name: 'Collection Statements' }] },
  { name: 'Settings', icon: Settings, subItems: [{ name: 'Masjid Profile' }, { name: 'User Management' }, { name: 'PostgreSQL Sync' }] },
];

const getActiveCategory = (pathname) => {
  for (const item of navMenuItems) {
    if (item.subItems?.some((sub) => sub.path && pathname.startsWith(sub.path))) return item.name;
  }
  return null;
};

export const ModernUserSidebar = () => {
  const { userInfo, logoutUser } = useAuth();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState(() => getActiveCategory(location.pathname));
  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = userInfo?.admin_name || userInfo?.full_name || userInfo?.masjid_name || 'Admin User';
  const userRole = userInfo?.admin_role || 'Masjid Administrator';
  const masjidName = userInfo?.masjid_name || 'Masjid';
  const masjidCity = userInfo?.city || 'Your community';

  useEffect(() => {
    const category = getActiveCategory(location.pathname);
    if (category) setOpenSubmenu(category);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await getLoggedInUsers();
        if (res?.users?.length) setLoggedInUsers(res.users);
      } catch (err) {
        // Keep the sidebar usable even when the optional presence endpoint is unavailable.
      }
    };
    loadUsers();
  }, []);

  const users = loggedInUsers.length ? loggedInUsers : [{
    id: userInfo?.masjid_id || 'current', admin_name: userName, full_name: userName,
    admin_role: userRole, profile_photo: userInfo?.profile_photo, is_current: true,
  }];

  const sidebar = (
    <aside className="flex h-full w-[286px] flex-col border-r border-slate-200/80 bg-white/95 px-4 py-4 shadow-[8px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-xl shadow-lg shadow-indigo-500/20">🕌</div>
          <div>
            <div className="text-sm font-black tracking-tight text-slate-950">Masjid Desk</div>
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">Management Suite</div>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"><X className="h-5 w-5" /></button>
      </div>

      <button onClick={() => setProfileOpen(true)} className="group mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
        <Avatar src={userInfo?.profile_photo} name={userName} size="md" showStatusDot status="online" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-950">{userName}</div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-xs font-bold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />{userRole}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </button>

      <div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-500/15">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-indigo-100">Current Masjid</div>
        <div className="mt-1 truncate text-base font-black">{masjidName}</div>
        <div className="mt-0.5 truncate text-xs font-semibold text-indigo-100">{masjidCity}</div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Active users</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-700">{users.length}</span>
        </div>
        <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
          {users.map((u, idx) => {
            const name = u.is_current ? userName : (u.admin_name || u.full_name || u.masjid_name || 'User');
            return <button key={u.id || idx} onClick={() => setProfileOpen(true)} className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition ${u.is_current ? 'border border-indigo-100 bg-white shadow-sm' : 'hover:bg-white'}`}>
              <Avatar src={u.is_current ? (userInfo?.profile_photo || u.profile_photo) : u.profile_photo} name={name} size="sm" showStatusDot status="online" />
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-slate-800">{name}</span><span className="block truncate text-xs font-semibold text-slate-500">{u.is_current ? userRole : (u.admin_role || 'Administrator')}</span></span>
              {u.is_current && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">YOU</span>}
            </button>;
          })}
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {navMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === location.pathname;
          const open = openSubmenu === item.name;

          if (!item.subItems) {
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-[13px] font-extrabold transition ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
                {item.name === 'Notifications' && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-rose-500" />
                )}
              </NavLink>
            );
          }

          return (
            <div key={item.name}>
              <button
                onClick={() => setOpenSubmenu(open ? null : item.name)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-[13px] font-extrabold transition ${
                  open ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.name}
                </span>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {open && (
                <div className="ml-5 mt-1 space-y-1 border-l-2 border-indigo-100 pl-3">
                  {item.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    return sub.path ? (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-[13px] font-bold transition ${
                            isActive
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                          }`
                        }
                      >
                        {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                        <span>{sub.name}</span>
                      </NavLink>
                    ) : (
                      <div
                        key={sub.name}
                        className="rounded-lg px-2.5 py-2 text-xs sm:text-[13px] font-semibold text-slate-400"
                      >
                        {sub.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-bold text-slate-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />System online</div>
        <div className="mt-1 font-medium">Secure workspace connected to your live data.</div>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex items-center justify-center rounded-xl bg-slate-950 p-2.5 text-white shadow-xl lg:hidden"
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden h-screen w-[286px] shrink-0 lg:block sticky top-0 z-30">
        {sidebar}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            aria-label="Close Menu"
          />
          <div className="relative h-full w-[286px] max-w-[88vw] z-10">
            {sidebar}
          </div>
        </div>
      )}

      <ProfileSettingsModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};
