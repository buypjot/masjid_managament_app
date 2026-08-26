import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Hash,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';

const getValue = (source, keys, fallback = '') => keys.reduce((value, key) => value ?? source?.[key], undefined) ?? fallback;

const getNameParts = (user) => {
  const fullName = getValue(user, ['full_name', 'admin_name', 'name'], '').trim();
  const firstName = getValue(user, ['first_name', 'firstname'], '') || fullName.split(/\s+/)[0] || '';
  const lastName = getValue(user, ['last_name', 'lastname'], '') || fullName.split(/\s+/).slice(1).join(' ');
  return { firstName, lastName, fullName: fullName || [firstName, lastName].filter(Boolean).join(' ') };
};

const formatDate = (value, withTime = false) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

const Skeleton = () => (
  <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl animate-pulse space-y-6">
      <div className="h-16 rounded-3xl bg-white/10" />
      <div className="h-64 rounded-[32px] bg-white/10" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-3xl bg-white/10" />)}</div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]"><div className="h-72 rounded-[28px] bg-white/10" /><div className="h-72 rounded-[28px] bg-white/10" /></div>
    </div>
  </div>
);

const DetailRow = ({ icon: Icon, label, value, accent = 'text-slate-500' }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className={`h-5 w-5 ${accent}`} /></div>
    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value || 'Not available'}</p></div>
  </div>
);

