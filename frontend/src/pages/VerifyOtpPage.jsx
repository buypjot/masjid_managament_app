import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOtp, sendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

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
    if (!pendingMobile) {
      navigate('/login');
    }
  }, [pendingMobile, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 mb-4 shadow-xl shadow-emerald-950/50">
            <KeyRound className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enter OTP Code</h1>
          <p className="text-slate-400 text-xs mt-2">
            Verification code sent to <span className="text-emerald-400 font-mono font-semibold">{pendingMobile}</span>
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl space-y-6">
          {initialNotice && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
              {initialNotice}
            </div>
          )}

          {resendMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
              {resendMessage}
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={8}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="232323"
                className="w-full py-3.5 px-4 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resendLoading}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
              <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}</span>
            </button>

            <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors">
              Change Mobile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
