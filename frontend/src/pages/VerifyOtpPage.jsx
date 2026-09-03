import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOtp, sendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, RefreshCw, KeyRound, MessageCircle, LockKeyhole } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthVideoBackground } from '../components/AuthVideoBackground';

export const VerifyOtpPage = () => {
  const { pendingMobile, loginUser } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();
  const location = useLocation();
  const initialNotice = location.state?.sentMessage || '';

  useEffect(() => {
    if (!pendingMobile) navigate('/login');
  }, [pendingMobile, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setError('Please enter the OTP code sent to your phone.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await verifyOtp(pendingMobile, otpCode.trim());
      loginUser(res.access_token, res.user_info);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid OTP. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    setError('');
    setResendMessage('');
    try {
      const res = await sendOtp(pendingMobile);
      setResendMessage(res.message || 'New OTP sent to your WhatsApp!');
      setCountdown(60);
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthVideoBackground videoEnabled={false}>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-[#031f20]/25" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[620px]"
        >
          <div className="mb-5 flex items-center justify-center gap-3 text-white drop-shadow-lg">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-xl shadow-lg shadow-emerald-950/30">🕌</div>
            <div>
              <div className="text-xl font-black tracking-tight">Masjid Desk</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">Financial System</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="px-6 pb-7 pt-8 sm:px-10 sm:pt-9">
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -4, 0], boxShadow: ['0 10px 30px rgba(15,118,110,.12)', '0 14px 38px rgba(15,118,110,.25)', '0 10px 30px rgba(15,118,110,.12)'] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[#0f766e]"
                >
                  <KeyRound className="h-9 w-9" />
                </motion.div>
                <div className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-[#0f766e]">Secure verification</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Verify OTP Code</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                  Enter the 6-digit OTP code sent to<br />
                  <span className="font-extrabold text-[#0f766e]">+91 {pendingMobile}</span>
                </p>
              </div>

              <div className="mt-7 space-y-4">
                {(initialNotice || resendMessage) && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800">
                    <MessageCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div><div className="font-bold">OTP sent successfully via WhatsApp</div><div className="mt-0.5 text-emerald-700/80">{resendMessage || initialNotice || 'Please enter the code below to continue.'}</div></div>
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleVerify} className="space-y-5">
                  <div>
                    <div className="mb-3 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500"><span className="h-px flex-1 bg-slate-200" /><span>6-Digit OTP Code</span><span className="h-px flex-1 bg-slate-200" /></div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                      placeholder="••••••"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-5 text-center font-mono text-3xl font-bold tracking-[0.55em] text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 sm:text-4xl"
                      autoFocus
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0f766e] to-[#064e3b] px-5 py-4 text-base font-extrabold text-white shadow-xl shadow-emerald-900/20 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Verifying Code...</> : <>Verify & Login <ArrowRight className="h-5 w-5" /></>}
                  </motion.button>
                </form>

                <div className="flex items-center gap-4 pt-2"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs font-bold text-slate-400">OR</span><div className="h-px flex-1 bg-slate-200" /></div>

                <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
                  <div className="text-slate-500">Didn't receive the code?</div>
                  <button type="button" onClick={handleResend} disabled={countdown > 0 || resendLoading} className="flex items-center gap-2 font-bold text-[#0f766e] transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400">
                    <RefreshCw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                    {countdown > 0 ? `Resend OTP (${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')})` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-10">
              <div className="flex items-center justify-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#0f766e]"><ShieldCheck className="h-5 w-5" /></div>
                <div><div className="text-sm font-extrabold text-slate-800">Your account is 100% secure</div><div className="mt-0.5 text-xs text-slate-500">We never share your OTP with anyone</div></div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-white/75"><LockKeyhole className="h-3.5 w-3.5" /> Protected WhatsApp OTP verification <span className="text-[#d4af37]">•</span> <Link to="/login" className="transition hover:text-white">Change mobile</Link></div>
        </motion.div>
      </main>
    </AuthVideoBackground>
  );
};