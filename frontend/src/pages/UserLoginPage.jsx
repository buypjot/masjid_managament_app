import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Phone, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export const UserLoginPage = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { savePendingMobile } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleaned = mobileNumber.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 10) {
      setError('Please enter a valid mobile number (min 10 digits).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await sendOtp(cleaned);
      savePendingMobile(cleaned);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 mb-4 shadow-xl shadow-emerald-950/50">
            <span className="text-3xl">🕌</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Masjid Mobile Login</h1>
          <p className="text-slate-400 text-xs mt-2">
            Enter your registered mobile number to receive a secure WhatsApp OTP.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 919600698893"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter number used during Masjid registration (e.g., 919600698893).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Account...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Haven't registered your Masjid yet?{' '}
            <Link to="/signup" className="text-emerald-400 font-semibold hover:underline">
              Submit Registration Form
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
