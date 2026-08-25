import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

export const Navbar = () => {
  const { isUserAuthenticated, isAdminAuthenticated, userInfo, adminInfo, logoutUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleUserLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const isAdminPage = location.pathname.startsWith('/admin');
  const isDashboardPage = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/notifications');

  if (isDashboardPage) {
    return null;
  }


  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition-transform">
              <span className="text-xl">🕌</span>
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                Masjid Desk
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">
                Financial System
              </span>
            </div>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center space-x-4">
            {isAdminAuthenticated && isAdminPage ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Admin: {adminInfo?.username || 'Administrator'}</span>
                </div>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Admin Logout</span>
                </button>
              </div>
            ) : isUserAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>{userInfo?.masjid_name || 'Masjid Dashboard'}</span>
                </div>
                <button
                  onClick={handleUserLogout}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/signup"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-105"
                >
                  Register Masjid
                </Link>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  Masjid Login
                </Link>
                <Link
                  to="/admin/login"
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Admin</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
