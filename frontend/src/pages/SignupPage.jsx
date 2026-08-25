import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicSignup } from '../services/api';
import {
  Users, Wallet, Home, Calendar, Phone, Mail, Clock, CheckCircle2,
  AlertCircle, Loader2, ArrowRight, Building2, Globe, MapPin, Landmark,
  User, ShieldCheck, Lock, FileText, ChevronDown
} from 'lucide-react';

export const SignupPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Masjid Info
    masjid_name: '',
    masjid_reg_id: '',
    mobile_number: '',
    whatsapp_number: '',
    email: '',
    website: '',
    street: '',
    area_locality: '',
    city: '',
    pincode: '',
    state: '',
    country: 'India',

    // Administrator Info
    admin_name: '',
    admin_mobile: '',
    admin_email: '',
    admin_role: '',

    // Authorization Checkbox
    is_authorized: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResponse, setSuccessResponse] = useState(null);

  const indianStates = [
    'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
    'Maharashtra', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat',
    'Rajasthan', 'Bihar', 'Madhya Pradesh', 'Punjab', 'Haryana',
    'Assam', 'Odisha', 'Jammu & Kashmir', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.masjid_name.trim()) return 'Masjid Name is required.';
    if (!formData.mobile_number.trim()) return 'Masjid Mobile Number is required.';

    const mobileDigits = formData.mobile_number.replace(/\D/g, '');
    if (mobileDigits.length < 10 || mobileDigits.length > 15) {
      return 'Masjid Mobile Number must be a valid 10 to 15 digit number.';
    }

    if (!formData.email.trim()) return 'Masjid Email Address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }

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
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        masjid_name: formData.masjid_name.trim(),
        mobile_number: formData.mobile_number.trim(),
        email: formData.email.trim(),
        street: formData.street.trim(),
        city: formData.city.trim(),

        masjid_reg_id: formData.masjid_reg_id.trim() || undefined,
        whatsapp_number: formData.whatsapp_number.trim() || undefined,
        website: formData.website.trim() || undefined,
        area_locality: formData.area_locality.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        state: formData.state || undefined,
        country: formData.country || 'India',

        admin_name: formData.admin_name.trim() || undefined,
        admin_mobile: formData.admin_mobile.trim() || undefined,
        admin_email: formData.admin_email.trim() || undefined,
        admin_role: formData.admin_role.trim() || undefined,
      };

      const response = await publicSignup(payload);
      setSuccessResponse(response);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(', '));
      } else {
        setError('Failed to submit registration. Please check your network connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col justify-between">
      <div className="max-w-[1440px] mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* LEFT SIDEBAR BANNER (35% / 4 Cols on Large screens) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-8">
          <div>
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-600/30">
                🕌
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">Masjid Manager</h2>
                <p className="text-xs text-slate-400 font-medium">by Buyp Technologies</p>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3 mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Create Your <br />
                <span className="text-emerald-700">Masjid Account</span>
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Join hundreds of masjids managing their community, finance, properties and more in one place.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Community Management</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manage families, members and committee</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-emerald-700">₹</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Finance & Collections</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Santha, donations, expenses and reports</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Properties & Rentals</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manage properties, tenants and rent collection</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Events & Services</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hall booking, events, nikah and more</p>
                </div>
              </div>
            </div>

            {/* Masjid Illustration */}
            <div className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-50/50 to-emerald-100/40 p-6 text-center border border-emerald-100">
              <div className="text-5xl opacity-85 my-2">🕌</div>
              <p className="text-xs text-emerald-800 font-medium">Serving Communities Across India</p>
            </div>
          </div>

          {/* Need Help Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Need Help?</h4>
            <p className="text-slate-500 text-[11px]">Our team will help you get started.</p>

            <div className="space-y-2 pt-1 font-medium text-slate-700">
              <div className="flex items-center space-x-2.5 text-slate-800">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">+91 75500 10010</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>support@buyp.in</span>
              </div>
              <div className="flex items-center space-x-2.5 text-slate-500 text-[11px]">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Mon - Sat, 9:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT AREA (65% / 8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Header & Sign in Link */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Create Your Account
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Fill in the details below to create your masjid account
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 hidden sm:inline">Already have an account?</span>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-white border border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors shadow-sm"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between max-w-xl mx-auto relative">
              {/* Step 1 */}
              <div className="flex items-center space-x-3 z-10">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-600/30">
                  1
                </div>
                <span className="text-xs font-bold text-emerald-700">Masjid Information</span>
              </div>

              {/* Connecting Line */}
              <div className="flex-1 h-0.5 bg-slate-200 mx-4"></div>

              {/* Step 2 */}
              <div className="flex items-center space-x-3 z-10 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">Admin Review</span>
              </div>

              <div className="flex-1 h-0.5 bg-slate-200 mx-4"></div>

              {/* Step 3 */}
              <div className="flex items-center space-x-3 z-10 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">Choose Plan</span>
              </div>
            </div>
          </div>

          {/* Success Screen Modal */}
          {successResponse ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-lg text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-300 shadow-md">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Registration Submitted Successfully!</h2>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-sm leading-relaxed max-w-lg mx-auto">
                  "{successResponse.message || 'Your Masjid registration request has been submitted successfully. Our administrator will review your details.'}"
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl text-left text-xs space-y-2 border border-slate-200 max-w-md mx-auto">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Request ID:</span>
                  <span className="font-mono text-emerald-700 font-bold">#{successResponse.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Masjid Name:</span>
                  <span className="text-slate-800 font-semibold">{successResponse.masjid_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Masjid Mobile:</span>
                  <span className="text-slate-800 font-mono">{successResponse.mobile_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="capitalize px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {successResponse.status}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center space-x-4">
                <button
                  onClick={() => setSuccessResponse(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Submit Another Account
                </button>
                <Link
                  to="/login"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* MAIN FORM CONTAINER */
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
              
              {error && (
                <div className="flex items-start space-x-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: MASJID INFORMATION */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Masjid Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Provide your masjid details</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Masjid Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="masjid_name"
                        value={formData.masjid_name}
                        onChange={handleChange}
                        placeholder="Enter masjid name"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Masjid Reg ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid Registration / ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="masjid_reg_id"
                        value={formData.masjid_reg_id}
                        onChange={handleChange}
                        placeholder="Enter registration or ID number"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Masjid Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex">
                      <div className="flex items-center space-x-1 px-3 py-2.5 bg-slate-50 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-700 shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        name="mobile_number"
                        value={formData.mobile_number}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-r-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Masjid WhatsApp Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid WhatsApp Number
                    </label>
                    <div className="flex">
                      <div className="flex items-center space-x-1 px-3 py-2.5 bg-slate-50 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-700 shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        name="whatsapp_number"
                        value={formData.whatsapp_number}
                        onChange={handleChange}
                        placeholder="Enter WhatsApp number"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-r-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Masjid Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Masjid Website */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Masjid Website <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="Enter website"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Full Width */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="Door / House No., Street Address"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                    required
                  />
                </div>

                {/* Area, City, PIN Code Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Area / Locality <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="area_locality"
                      value={formData.area_locality}
                      onChange={handleChange}
                      placeholder="Enter area or locality"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="Enter PIN code"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* State & Country Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 appearance-none transition-all"
                        required
                      >
                        <option value="">Select state</option>
                        {indianStates.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Country <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 appearance-none transition-all"
                      >
                        <option value="India">India</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* SECTION 2: ADMINISTRATOR / AUTHORIZED PERSON */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Administrator / Authorized Person</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This person will be the primary administrator for the account</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Admin Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="admin_name"
                        value={formData.admin_name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Admin Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex">
                      <div className="flex items-center space-x-1 px-3 py-2.5 bg-slate-50 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-700 shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        name="admin_mobile"
                        value={formData.admin_mobile}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-r-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="admin_email"
                        value={formData.admin_email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Admin Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Designation / Role <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="admin_role"
                        value={formData.admin_role}
                        onChange={handleChange}
                        placeholder="Enter designation or role"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Authorization Confirmation Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-900">Authorization Confirmation</h5>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        By signing up, you confirm that you are authorized to create an account on behalf of this masjid.
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    name="is_authorized"
                    checked={formData.is_authorized}
                    onChange={handleChange}
                    className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Next Step</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Your information is secure and encrypted.</span>
          </div>

          <div>
            By continuing, you agree to our{' '}
            <a href="#" className="text-emerald-700 font-semibold hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="text-emerald-700 font-semibold hover:underline">Privacy Policy</a>.
          </div>
        </div>
      </footer>
    </div>
  );
};
