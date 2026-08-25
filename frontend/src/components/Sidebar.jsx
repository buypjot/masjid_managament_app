import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLoggedInUsers } from '../services/api';
import { Avatar } from './Avatar';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import {
  LayoutDashboard,
  Bell,
  Users,
  Wallet,
  Landmark,
  Building2,
  Package,
  Heart,
  UserCheck,
  ShieldCheck,
  PlusCircle,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  User,
  IndianRupee,
  AlertCircle,
  LayoutGrid,
  Sparkles
} from 'lucide-react';

export const AdminSidebar = () => {
  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Signup Requests', path: '/admin/signup-requests', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Admin Controls
          </h3>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
      </div>
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Phase 1 Active</p>
        <p className="text-[11px] mt-0.5 text-slate-500">Registration & Authentication System</p>
      </div>
    </aside>
  );
};

export const UserSidebar = () => {
  const { userInfo } = useAuth();
  const location = useLocation();

  const navMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, hasSubmenu: false },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, hasSubmenu: false },
    {
      name: 'Community',
      icon: Users,
      hasSubmenu: true,
      subItems: [
        { name: 'Families & Members', path: '/dashboard/community/families', icon: Users },
        { name: 'Family Head Changes', path: '/dashboard/community/head-changes', icon: UserCheck },
        { name: 'Member Requests', path: '/dashboard/community/member-requests', icon: FileText },
        { name: 'Family Statements', path: '/dashboard/community/statements', icon: FileText },
        { name: 'Functions & Community Charges', path: '/dashboard/community/functions', icon: PlusCircle },
      ]
    },
    {
      name: 'Collections',
      icon: Wallet,
      hasSubmenu: true,
      subItems: [
        { name: 'Santha', path: '/dashboard/collections/santha', icon: Wallet },
        { name: 'Santha Arrears', path: '/dashboard/collections/santha-arrears', icon: AlertCircle },
        { name: 'Santha Advances', path: '/dashboard/collections/santha-advances', icon: PlusCircle },
        { name: 'Santha Receipts', path: '/dashboard/collections/santha-receipts', icon: FileText },
        { name: 'Juma Collection', path: '/dashboard/collections/juma-collection', icon: Landmark },
        { name: 'Donations', path: '/dashboard/collections/donations', icon: Heart },
      ]
    },
    {
      name: 'Finance',
      icon: Landmark,
      hasSubmenu: true,
      subItems: ['Income Ledger', 'Expense Receipts', 'Bank Accounts']
    },
    {
      name: 'Properties',
      icon: Building2,
      hasSubmenu: true,
      subItems: [
        { name: 'Properties & Rent', path: '/dashboard/properties/properties-rent', icon: Home },
        { name: 'Tenants', path: '/dashboard/properties/tenants', icon: User },
        { name: 'Rent Collection', path: '/dashboard/properties/rent-collection', icon: IndianRupee },
        { name: 'Rent Arrears', path: '/dashboard/properties/rent-arrears', icon: AlertCircle },
        { name: 'Hall Bookings', path: '/dashboard/properties/hall-bookings', icon: LayoutGrid },
        { name: 'Cooking Vessels', path: '/dashboard/properties/cooking-vessels', icon: Sparkles },
        { name: 'Property Documents', path: '/dashboard/properties/property-documents', icon: FileText },
      ]
    },
    {
      name: 'Assets',
      icon: Package,
      hasSubmenu: true,
      subItems: ['Equipment Inventory', 'Maintenance Records']
    },
    {
      name: 'Welfare',
      icon: Heart,
      hasSubmenu: true,
      subItems: ['Zakat Distribution', 'Medical Assistance', 'Scholarships']
    },
    {
      name: 'People & Payroll',
      icon: UserCheck,
      hasSubmenu: true,
      subItems: ['Imam & Staff Payroll', 'Duty Rosters']
    },
    {
      name: 'Trustees & Management',
      icon: ShieldCheck,
      hasSubmenu: true,
      subItems: ['Trustees & Members', 'Meeting Minutes']
    },
    {
      name: 'Community Services',
      icon: PlusCircle,
      hasSubmenu: true,
      subItems: ['Nikah & Marriage Charges', 'Circumcision / Events', 'Janazah Services']
    },
    {
      name: 'Documents',
      icon: FileText,
      hasSubmenu: true,
      subItems: ['Certificates', 'Official Letters']
    },
    {
      name: 'Reports',
      icon: BarChart3,
      hasSubmenu: true,
      subItems: ['Annual Financial Audit', 'Collection Statements']
    },
    {
      name: 'Settings',
      icon: Settings,
      hasSubmenu: true,
      subItems: ['Masjid Profile', 'User Management', 'PostgreSQL Sync']
    },
  ];

  const getActiveCategory = (pathname) => {
    if (pathname.includes('/community')) return 'Community';
    if (pathname.includes('/collections')) return 'Collections';
    for (const item of navMenuItems) {
      if (item.hasSubmenu && item.subItems) {
        const matches = item.subItems.some((sub) => {
          const path = typeof sub === 'object' ? sub.path : '';
          return path && pathname.startsWith(path);
        });
        if (matches) return item.name;
      }
    }
    return null;
  };

  const [openSubmenu, setOpenSubmenu] = useState(() => getActiveCategory(location.pathname));

  React.useEffect(() => {
    const category = getActiveCategory(location.pathname);
    if (category) {
      setOpenSubmenu(category);
    }
  }, [location.pathname]);

  const toggleSubmenu = (menuName) => {
    setOpenSubmenu(openSubmenu === menuName ? null : menuName);
  };

  const masjidName = userInfo?.masjid_name || 'Ismail Masjid';
  const masjidCity = userInfo?.city || 'Tenkasi';
  const userName = userInfo?.admin_name || userInfo?.full_name || userInfo?.masjid_name || 'Admin User';
  const userRole = userInfo?.admin_role || 'Masjid Administrator';

  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getLoggedInUsers();
        if (res && res.users && res.users.length > 0) {
          setLoggedInUsers(res.users);
        } else if (userInfo) {
          setLoggedInUsers([
            {
              id: userInfo.masjid_id || 1,
              admin_name: userName,
              full_name: userName,
              admin_role: userRole,
              profile_photo: userInfo.profile_photo || null,
              is_current: true,
              status: 'Online',
            },
          ]);
        }
      } catch (err) {
        if (userInfo) {
          setLoggedInUsers([
            {
              id: userInfo.masjid_id || 1,
              admin_name: userName,
              full_name: userName,
              admin_role: userRole,
              profile_photo: userInfo.profile_photo || null,
              is_current: true,
              status: 'Online',
            },
          ]);
        }
      }
    };
    fetchUsers();
  }, [userInfo, userName, userRole]);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 p-4 min-h-screen flex flex-col justify-between shrink-0 shadow-sm font-sans">
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-6rem)] pr-1">

        {/* Top Profile & Designation Header (Dynamic from Profile Settings) */}
        <div
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center space-x-3 px-2 py-1.5 rounded-xl hover:bg-slate-100/70 transition-colors cursor-pointer group border border-slate-100 hover:border-slate-200"
          title="Click to edit profile & designation in Profile Settings"
        >
          <Avatar
            src={userInfo?.profile_photo}
            name={userName}
            size="md"
            showStatusDot={true}
            status="online"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
              {userName}
            </h2>
            <p className="text-[11px] font-bold text-emerald-600 leading-tight truncate mt-0.5 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline shrink-0" />
              <span className="truncate">{userRole}</span>
            </p>
          </div>
        </div>

        {/* Current Masjid Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-0.5">
          <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
            Current Masjid
          </span>
          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">{masjidName}</h3>
          <p className="text-[11px] font-medium text-slate-500 leading-tight">{masjidCity}</p>
        </div>

        {/* Logged-in Users Section (Left Side Requirement 1) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Logged-in Users</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {loggedInUsers.length || 1} Active
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {loggedInUsers.map((u, idx) => (
              <div
                key={u.id || idx}
                onClick={() => setIsProfileModalOpen(true)}
                className={`flex items-center space-x-2.5 p-2 rounded-lg transition-all cursor-pointer ${
                  u.is_current ? 'bg-white border border-slate-200 shadow-sm' : 'hover:bg-slate-100/80'
                }`}
                title="Click to manage profile settings"
              >
                <Avatar
                  src={u.is_current ? (userInfo?.profile_photo || u.profile_photo) : u.profile_photo}
                  name={u.admin_name || u.full_name || u.masjid_name}
                  size="sm"
                  showStatusDot={true}
                  status="online"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate leading-tight flex items-center justify-between">
                    <span className="truncate">{u.is_current ? userName : (u.admin_name || u.full_name || u.masjid_name)}</span>
                    {u.is_current && (
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded ml-1 shrink-0">You</span>
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                    {u.is_current ? userRole : (u.admin_role || 'Masjid Administrator')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1 text-xs font-medium text-slate-600">
          {navMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard');
            const isSubmenuOpen = openSubmenu === item.name;

            return (
              <div key={item.name} className="space-y-1">
                {item.hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      isSubmenuOpen ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{item.name}</span>
                    </div>
                    {isSubmenuOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#0f172a] text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </NavLink>
                )}

                {/* Submenu Dropdown Items */}
                {item.hasSubmenu && isSubmenuOpen && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-slate-100 ml-4">
                    {item.subItems.map((sub) => {
                      const isObj = typeof sub === 'object' && sub !== null;
                      const subName = isObj ? sub.name : sub;
                      const subPath = isObj ? sub.path : '#';
                      const SubIcon = isObj && sub.icon ? sub.icon : null;
                      return isObj ? (
                        <NavLink
                          key={subName}
                          to={subPath}
                          className={({ isActive }) =>
                            `flex items-center space-x-2.5 py-2 px-2.5 rounded-xl text-xs transition-all ${
                              isActive
                                ? 'bg-[#0f172a] text-white font-bold shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                            }`
                          }
                        >
                          {SubIcon && (
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                location.pathname === subPath ? 'text-white' : 'text-slate-500'
                              }`}
                            />
                          )}
                          <span className="truncate">{subName}</span>
                        </NavLink>
                      ) : (
                        <div
                          key={subName}
                          className="flex items-center space-x-2.5 py-2 px-2.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 cursor-pointer font-medium"
                        >
                          {SubIcon && <SubIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />}
                          <span className="truncate">{subName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer User Info */}
      <div
        onClick={() => setIsProfileModalOpen(true)}
        className="pt-3 border-t border-slate-100 flex items-center justify-between px-1 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors p-1.5"
        title="Open Profile Settings"
      >
        <div className="flex items-center space-x-3 truncate">
          <Avatar
            src={userInfo?.profile_photo}
            name={userName}
            size="sm"
            showStatusDot={true}
            status="online"
          />
          <div className="truncate">
            <div className="text-xs font-extrabold text-slate-900 leading-tight truncate">{userName}</div>
            <div className="text-[10px] font-medium text-slate-400 leading-tight truncate">{userRole}</div>
          </div>
        </div>
        <Settings className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveSuccess={(updated) => {
          setLoggedInUsers((prev) =>
            prev.map((u) =>
              u.is_current
                ? {
                    ...u,
                    admin_name: updated.admin_name || updated.full_name,
                    admin_role: updated.admin_role,
                    profile_photo: updated.profile_photo,
                  }
                : u
            )
          );
        }}
      />
    </aside>
  );
};
