import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Loader2, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { sendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthVideoBackground } from '../components/AuthVideoBackground';

export const UserLoginPage = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { savePendingMobile } = useAuth();
  const navigate = useNavigate();
  const cleanedMobile = useMemo(() => mobileNumber.replace(/\D/g, ''), [mobileNumber]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!cleanedMobile || cleanedMobile.length < 10) {
      setError('Please enter a valid mobile number (min 10 digits).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await sendOtp(cleanedMobile);
      savePendingMobile(cleanedMobile);
      navigate('/verify-otp', { state: { sentMessage: res.message } });
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to send OTP. Ensure your mobile number is approved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthVideoBackground>
      <main className="relative z-10 min-h-screen overflow-y-auto">
        <div className="grid min-h-screen lg:grid-cols-2">
          <section className="relative hidden min-h-screen lg:flex lg:flex-col lg:justify-end lg:p-12 xl:p-16">
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="max-w-xl text-white">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5 text-[#d4af37]" /> Smart Masjid Operations</div>
              <h1 className="text-4xl font-black leading-tight xl:text-6xl">Welcome to Masjid<span className="block text-[#d4af37]">Management System</span></h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-white/75 xl:text-base">Manage your mosque operations efficiently with one secure, peaceful workspace for your community.</p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-medium text-white/80">{['Secure access', 'Community ready', 'Financial control'].map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 backdrop-blur-md"><Check className="h-3.5 w-3.5 text-[#d4af37]" /> {item}</span>)}</div>
            </motion.div>
          </section>

          <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-20">
            <motion.div initial={{ opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: 'easeOut' }} className="w-full max-w-md">
              <div className="mb-5 flex items-center gap-3 text-white"><motion.div whileHover={{ scale: 1.05, rotate: -3 }} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-2xl shadow-xl shadow-black/20">🕌</motion.div><div><div className="text-sm font-black">Masjid Desk</div><div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">Financial System</div></div></div>

              <div className="rounded-[30px] border border-white/20 bg-white/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
                <div className="mb-7"><div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]"><ShieldCheck className="h-3.5 w-3.5" /> Secure WhatsApp access</div><h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Welcome back</h2><p className="mt-2 text-sm leading-5 text-slate-500">Sign in with your registered Masjid mobile number. We’ll send a one-time password securely.</p></div>

                {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /><span>{error}</span></motion.div>}

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Registered Mobile Number</label>
                    <div className="group relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[#0f766e]" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => { setMobileNumber(e.target.value); if (error) setError(''); }}
                        placeholder="Enter mobile number"
                        aria-label="Registered mobile number"
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-950 caret-slate-950 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-500/10"
                        style={{ WebkitTextFillColor: '#020617' }}
                        required
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Use the mobile number approved during Masjid registration.</p>
                  </motion.div>

                  <motion.button type="submit" disabled={loading} whileHover={{ y: -1, scale: 1.005 }} whileTap={{ scale: 0.985 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0b7f75] to-[#064e3b] px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-emerald-900/25 transition-shadow hover:shadow-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending secure OTP...</> : <>Continue with OTP <ArrowRight className="h-4 w-4" /></>}</motion.button>
                </form>

                <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /> Secure access <span className="h-px flex-1 bg-slate-200" /></div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-xs leading-5 text-slate-600"><div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" /><span>Your WhatsApp OTP authentication and security remain active.</span></div></div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><Link to="/admin/login" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:text-[#0f766e] hover:shadow-lg">Admin Login</Link><Link to="/signup" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-bold text-[#0f766e] transition-all hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-lg">Create Account</Link></div>
              </div>
              <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">Trusted workspace for Masjid administration</p>
            </motion.div>
          </section>
        </div>
      </main>
    </AuthVideoBackground>
  );
};
