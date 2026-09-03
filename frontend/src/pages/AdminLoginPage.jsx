import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, ShieldCheck, User } from 'lucide-react';

const adminFeatures = [
  'Review and approve Masjid registrations',
  'Manage secure administrative access',
  'Monitor the Masjid management platform',
];

const MosqueAnimation = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.18),transparent_25%),linear-gradient(145deg,#063f3b_0%,#052d32_48%,#020f18_100%)]" />
    <motion.div
      className="absolute left-[12%] top-[18%] h-28 w-28 rounded-full bg-[#d4af37]/20 blur-3xl"
      animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.9, 1.08, 0.9] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />

    {[0, 1, 2, 3, 4, 5].map((i) => (
      <motion.span
        key={i}
        className="absolute h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.8)]"
        style={{ left: `${12 + i * 13}%`, top: `${20 + (i % 3) * 13}%` }}
        animate={{ opacity: [0.15, 1, 0.15], y: [0, -15, 0], scale: [0.8, 1.25, 0.8] }}
        transition={{ duration: 2.8 + i * 0.5, delay: i * 0.45, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    <motion.div
      className="absolute left-[-15%] top-[24%] flex items-center gap-1 text-white/55"
      animate={{ x: ['0vw', '125%'] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
    >
      <span className="text-xs">⌁</span><span className="text-lg">⌁</span>
    </motion.div>

    <svg viewBox="0 0 900 560" className="absolute bottom-[10%] left-1/2 w-[94%] -translate-x-1/2 drop-shadow-[0_30px_50px_rgba(0,0,0,0.45)]">
      <defs>
        <linearGradient id="adminMosque" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b5a55" /><stop offset="1" stopColor="#021f24" /></linearGradient>
      </defs>
      <g fill="url(#adminMosque)">
        <rect x="120" y="315" width="660" height="155" rx="10" />
        <rect x="205" y="280" width="490" height="48" rx="5" />
        <path d="M240 280 Q450 75 660 280 Z" />
        <rect x="438" y="90" width="24" height="95" rx="4" />
        <path d="M420 92h60l-30-38z" />
        <rect x="145" y="150" width="58" height="320" rx="4" />
        <path d="M132 150h84l-42-58z" />
        <rect x="697" y="150" width="58" height="320" rx="4" />
        <path d="M684 150h84l-42-58z" />
        <path d="M360 470v-95q0-85 90-85t90 85v95z" fill="#03181d" />
        <path d="M215 470v-82q0-42 40-42t40 42v82z" fill="#03181d" />
        <path d="M605 470v-82q0-42 40-42t40 42v82z" fill="#03181d" />
      </g>
      <g fill="#d4af37">
        <circle cx="450" cy="70" r="5" opacity="0.95" />
        <circle cx="174" cy="205" r="4" opacity="0.7" />
        <circle cx="726" cy="205" r="4" opacity="0.7" />
        <circle cx="450" cy="225" r="4" opacity="0.75" />
      </g>
    </svg>

    {[0, 1, 2, 3].map((i) => (
      <motion.div
        key={`walker-${i}`}
        className="absolute bottom-[18%] h-12 w-3 rounded-full bg-white/35"
        style={{ left: `${25 + i * 12}%` }}
        animate={{ y: [3, -3, 3], opacity: [0.25, 0.7, 0.25], x: [0, 5, 0] }}
        transition={{ duration: 3.2 + i * 0.4, delay: i * 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#010c13] via-[#021a1f]/80 to-transparent" />
  </div>
);

export const AdminLoginPage = () => {
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both admin username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminLogin(username.trim(), password.strip ? password.strip() : password);
      loginAdmin(res.access_token, res.user_info);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6faf8]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <MosqueAnimation />
          <div className="relative z-10 flex min-h-screen items-end p-10 xl:p-14">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-xl text-white">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-xl"><ShieldCheck className="h-4 w-4 text-[#d4af37]" /> Secure Administration</div>
              <h1 className="text-4xl font-black leading-tight xl:text-6xl">Manage your<br /><span className="text-[#d4af37]">Masjid system</span> with confidence.</h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 xl:text-base">A calm, secure workspace for administrators to review registrations and manage the Masjid platform.</p>
              <div className="mt-7 space-y-2.5">{adminFeatures.map((feature) => <motion.div key={feature} whileHover={{ x: 4 }} className="flex items-center gap-2.5 text-xs font-semibold text-white/80"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" />{feature}</motion.div>)}</div>
            </motion.div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_85%_15%,rgba(15,118,110,0.10),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7faf9_55%,#edf7f3_100%)] px-5 py-10 sm:px-8 lg:px-14 xl:px-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75 }} className="relative z-10 w-full max-w-md">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-2xl shadow-lg shadow-emerald-900/20">🕌</div>
              <div><div className="text-sm font-black text-slate-950">Masjid Desk</div><div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f766e]">Admin Control Center</div></div>
            </div>

            <div className="rounded-[30px] border border-white/90 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-8">
              <div className="mb-7">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0f766e]"><KeyRound className="h-5 w-5" /></div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950">Administrator Login</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Sign in with your system administrator credentials to continue.</p>
              </div>

              {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /><span>{error}</span></motion.div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Admin Username</label>
                  <div className="group relative"><User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0f766e]" /><input type="text" value={username} onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }} placeholder="Admin" className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-500/10" required /></div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Admin Password</label>
                  <div className="group relative"><Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0f766e]" /><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }} placeholder="Enter admin password" className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-500/10" required /></div>
                </motion.div>

                <motion.button type="submit" disabled={loading} whileHover={{ y: -1, scale: 1.005 }} whileTap={{ scale: 0.985 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0b7f75] to-[#064e3b] px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-emerald-900/20 transition-shadow hover:shadow-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating Admin...</> : <>Login to Admin Panel <ArrowRight className="h-4 w-4" /></>}
                </motion.button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /> Protected Admin Access <span className="h-px flex-1 bg-slate-200" /></div>
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-slate-600"><div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" /><span>Your admin authentication and authorization security remain active.</span></div></div>
            </div>
            <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Authorized administrators only</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
};
