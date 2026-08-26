import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Loader2, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { sendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';

const stars = [
  { x: '10%', y: '18%', delay: 0.2 },
  { x: '24%', y: '28%', delay: 1.1 },
  { x: '42%', y: '13%', delay: 0.6 },
  { x: '58%', y: '24%', delay: 1.7 },
  { x: '76%', y: '14%', delay: 0.9 },
  { x: '88%', y: '30%', delay: 1.4 },
];

const birds = [
  { left: '-8%', top: '18%', duration: 18, delay: 0 },
  { left: '-18%', top: '28%', duration: 24, delay: 5 },
  { left: '-12%', top: '11%', duration: 28, delay: 10 },
];

const walkers = [
  { left: '17%', delay: 0, scale: 0.82, duration: 8.5 },
  { left: '28%', delay: 1.8, scale: 0.68, duration: 9.5 },
  { left: '40%', delay: 3.2, scale: 0.56, duration: 10.5 },
];

const Cloud = ({ className = '', duration = 28, delay = 0 }) => (
  <motion.div
    className={`absolute h-10 w-28 rounded-full bg-white/10 blur-md ${className}`}
    animate={{ x: ['-8%', '115%'] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
  >
    <div className="absolute -top-4 left-5 h-10 w-10 rounded-full bg-white/10" />
    <div className="absolute -top-5 left-12 h-12 w-12 rounded-full bg-white/10" />
  </motion.div>
);

const Bird = ({ left, top, duration, delay }) => (
  <motion.svg
    viewBox="0 0 80 32"
    className="absolute h-5 w-10 text-white/45"
    style={{ left, top }}
    animate={{ x: ['0vw', '110vw'], y: [0, -10, 2, -8, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
  >
    <path d="M3 17c7-9 14-9 22 0 7-9 14-9 22 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </motion.svg>
);

const WalkingPerson = ({ left, delay, scale, duration }) => (
  <motion.div
    className="absolute bottom-[18%] left-0"
    style={{ left }}
    initial={{ y: 4, opacity: 0.2, scale }}
    animate={{ y: [4, 0, 4], opacity: [0.2, 0.9, 0.2], x: [0, 8, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg viewBox="0 0 48 78" className="h-16 w-10 text-white/70" aria-hidden="true">
      <circle cx="24" cy="10" r="6" fill="currentColor" />
      <path d="M24 18v25M24 25L14 35M24 25l10 10M24 43L15 60M24 43l10 17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </motion.div>
);

const MosqueScene = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(212,175,55,0.16),transparent_26%),linear-gradient(180deg,#062b35_0%,#0b4b4c_48%,#052e2d_100%)]" />
    <motion.div
      className="absolute left-[12%] top-[14%] h-32 w-32 rounded-full bg-[#f4d889]/20 blur-2xl"
      animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.92, 1.05, 0.92] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />

    {stars.map((star, index) => (
      <motion.span
        key={index}
        className="absolute h-1 w-1 rounded-full bg-[#f4d889] shadow-[0_0_12px_rgba(244,216,137,0.9)]"
        style={{ left: star.x, top: star.y }}
        animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.35, 0.8] }}
        transition={{ duration: 2.6, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    {birds.map((bird, index) => <Bird key={index} {...bird} />)}
    <Cloud className="top-[22%] -left-20 scale-75" duration={32} />
    <Cloud className="top-[34%] -left-32 scale-110 opacity-70" duration={40} delay={8} />
    <Cloud className="top-[10%] -left-28 scale-50 opacity-50" duration={36} delay={14} />

    <div className="absolute bottom-[15%] left-1/2 h-40 w-[76%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-2xl" />

    <svg viewBox="0 0 900 520" className="absolute bottom-[8%] left-1/2 w-[94%] -translate-x-1/2 text-[#031f20] drop-shadow-[0_18px_35px_rgba(0,0,0,0.35)]">
      <g fill="currentColor">
        <rect x="100" y="300" width="700" height="150" rx="8" />
        <rect x="185" y="270" width="530" height="45" rx="4" />
        <path d="M230 270 Q450 75 670 270 Z" />
        <path d="M335 270 Q450 160 565 270 Z" fill="#0b4b4c" />
        <rect x="438" y="102" width="24" height="80" />
        <path d="M420 103h60l-30-34z" />
        <circle cx="450" cy="84" r="5" fill="#f4d889" />
        <rect x="125" y="155" width="55" height="295" rx="4" />
        <path d="M112 155h81l-40-55z" />
        <rect x="694" y="155" width="55" height="295" rx="4" />
        <path d="M681 155h81l-40-55z" />
        <path d="M370 450v-95q0-80 80-80t80 80v95z" fill="#062b2b" />
        <path d="M215 450v-82q0-38 38-38t38 38v82z" fill="#062b2b" />
        <path d="M609 450v-82q0-38 38-38t38 38v82z" fill="#062b2b" />
      </g>
      <g fill="#f4d889" opacity="0.72">
        <circle cx="150" cy="205" r="4" />
        <circle cx="731" cy="205" r="4" />
        <circle cx="450" cy="238" r="4" />
      </g>
    </svg>

    {walkers.map((walker, index) => <WalkingPerson key={index} {...walker} />)}

    {[0, 1, 2, 3, 4, 5, 6, 7].map((particle) => (
      <motion.span
        key={particle}
        className="absolute bottom-[17%] h-1.5 w-1.5 rounded-full bg-[#f4d889]/60"
        style={{ left: `${18 + particle * 10}%` }}
        animate={{ y: [0, -42, -8, -55], opacity: [0, 0.8, 0.25, 0] }}
        transition={{ duration: 5 + particle * 0.4, delay: particle * 0.7, repeat: Infinity, ease: 'easeOut' }}
      />
    ))}

    <div className="absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-[#021d1d] via-[#052e2d]/70 to-transparent" />
  </div>
);

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
    <main className="min-h-screen overflow-hidden bg-[#f7faf9] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <MosqueScene />
          <div className="absolute inset-0 bg-gradient-to-br from-[#042f35]/20 via-transparent to-[#021c1e]/50" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-10 xl:p-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="max-w-xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 text-[#f4d889]" />
                <span>Smart Masjid Operations</span>
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white xl:text-5xl">
                Welcome to Masjid
                <span className="block text-[#f4d889]">Management System</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 xl:text-base">
                Manage your mosque operations efficiently with one secure, beautifully designed workspace for your community.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-medium text-white/75">
                {['Secure access', 'Community ready', 'Financial control'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
                    <Check className="h-3.5 w-3.5 text-[#f4d889]" />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(15,118,110,0.10),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f7faf9_52%,#eef6f3_100%)] px-5 py-10 sm:px-8 lg:px-12 xl:px-20">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-100/60 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="mb-8 flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: -3, scale: 1.04 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-2xl shadow-lg shadow-emerald-900/20"
              >
                🕌
              </motion.div>
              <div>
                <div className="text-sm font-black tracking-tight text-slate-900">Masjid Desk</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f766e]">Financial System</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8">
              <div className="mb-7">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure WhatsApp access
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Welcome back</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Sign in with your registered Masjid mobile number. We’ll send a one-time password securely.</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Registered Mobile Number</label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-[#0f766e]">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => {
                        setMobileNumber(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="e.g. 919600698893"
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-500/10"
                      required
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Use the mobile number approved during Masjid registration.</p>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: -1, scale: 1.005 }}
                  whileTap={{ scale: 0.985 }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0b7f75] to-[#064e3b] px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-emerald-900/20 transition-shadow hover:shadow-emerald-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending secure OTP...
                    </>
                  ) : (
                    <>
                      Continue with OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Secure access
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-slate-600">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                  <span>Your existing WhatsApp OTP authentication and backend security remain unchanged.</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
                Haven’t registered your Masjid yet?{' '}
                <Link to="/signup" className="font-bold text-[#0f766e] transition-colors hover:text-[#064e3b] hover:underline">
                  Submit Registration Form
                </Link>
              </div>
            </div>

            <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Trusted workspace for Masjid administration</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
};
