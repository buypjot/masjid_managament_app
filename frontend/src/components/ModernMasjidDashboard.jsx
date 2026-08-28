import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityFamilies } from '../services/api';
import { Avatar } from './Avatar';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import {
  Search, Bell, Plus, Users, Wallet, AlertCircle, Layers3, ArrowUpRight,
  ArrowRight, X, Settings, LogOut, ChevronDown, Sparkles, ShieldCheck,
  Activity, CalendarDays, BarChart3, Building2, Heart, Landmark, FileText,
  SlidersHorizontal, CheckCircle2, Menu, IndianRupee
} from 'lucide-react';

const quickModules = [
  { title: 'Community & Functions', description: 'Families, members and community charges', icon: Users, path: '/dashboard/community/families', tone: 'indigo' },
  { title: 'Santha Collection', description: 'View live family dues and collections', icon: Wallet, path: '/dashboard/collections/santha', tone: 'emerald' },
  { title: 'Property & Rent', description: 'Manage properties and rent collections', icon: Building2, path: '/dashboard/properties/properties-rent', tone: 'amber' },
  { title: 'Asset Maintenance', description: 'Track equipment and maintenance records', icon: Layers3, path: '/dashboard/assets', tone: 'cyan' },
];

const toneClasses = {
  indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-200 hover:bg-indigo-100',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100',
  amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100',
  cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700 hover:border-cyan-200 hover:bg-cyan-100',
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ModernMasjidDashboard = () => {
  const { userInfo, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ families: 0, members: 0, santhaCollected: 0, pendingSantha: 0, availableBalance: 0 });
  const [activities, setActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [query, setQuery] = useState('');
  const [formData, setFormData] = useState({ familyIdName: '', amount: '', paymentType: 'Santha Payment', notes: '' });

  const masjidName = userInfo?.masjid_name || 'Your Masjid';
  const userName = userInfo?.admin_name || userInfo?.full_name || userInfo?.masjid_name || 'Administrator';
  const userRole = userInfo?.admin_role || 'Masjid Administrator';

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCommunityFamilies();
        if (!active || !res) return;
        const families = res.families || [];
        const familyCount = res.stats?.total_families ?? families.length;
        const membersCount = res.stats?.total_members ?? families.reduce((sum, family) => sum + (family.member_count || 1), 0);
        const collected = res.stats?.total_collected ?? families.reduce((sum, family) => sum + (family.collected_amount || 0), 0);
        const pending = res.stats?.total_pending ?? families.reduce((sum, family) => sum + (family.pending_amount || 0), 0);
        setMetrics({ families: familyCount, members: membersCount, santhaCollected: collected, pendingSantha: pending, availableBalance: collected });
        setMonthlyData(res.monthly_collections || []);
        if (res.activities?.length) setActivities(res.activities);
        else setActivities(families.filter((f) => f.collected_amount > 0).map((f) => ({ id: f.id, title: 'Santha Collection', subtitle: f.family_name, amount: f.collected_amount, type: 'income', time: 'Recently collected' })));
      } catch (err) {
        console.warn('Network error fetching dashboard stats:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filteredModules = useMemo(() => quickModules.filter((module) => `${module.title} ${module.description}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const currentDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const maxMonth = Math.max(...monthlyData.map((m) => Number(m.amountValue ?? String(m.amount || '0').replace(/[^0-9.]/g, '')) || 0), 1);

  const submitCollection = (event) => {
    event.preventDefault();
    const amount = Number.parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const newActivity = { id: Date.now(), title: formData.paymentType, subtitle: formData.familyIdName || 'Registered Family', amount, type: 'income', time: 'Just now' };
    setActivities((items) => [newActivity, ...items]);
    setMetrics((prev) => ({ ...prev, santhaCollected: prev.santhaCollected + amount, availableBalance: prev.availableBalance + amount, pendingSantha: Math.max(0, prev.pendingSantha - amount) }));
    setFormData({ familyIdName: '', amount: '', paymentType: 'Santha Payment', notes: '' });
    setShowCollect(false);
  };

  return (
    <div className="mds-reference-dashboard relative min-h-screen overflow-hidden bg-[#f5f7fb] font-sans text-slate-900">
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-300/10 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 pl-16 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:hidden"><div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-2 text-center text-lg">🕌</div><span className="font-black">Masjid Desk</span></div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 lg:flex"><span>Workspace</span><span className="text-slate-300">/</span><span className="font-black text-slate-950">Dashboard</span></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowSearch(true)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"><Search className="h-4 w-4" /></button>
            <div className="relative">
              <button onClick={() => setShowNotifications((v) => !v)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
              {showNotifications && <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-slate-950">System alerts</div><div className="text-[10px] text-slate-400">Latest workspace activity</div></div><button onClick={() => setShowNotifications(false)}><X className="h-4 w-4 text-slate-400" /></button></div><div className="space-y-2"><div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><div className="text-xs font-bold text-amber-900">Pending Santha</div><div className="mt-1 text-[11px] text-amber-700">Review current family dues from Collections.</div></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-xs font-bold text-emerald-900">Live data connected</div><div className="mt-1 text-[11px] text-emerald-700">Dashboard metrics are loaded from your existing API.</div></div></div></div>}
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu((v) => !v)} className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-slate-200 hover:bg-white"><div className="hidden text-right sm:block"><div className="text-xs font-black text-slate-950">{userName}</div><div className="text-[10px] font-medium text-slate-400">{userRole}</div></div><Avatar src={userInfo?.profile_photo} name={userName} size="sm" showStatusDot status="online" /><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button>
              {showUserMenu && <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-black text-slate-950">{userName}</div><div className="mt-0.5 truncate text-[10px] text-slate-500">{userInfo?.email || 'Authenticated account'}</div><div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Online</div></div><button onClick={() => { setShowUserMenu(false); setShowProfile(true); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"><Settings className="h-4 w-4 text-indigo-600" />Profile Settings</button><button onClick={() => { logoutUser(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Logout</button></div>}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-2xl shadow-indigo-950/20 sm:p-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-indigo-100"><Sparkles className="h-4 w-4 text-cyan-300" />Live workspace</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {userName.split(' ')[0]}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">{masjidName} is ready for today. Keep your community, collections and operations moving from one calm workspace.</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"><div className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">Today</div><div className="mt-1 flex items-center gap-2 text-xs sm:text-sm font-bold"><CalendarDays className="h-4 w-4 text-cyan-300" />{currentDate}</div></div><button onClick={() => setShowCollect(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"><Plus className="h-4 w-4" />Collect Santha</button></div></div>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Families & Members', value: `${metrics.families}`, secondary: `${metrics.members} members`, icon: Users, accent: 'indigo', caption: 'Registered community' },
            { label: 'Total Collections', value: formatCurrency(metrics.santhaCollected), secondary: 'Santha + Juma + donations', icon: IndianRupee, accent: 'emerald', caption: 'Collected value' },
            { label: 'Pending Santha', value: formatCurrency(metrics.pendingSantha), secondary: 'Live family dues', icon: AlertCircle, accent: 'amber', caption: 'Needs attention' },
            { label: 'Available Balance', value: formatCurrency(metrics.availableBalance), secondary: 'Cash + bank', icon: Layers3, accent: 'cyan', caption: 'Current balance' },
          ].map((card, index) => { const Icon = card.icon; return <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"><div className="flex items-start justify-between"><div><div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{card.label}</div>{loading ? <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-slate-100" /> : <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{card.value}</div>}<div className="mt-1 text-xs font-semibold text-slate-500">{card.secondary}</div></div><div className={`rounded-2xl p-3 ${card.accent === 'indigo' ? 'bg-indigo-50 text-indigo-600' : card.accent === 'emerald' ? 'bg-emerald-50 text-emerald-600' : card.accent === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-600'}`}><Icon className="h-5 w-5" /></div></div><div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{card.caption}</div></motion.div>; })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400"><BarChart3 className="h-4 w-4 text-indigo-500" />Collection trend</div><h2 className="mt-1 text-lg font-black text-slate-950">Monthly Collection</h2></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-600">12 month view</span></div>
            <div className="flex h-64 items-end gap-2 overflow-hidden px-1 sm:gap-3">{Array.from({ length: 12 }, (_, index) => { const item = monthlyData.find((m) => Number(m.month) === index + 1) || monthlyData[index] || {}; const amount = Number(item.amountValue ?? String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0; const height = amount ? Math.max(10, Math.round((amount / maxMonth) * 100)) : 5; return <div key={index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative flex w-full flex-1 items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.8, delay: index * 0.04 }} className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 via-violet-500 to-cyan-400 opacity-90 transition group-hover:opacity-100" title={formatCurrency(amount)} /></div><span className="text-xs font-bold text-slate-500">{monthNames[index]}</span></div>; })}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400"><Activity className="h-4 w-4 text-emerald-500" />Live activity</div><h2 className="mt-1 text-lg font-black text-slate-950">Recent Activity</h2></div><button onClick={() => navigate('/dashboard/collections/santha')} className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800">View all</button></div><div className="space-y-2">{loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 rounded-xl p-2"><div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" /><div className="flex-1"><div className="h-3 w-32 animate-pulse rounded bg-slate-100" /><div className="mt-2 h-2 w-20 animate-pulse rounded bg-slate-100" /></div></div>) : activities.slice(0, 5).map((activity, index) => <div key={activity.id || index} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-indigo-50/30"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ArrowUpRight className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-900">{activity.title || 'Collection'}</div><div className="truncate text-xs font-semibold text-slate-500">{activity.subtitle || 'Registered family'} · {activity.time || 'Recently'}</div></div><div className="text-xs sm:text-sm font-black text-emerald-600">+{formatCurrency(activity.amount)}</div></div>)}{!loading && activities.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><Activity className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-2 text-xs font-bold text-slate-500">No activity yet</div><div className="mt-1 text-xs font-semibold text-slate-400">Your live collection activity will appear here.</div></div>}</div></motion.div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Workspace</div><h2 className="mt-1 text-lg font-black text-slate-950">Quick modules</h2></div><SlidersHorizontal className="h-5 w-5 text-slate-300" /></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">{quickModules.map((module) => { const Icon = module.icon; return <button key={module.title} onClick={() => navigate(module.path)} className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[module.tone]}`}><div className="rounded-xl bg-white/80 p-2.5 shadow-sm"><Icon className="h-4 w-4" /></div><span className="min-w-0 flex-1"><span className="block text-xs sm:text-sm font-black">{module.title}</span><span className="mt-0.5 block text-xs font-semibold opacity-80">{module.description}</span></span><ArrowRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-1" /></button>; })}</div></div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/20"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" /><div className="relative flex h-full flex-col justify-between gap-6"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider"><ShieldCheck className="h-4 w-4" />Secure workspace</div><h2 className="mt-4 max-w-lg text-2xl font-black tracking-tight">Everything your Masjid team needs, in one place.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Use the navigation to manage community members, collections, properties, services and reports while keeping your existing live data connected.</p></div><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-2">Live API</span><span className="rounded-full bg-white/10 px-3 py-2">Responsive</span><span className="rounded-full bg-white/10 px-3 py-2">Secure account</span></div></div></div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/70 bg-white/70 px-4 py-5 text-center text-xs font-semibold text-slate-500 backdrop-blur"><span>{masjidName}</span> · Live PostgreSQL Backend Connected</footer>

      {showSearch && <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-20 backdrop-blur-sm" onMouseDown={() => setShowSearch(false)}><div className="w-full max-w-2xl rounded-3xl border border-white/40 bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center gap-3"><Search className="h-5 w-5 text-indigo-500" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dashboard modules..." className="flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400" /><button onClick={() => setShowSearch(false)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-4 space-y-2">{filteredModules.map((module) => <button key={module.title} onClick={() => { setShowSearch(false); navigate(module.path); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left hover:bg-slate-50"><module.icon className="h-5 w-5 text-indigo-500" /><span className="flex-1"><span className="block text-xs sm:text-sm font-black">{module.title}</span><span className="text-xs text-slate-500">{module.description}</span></span><ArrowRight className="h-4 w-4 text-slate-300" /></button>)}{filteredModules.length === 0 && <div className="py-6 text-center text-xs text-slate-400">No matching modules.</div>}</div></div></div>}

      {showCollect && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><motion.form initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onSubmit={submitCollection} className="w-full max-w-lg rounded-3xl border border-white/50 bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Quick entry</div><h3 className="mt-1 text-xl font-black">Collect Santha</h3></div><button type="button" onClick={() => setShowCollect(false)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Family / Member</span><input value={formData.familyIdName} onChange={(e) => setFormData({ ...formData, familyIdName: e.target.value })} placeholder="Registered family" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</span><input type="number" min="1" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="₹ Amount" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required /></label><label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Payment type</span><select value={formData.paymentType} onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"><option>Santha Payment</option><option>Juma Collection</option><option>Donation</option><option>Function Charge</option></select></label></div><label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Notes</span><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="3" className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowCollect(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:bg-indigo-700">Save entry</button></div></motion.form></div>}

      <ProfileSettingsModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};