export const UserDashboardOverview = () => {
  const { userInfo, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [mobileNav, setMobileNav] = useState(false);
  const [activeAction, setActiveAction] = useState('profile');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const profile = useMemo(() => {
    const { firstName, lastName, fullName } = getNameParts(userInfo);
    const email = getValue(userInfo, ['email', 'admin_email']);
    const mobile = getValue(userInfo, ['mobile_number', 'admin_mobile', 'phone', 'mobile']);
    const userId = getValue(userInfo, ['user_id', 'userId', 'id']);
    const createdAt = getValue(userInfo, ['created_at', 'createdAt', 'account_created_at', 'joined_at']);
    const role = getValue(userInfo, ['admin_role', 'role'], 'Member');
    const status = getValue(userInfo, ['status'], userInfo?.is_active === false ? 'Inactive' : 'Active');
    const profilePhoto = getValue(userInfo, ['profile_photo', 'avatar', 'photo'], '');
    const fields = [firstName, lastName, email, mobile, userId, createdAt];
    const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    return { firstName, lastName, fullName, email, mobile, userId, createdAt, role, status, profilePhoto, completion };
  }, [userInfo]);

  const initialsName = profile.fullName || profile.firstName || 'User';
  const greetingName = profile.firstName || profile.fullName || 'there';
  const memberSince = formatDate(profile.createdAt);
  const statusActive = String(profile.status).toLowerCase() === 'active';

  const scrollTo = (id, action) => {
    setActiveAction(action);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
    setMobileNav(false);
  };

  if (!userInfo) return <Skeleton />;

  const quickActions = [
    { label: 'My Profile', icon: UserCircle2, tone: 'from-indigo-600 to-blue-500', target: 'profile', action: 'profile' },
    { label: 'Settings', icon: Settings, tone: 'from-violet-600 to-purple-500', target: 'profile', action: 'settings' },
    { label: 'My Activity', icon: Activity, tone: 'from-cyan-600 to-sky-500', target: 'stats', action: 'activity' },
    { label: 'Help Center', icon: HelpCircle, tone: 'from-emerald-600 to-teal-500', target: 'help', action: 'help' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_#f5f3ff_34%,_#ecfeff_65%,_#f8fafc_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 40, -20, 0], y: [0, -25, 20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <motion.div animate={{ x: [0, -50, 25, 0], y: [0, 30, -15, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-28 top-1/3 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-white/60 bg-white/65 p-5 shadow-[12px_0_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl text-white shadow-lg shadow-indigo-500/25">🕌</div>
            <div><p className="text-sm font-black">Masjid Desk</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">User Workspace</p></div>
          </div>
          <nav className="mt-8 space-y-2">
            <button onClick={() => scrollTo('hero', 'profile')} className="flex w-full items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3.5 text-left text-sm font-bold text-white shadow-lg"><LayoutDashboard className="h-5 w-5" /> Dashboard</button>
            <button onClick={() => scrollTo('profile', 'profile')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-indigo-700"><UserCircle2 className="h-5 w-5" /> My Profile</button>
            <button onClick={() => scrollTo('stats', 'activity')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-cyan-700"><Activity className="h-5 w-5" /> My Activity</button>
            <button onClick={() => scrollTo('profile', 'settings')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-violet-700"><Settings className="h-5 w-5" /> Settings</button>
          </nav>
          <div className="mt-auto rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50 p-4">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <p className="mt-3 text-sm font-black">Your private workspace</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">This dashboard is populated from the currently authenticated account only.</p>
          </div>
          <button onClick={() => { logoutUser(); navigate('/login'); }} className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"><LogOut className="h-5 w-5" /> Sign out</button>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
            <div className="flex items-center gap-3"><button onClick={() => setMobileNav(!mobileNav)} className="rounded-xl bg-slate-100 p-2 lg:hidden">{mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal dashboard</p><p className="text-sm font-black text-slate-800">{getValue(userInfo, ['masjid_name'], 'Masjid Workspace')}</p></div></div>
            <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-900">{profile.fullName || 'User'}</p><p className="text-[11px] text-slate-400">{profile.role}</p></div><Avatar src={profile.profilePhoto} name={initialsName} size="md" showStatusDot status="online" /></div>
          </header>

          {mobileNav && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 grid grid-cols-2 gap-2 rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-xl lg:hidden">{quickActions.map(({ label, icon: Icon, action, target }) => <button key={label} onClick={() => scrollTo(target, action)} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-left text-xs font-bold text-slate-700"><Icon className="h-4 w-4 text-indigo-600" />{label}</button>)}</motion.div>}

          <motion.section id="hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-700 via-violet-700 to-cyan-600 p-6 text-white shadow-[0_25px_70px_rgba(79,70,229,0.28)] sm:p-8 lg:p-10">
            <motion.div animate={{ rotate: [0, 8, -5, 0], scale: [1, 1.08, 0.98, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[50px] border-white/10" />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute right-16 top-14 hidden h-20 w-20 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl sm:block" />
            <div className="relative max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-md"><Sparkles className="h-3.5 w-3.5 text-cyan-200" /> Your secure account space</div><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Welcome back, {greetingName}!</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">Everything you need about your account is organized here. Your profile data is taken from the currently authenticated user session.</p><div className="mt-7 flex flex-wrap gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Current date & time</p><p className="mt-1 text-sm font-black">{formatDate(now, true)}</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Account status</p><p className="mt-1 flex items-center gap-1.5 text-sm font-black"><span className={`h-2 w-2 rounded-full ${statusActive ? 'bg-emerald-300' : 'bg-rose-300'}`} />{profile.status}</p></div></div></div>
          </motion.section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(({ label, icon: Icon, tone, target, action }, index) => <motion.button key={label} onClick={() => scrollTo(target, action)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -5, scale: 1.01 }} whileTap={{ scale: 0.98 }} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-5 text-left text-white shadow-lg`}><div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10" /><div className="relative flex items-center justify-between"><div><p className="text-sm font-black">{label}</p><p className="mt-1 text-xs text-white/70">{activeAction === action ? 'Selected' : 'Open workspace'}</p></div><div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><Icon className="h-6 w-6" /></div></div><ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 opacity-50 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></motion.button>)}
          </section>

          <section id="profile" className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-7">
              <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><Avatar src={profile.profilePhoto} name={initialsName} size="xl" showStatusDot status="online" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">My profile</p><h2 className="mt-1 text-2xl font-black text-slate-950">{profile.fullName || 'User profile'}</h2><p className="mt-1 text-sm font-medium text-slate-500">{profile.role}</p></div></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Profile completion</p><p className="mt-1 text-xl font-black text-emerald-700">{profile.completion}%</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><DetailRow icon={UserCircle2} label="First name" value={profile.firstName} accent="text-indigo-500" /><DetailRow icon={UserCircle2} label="Last name" value={profile.lastName} accent="text-violet-500" /><DetailRow icon={Mail} label="Email address" value={profile.email} accent="text-cyan-500" /><DetailRow icon={Phone} label="Mobile number" value={profile.mobile} accent="text-emerald-500" /><DetailRow icon={Hash} label="User ID" value={profile.userId} accent="text-blue-500" /><DetailRow icon={CalendarDays} label="Account created" value={memberSince} accent="text-purple-500" /></div>
            </motion.div>

            <motion.div id="help" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Account snapshot</p><h3 className="mt-1 text-xl font-black">Your account</h3></div><div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white shadow-lg"><ShieldCheck className="h-6 w-6" /></div></div>
              <div className="mt-6 space-y-3"><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="text-sm font-semibold text-slate-500">Status</span><span className={`rounded-full px-3 py-1 text-xs font-black ${statusActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{profile.status}</span></div><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="text-sm font-semibold text-slate-500">Member since</span><span className="text-sm font-black text-slate-800">{memberSince}</span></div><div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">Profile completeness</span><span className="text-sm font-black text-indigo-700">{profile.completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><motion.div initial={{ width: 0 }} animate={{ width: `${profile.completion}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500" /></div></div></div>
              <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 text-xs leading-5 text-slate-600"><HelpCircle className="mb-2 h-5 w-5 text-cyan-600" /><b>Need help?</b><br />Use the existing dashboard navigation for community, collections, properties and notifications. No account data is hardcoded into this view.</div>
            </motion.div>
          </section>

          <section id="stats" className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Logins', value: getValue(userInfo, ['total_logins', 'login_count', 'loginCount'], '—'), icon: Activity, tone: 'from-indigo-500 to-blue-500', note: 'From authenticated account data' },
              { label: 'Account Status', value: profile.status, icon: CheckCircle2, tone: 'from-emerald-500 to-teal-500', note: 'Current account state' },
              { label: 'Member Since', value: memberSince, icon: CalendarDays, tone: 'from-violet-500 to-purple-500', note: 'Account creation date' },
              { label: 'Profile Completion', value: `${profile.completion}%`, icon: UserCircle2, tone: 'from-cyan-500 to-sky-500', note: 'Based on available profile fields' },
            ].map(({ label, value, icon: Icon, tone, note }, index) => <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span><div className={`rounded-xl bg-gradient-to-br ${tone} p-2.5 text-white shadow-md`}><Icon className="h-5 w-5" /></div></div><p className="mt-4 truncate text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-[11px] font-medium text-slate-400">{note}</p></motion.div>)}
          </section>

          <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/70 py-6 text-xs text-slate-400 sm:flex-row"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Live session • {formatDate(now, true)}</div><div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Private authenticated workspace</div></footer>
        </main>
      </div>
    </div>
  );
};
