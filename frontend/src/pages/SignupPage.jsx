import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { publicSignup } from '../services/api';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, ChevronDown, FileText, Globe, Loader2, Lock, Mail, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { AuthVideoBackground } from '../components/AuthVideoBackground';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0f766e] focus:bg-white focus:ring-2 focus:ring-emerald-500/10';
const labelClass = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-700';

const Field = ({ label, name, value, onChange, placeholder, icon: Icon, type = 'text', required = false }) => (
  <div className="min-w-0">
    <label className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />}
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} ${Icon ? 'pl-10' : ''}`} required={required} />
    </div>
  </div>
);

const PhoneField = ({ label, name, value, onChange, required = false }) => (
  <div className="min-w-0">
    <label className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
    <div className="flex">
      <div className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 text-xs font-extrabold text-slate-700">🇮🇳 +91</div>
      <input type="tel" name={name} value={value} onChange={onChange} placeholder="Enter mobile number" className={`${inputClass} rounded-l-none`} required={required} />
    </div>
  </div>
);

export const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    masjid_name: '', masjid_reg_id: '', mobile_number: '', whatsapp_number: '', email: '', website: '',
    street: '', area_locality: '', city: '', pincode: '', state: '', country: 'India',
    admin_name: '', admin_mobile: '', admin_email: '', admin_role: '', is_authorized: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResponse, setSuccessResponse] = useState(null);

  const indianStates = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Rajasthan', 'Bihar', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Assam', 'Odisha', 'Jammu & Kashmir', 'Other'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.masjid_name.trim()) return 'Masjid Name is required.';
    if (!formData.mobile_number.trim()) return 'Masjid Mobile Number is required.';
    const mobileDigits = formData.mobile_number.replace(/\D/g, '');
    if (mobileDigits.length < 10 || mobileDigits.length > 15) return 'Masjid Mobile Number must be a valid 10 to 15 digit number.';
    if (!formData.email.trim()) return 'Masjid Email Address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return 'Please enter a valid email address.';
    if (!formData.street.trim()) return 'Address (Street/House No.) is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state) return 'Please select a State.';
    if (!formData.admin_name.trim()) return 'Administrator Full Name is required.';
    if (!formData.admin_mobile.trim()) return 'Administrator Mobile Number is required.';
    if (!formData.admin_email.trim()) return 'Administrator Email Address is required.';
    if (!formData.is_authorized) return 'You must confirm authorization to create an account on behalf of this masjid.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        masjid_name: formData.masjid_name.trim(), mobile_number: formData.mobile_number.trim(), email: formData.email.trim(), street: formData.street.trim(), city: formData.city.trim(),
        masjid_reg_id: formData.masjid_reg_id.trim() || undefined, whatsapp_number: formData.whatsapp_number.trim() || undefined, website: formData.website.trim() || undefined,
        area_locality: formData.area_locality.trim() || undefined, pincode: formData.pincode.trim() || undefined, state: formData.state || undefined, country: formData.country || 'India',
        admin_name: formData.admin_name.trim() || undefined, admin_mobile: formData.admin_mobile.trim() || undefined, admin_email: formData.admin_email.trim() || undefined, admin_role: formData.admin_role.trim() || undefined,
      };
      const response = await publicSignup(payload);
      setSuccessResponse(response);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : 'Failed to submit registration. Please check your network connection and try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthVideoBackground videoEnabled={false}>
      <main className="h-screen overflow-hidden px-3 py-3 sm:px-5 sm:py-4 lg:px-8">
        <div className="mx-auto flex h-full max-w-7xl flex-col">
          <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex shrink-0 items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-lg shadow-lg">🕌</div>
              <div><div className="text-sm font-black sm:text-base">Masjid Desk</div><div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Create Masjid Account</div></div>
            </div>
            <Link to="/login" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold backdrop-blur-md transition-all hover:bg-white/20 sm:px-4">Already have an account? <span className="text-[#d4af37]">Back to Login</span></Link>
          </motion.header>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/20 bg-white/95 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
            {successResponse ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div>
                  <h2 className="mt-5 text-2xl font-black text-slate-950">Registration Submitted</h2>
                  <p className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-5 text-emerald-900">{successResponse.message || 'Your Masjid registration request has been submitted successfully. Our administrator will review your details.'}</p>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm"><div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Request ID</span><b>#{successResponse.id}</b></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Status</span><b className="capitalize text-amber-700">{successResponse.status}</b></div></div>
                  <div className="mt-4 flex justify-center gap-2"><button onClick={() => setSuccessResponse(null)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Submit Another</button><Link to="/login" className="flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-xs font-bold text-white shadow-lg">Go to Sign In <ArrowRight className="h-4 w-4" /></Link></div>
                </motion.div>
              </div>
            ) : (
              <div className="grid h-full lg:grid-cols-[230px_1fr]">
                <aside className="hidden bg-gradient-to-b from-[#073f3b] to-[#031f20] p-6 text-white lg:flex lg:flex-col lg:justify-between">
                  <div>
                    <div className="text-3xl">🕌</div>
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Masjid Management</div>
                    <h1 className="mt-2 text-2xl font-black leading-tight">Create your<br /><span className="text-[#d4af37]">Masjid account</span></h1>
                    <p className="mt-3 text-xs leading-5 text-white/65">One trusted workspace for your community, collections and operations.</p>
                  </div>
                  <div className="space-y-2">
                    {['Community', 'Finance & Collections', 'Properties', 'Services'].map((item, i) => <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/80"><span className="mr-2 text-[#d4af37]">0{i + 1}</span>{item}</div>)}
                    <div className="mt-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-3 text-xs leading-4 text-white/65"><ShieldCheck className="mb-1.5 h-4 w-4 text-[#d4af37]" />Secure registration review before account approval.</div>
                  </div>
                </aside>

                <section className="min-w-0 p-4 sm:p-5 lg:p-6">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div><div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">Registration · Step 01 + 02</div><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Masjid & Administrator Information</h2></div>
                    <div className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-[#0f766e] sm:block">Secure & Encrypted</div>
                  </div>
                  {error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</motion.div>}

                  <form onSubmit={handleSubmit} className="flex h-[calc(100%-58px)] flex-col justify-between">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 xl:grid-cols-3">
                        <Field label="Masjid Name" name="masjid_name" value={formData.masjid_name} onChange={handleChange} placeholder="Enter masjid name" icon={Building2} required />
                        <Field label="Registration / ID" name="masjid_reg_id" value={formData.masjid_reg_id} onChange={handleChange} placeholder="Enter registration or ID" icon={FileText} />
                        <PhoneField label="Masjid Mobile" name="mobile_number" value={formData.mobile_number} onChange={handleChange} required />
                        <PhoneField label="WhatsApp Number" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} />
                        <Field label="Masjid Email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" icon={Mail} type="email" required />
                        <Field label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" icon={Globe} type="url" />
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 xl:grid-cols-4">
                        <div className="col-span-2 xl:col-span-2"><Field label="Address (Street / House No.)" name="street" value={formData.street} onChange={handleChange} placeholder="Enter door / house no., street address" icon={MapPin} required /></div>
                        <Field label="Area / Locality" name="area_locality" value={formData.area_locality} onChange={handleChange} placeholder="Enter area / locality" required />
                        <Field label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Enter city" required />
                        <Field label="PIN Code" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter PIN code" required />
                        <div><label className={labelClass}>State <span className="text-rose-500">*</span></label><div className="relative"><select name="state" value={formData.state} onChange={handleChange} className={`${inputClass} appearance-none`} required><option value="">Select state</option>{indianStates.map((st) => <option key={st} value={st}>{st}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>
                        <div><label className={labelClass}>Country <span className="text-rose-500">*</span></label><div className="relative"><select name="country" value={formData.country} onChange={handleChange} className={`${inputClass} appearance-none`}><option value="India">India</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <div className="mb-2.5 flex items-center justify-between"><div><div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">Step 02 · Administrator</div><h3 className="mt-0.5 text-lg font-black text-slate-950">Authorized Person</h3></div><ShieldCheck className="h-5 w-5 text-[#0f766e]" /></div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 xl:grid-cols-4">
                          <Field label="Full Name" name="admin_name" value={formData.admin_name} onChange={handleChange} placeholder="Enter full name" icon={User} required />
                          <PhoneField label="Mobile Number" name="admin_mobile" value={formData.admin_mobile} onChange={handleChange} required />
                          <Field label="Email Address" name="admin_email" value={formData.admin_email} onChange={handleChange} placeholder="Enter email address" icon={Mail} type="email" required />
                          <Field label="Designation / Role" name="admin_role" value={formData.admin_role} onChange={handleChange} placeholder="Enter role / designation" icon={User} required />
                        </div>
                        <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 transition-all hover:bg-emerald-50"><input type="checkbox" name="is_authorized" checked={formData.is_authorized} onChange={handleChange} className="h-4 w-4 accent-emerald-600" /><span className="text-[11px] leading-4 text-emerald-900"><b>Authorization Confirmation:</b> I am authorized to create an account on behalf of this masjid.</span></label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><Lock className="h-3.5 w-3.5" /> Information secure & encrypted</div>
                      <div className="flex gap-2"><button type="button" onClick={() => navigate('/login')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50">Cancel</button><motion.button type="submit" disabled={loading} whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#064e3b] px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/20 disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : <>Create Registration <ArrowRight className="h-4 w-4" /></>}</motion.button></div>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </AuthVideoBackground>
  );
};
