import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { publicSignup } from '../services/api';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, ChevronDown, FileText, Globe, Loader2, Lock, Mail, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { AuthVideoBackground } from '../components/AuthVideoBackground';

const inputClass = 'w-full rounded-2xl border border-white/20 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-emerald-500/10';
const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600';

const Field = ({ label, name, value, onChange, placeholder, icon: Icon, type = 'text', required = false }) => (
  <div>
    <label className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} ${Icon ? 'pl-11' : ''}`} required={required} />
    </div>
  </div>
);

const PhoneField = ({ label, name, value, onChange, required = false }) => (
  <div>
    <label className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
    <div className="flex">
      <div className="flex items-center gap-1 rounded-l-2xl border border-r-0 border-white/20 bg-slate-100/90 px-3 text-xs font-bold text-slate-700">🇮🇳 +91</div>
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
    <AuthVideoBackground>
      <main className="relative z-10 min-h-screen overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <motion.header initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#064e3b] text-xl shadow-xl">🕌</div>
              <div><div className="text-sm font-black">Masjid Desk</div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Create Masjid Account</div></div>
            </div>
            <Link to="/login" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur-md transition-all hover:bg-white/20">Already have an account? <span className="text-[#d4af37]">Back to Login</span></Link>
          </motion.header>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="overflow-hidden rounded-[32px] border border-white/20 bg-white/90 shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="grid lg:grid-cols-[0.34fr_0.66fr]">
              <aside className="hidden bg-gradient-to-b from-[#073f3b]/95 to-[#031f20]/95 p-8 text-white lg:block">
                <div className="sticky top-8">
                  <div className="mb-8"><div className="mb-3 text-4xl">🕌</div><h1 className="text-3xl font-black leading-tight">Create your<br /><span className="text-[#d4af37]">Masjid account</span></h1><p className="mt-3 text-sm leading-6 text-white/65">Bring community, collections and masjid operations into one trusted workspace.</p></div>
                  <div className="space-y-3">
                    {['Community Management', 'Finance & Collections', 'Properties & Rentals', 'Events & Services'].map((item, i) => <motion.div key={item} whileHover={{ x: 4 }} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs font-semibold text-white/85 backdrop-blur-md"><span className="mr-2 text-[#d4af37]">0{i + 1}</span>{item}</motion.div>)}
                  </div>
                  <div className="mt-8 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4 text-xs leading-5 text-white/70"><ShieldCheck className="mb-2 h-5 w-5 text-[#d4af37]" /> Your registration is reviewed securely before access is approved.</div>
                </div>
              </aside>

              <section className="p-5 sm:p-8 lg:p-10">
                {successResponse ? (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[620px] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-11 w-11" /></div>
                    <h2 className="mt-6 text-2xl font-black text-slate-950">Registration Submitted Successfully!</h2>
                    <p className="mt-3 max-w-lg rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{successResponse.message || 'Your Masjid registration request has been submitted successfully. Our administrator will review your details.'}</p>
                    <div className="mt-5 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-xs"><div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Request ID</span><b>#{successResponse.id}</b></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Status</span><b className="capitalize text-amber-700">{successResponse.status}</b></div></div>
                    <div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => setSuccessResponse(null)} className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200">Submit Another Account</button><Link to="/login" className="flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#064e3b]">Go to Sign In <ArrowRight className="h-4 w-4" /></Link></div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">Step 01 · Registration</div><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Masjid Information</h2><p className="mt-1 text-sm text-slate-500">Enter the same registration details you already use.</p></div><div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-[#0f766e]">Secure & Encrypted</div></div>
                    {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</motion.div>}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Masjid Name" name="masjid_name" value={formData.masjid_name} onChange={handleChange} placeholder="Enter masjid name" icon={Building2} required />
                      <Field label="Masjid Registration / ID (Optional)" name="masjid_reg_id" value={formData.masjid_reg_id} onChange={handleChange} placeholder="Registration or ID number" icon={FileText} />
                      <PhoneField label="Masjid Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} required />
                      <PhoneField label="Masjid WhatsApp Number" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} />
                      <Field label="Masjid Email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" icon={Mail} type="email" required />
                      <Field label="Masjid Website (Optional)" name="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" icon={Globe} type="url" />
                    </div>

                    <div><Field label="Address (Street / House No.)" name="street" value={formData.street} onChange={handleChange} placeholder="Door / House No., Street Address" icon={MapPin} required /></div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Area / Locality" name="area_locality" value={formData.area_locality} onChange={handleChange} placeholder="Area or locality" required /><Field label="City" name="city" value={formData.city} onChange={handleChange} placeholder="City" required /><Field label="PIN Code" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="PIN code" required /></div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div><label className={labelClass}>State <span className="text-rose-500">*</span></label><div className="relative"><select name="state" value={formData.state} onChange={handleChange} className={`${inputClass} appearance-none`} required><option value="">Select state</option>{indianStates.map((st) => <option key={st} value={st}>{st}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>
                      <div><label className={labelClass}>Country <span className="text-rose-500">*</span></label><div className="relative"><select name="country" value={formData.country} onChange={handleChange} className={`${inputClass} appearance-none`}><option value="India">India</option></select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>
                    </div>

                    <div className="border-t border-slate-200 pt-8"><div className="mb-5"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">Step 02 · Administrator</div><h3 className="mt-2 text-xl font-black text-slate-950">Administrator / Authorized Person</h3><p className="mt-1 text-xs text-slate-500">This person will be the primary administrator for the account.</p></div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Full Name" name="admin_name" value={formData.admin_name} onChange={handleChange} placeholder="Enter full name" icon={User} required /><PhoneField label="Mobile Number" name="admin_mobile" value={formData.admin_mobile} onChange={handleChange} required /><Field label="Email Address" name="admin_email" value={formData.admin_email} onChange={handleChange} placeholder="Enter email address" icon={Mail} type="email" required /><Field label="Designation / Role" name="admin_role" value={formData.admin_role} onChange={handleChange} placeholder="Enter designation or role" icon={User} required /></div>
                      <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 transition-all hover:bg-emerald-50"><span className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" /><span><span className="block text-xs font-bold text-emerald-950">Authorization Confirmation</span><span className="mt-1 block text-[11px] leading-5 text-emerald-800">By signing up, you confirm that you are authorized to create an account on behalf of this masjid.</span></span></span><input type="checkbox" name="is_authorized" checked={formData.is_authorized} onChange={handleChange} className="h-5 w-5 accent-emerald-600" /></label>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => navigate('/login')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50">Cancel</button><motion.button type="submit" disabled={loading} whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f766e] to-[#064e3b] px-7 py-3.5 text-xs font-extrabold text-white shadow-xl shadow-emerald-900/20 disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting Registration...</> : <>Continue to Next Step <ArrowRight className="h-4 w-4" /></>}</motion.button></div>
                  </form>
                )}
              </section>
            </div>
          </motion.div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/55"><Lock className="h-3.5 w-3.5" /> Your information is secure and encrypted.</div>
        </div>
      </main>
    </AuthVideoBackground>
  );
};
