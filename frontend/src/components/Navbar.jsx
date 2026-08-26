import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

export const Navbar = () => {
  const { isUserAuthenticated, isAdminAuthenticated, userInfo, adminInfo, logoutUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleUserLogout = () => { logoutUser(); navigate('/login'); };
  const handleAdminLogout = () => { logoutAdmin(); navigate('/admin/login'); };
  const isAdminPage = location.pathname.startsWith('/admin');
  const isDashboardPage = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/notifications');

  if (location.pathname === '/login' || location.pathname === '/signup' || isDashboardPage) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-xl shadow-lg shadow-emerald-900/40 transition-transform group-hover:scale-105">🕌</div>
          <div><span className="bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-lg font-bold text-transparent">Masjid Desk</span><span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Financial System</span></div>
        </Link>
        <div className="flex items-center space-x-4">
          {isAdminAuthenticated && isAdminPage ? <div className="flex items-center space-x-4"><div className="flex items-center space-x-2 rounded-lg border border-emerald-800/60 bg-emerald-950/60 px-3 py-1.5 text-xs font-medium text-emerald-300"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span>Admin: {adminInfo?.username || 'Administrator'}</span></div><button onClick={handleAdminLogout} className="flex items-center space-x-1.5 rounded-lg border border-rose-800/60 bg-rose-950/50 px-3.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-900/80"><LogOut className="h-3.5 w-3.5" /><span>Admin Logout</span></button></div> : isUserAuthenticated ? <div className="flex items-center space-x-4"><div className="flex items-center space-x-2 rounded-lg border border-emerald-800/60 bg-emerald-950/60 px-3 py-1.5 text-xs font-medium text-emerald-300"><UserCheck className="h-4 w-4 text-emerald-400" /><span>{userInfo?.masjid_name || 'Masjid Dashboard'}</span></div><button onClick={handleUserLogout} className="flex items-center space-x-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"><LogOut className="h-3.5 w-3.5" /><span>Logout</span></button></div> : <div className="flex items-center space-x-3"><Link to="/signup" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-105 hover:bg-emerald-500">Register Masjid</Link><Link to="/login" className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700">Masjid Login</Link><Link to="/admin/login" className="flex items-center space-x-1 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-white"><KeyRound className="h-3.5 w-3.5 text-slate-500" /><span>Admin</span></Link></div>}
        </div>
      </div>
    </nav>
  );
};
