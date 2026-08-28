import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Clock, Phone, User, Home, Sparkles, CheckCircle2, AlertCircle, Loader2, Users, Search } from 'lucide-react';
import { createHallBooking, updateHallBooking, getFamilies, getFamilyMembers } from '../services/api';

export default function CreateHallBookingModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const [formData, setFormData] = useState({
    hall_name: 'Marriage Hall',
    booking_for: 'Family',
    family_id: '',
    family_member_id: '',
    family_name: '',
    member_name: '',
    booking_person: '',
    contact_number: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    function_type: 'Marriage',
    status: 'Draft',
    hall_charge: '',
    cleaning_charge: '',
    other_charge: '',
    advance_paid: '',
    needs_cooking_vessels: false,
    notes: '',
    document_url: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Family & Member Selection State
  const [familiesList, setFamiliesList] = useState([]);
  const [familyMembersList, setFamilyMembersList] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [familySearchTerm, setFamilySearchTerm] = useState('');

  // Load Community Families when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCommunityFamilies = async () => {
      setLoadingFamilies(true);
      try {
        const res = await getFamilies();
        const famArray = res?.families || (Array.isArray(res) ? res : []);
        setFamiliesList(famArray);
      } catch (err) {
        console.warn('Failed to load community families:', err);
        setFamiliesList([]);
      } finally {
        setLoadingFamilies(false);
      }
    };

    fetchCommunityFamilies();
  }, [isOpen]);

  // Sync form state when initialData or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        hall_name: initialData.hall_name || 'Marriage Hall',
        booking_for: initialData.booking_for || 'Family',
        family_id: initialData.family_id || '',
        family_member_id: initialData.family_member_id || '',
        family_name: initialData.family_name || '',
        member_name: initialData.member_name || '',
        booking_person: initialData.booking_person || initialData.applicant || '',
        contact_number: initialData.contact_number || '',
        booking_date: initialData.booking_date || '',
        start_time: initialData.start_time || '',
        end_time: initialData.end_time || '',
        function_type: initialData.function_type || initialData.event || 'Marriage',
        status: initialData.status || 'Draft',
        hall_charge: initialData.hall_charge || initialData.total_charge || '',
        cleaning_charge: initialData.cleaning_charge || '',
        other_charge: initialData.other_charge || '',
        advance_paid: initialData.advance_paid || '',
        needs_cooking_vessels: initialData.needs_cooking_vessels || false,
        notes: initialData.notes || '',
        document_url: initialData.document_url || '',
      });

      if (initialData.family_id) {
        fetchMembersForFamily(initialData.family_id);
      }
    } else {
      setFormData({
        hall_name: 'Marriage Hall',
        booking_for: 'Family',
        family_id: '',
        family_member_id: '',
        family_name: '',
        member_name: '',
        booking_person: '',
        contact_number: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        function_type: 'Marriage',
        status: 'Draft',
        hall_charge: '',
        cleaning_charge: '',
        other_charge: '',
        advance_paid: '',
        needs_cooking_vessels: false,
        notes: '',
        document_url: '',
      });
      setFamilyMembersList([]);
    }
    setError('');
    setSelectedFile(null);
    setFamilySearchTerm('');
  }, [initialData, isOpen]);

  // Fetch Family Members for selected family
  const fetchMembersForFamily = async (famId) => {
    if (!famId) {
      setFamilyMembersList([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const data = await getFamilyMembers(famId);
      setFamilyMembersList(data?.members || []);
    } catch (err) {
      console.warn('Failed to load family members:', err);
      setFamilyMembersList([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!isOpen) return null;

  // Calculate live charges
  const hallChargeNum = parseFloat(formData.hall_charge) || 0;
  const cleaningChargeNum = parseFloat(formData.cleaning_charge) || 0;
  const otherChargeNum = parseFloat(formData.other_charge) || 0;
  const advancePaidNum = parseFloat(formData.advance_paid) || 0;

  const totalCharge = hallChargeNum + cleaningChargeNum + otherChargeNum;
  const balance = Math.max(0, totalCharge - advancePaidNum);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle Family Selection from Dropdown
  const handleFamilySelect = (e) => {
    const familyIdStr = e.target.value;
    if (!familyIdStr) {
      setFormData((prev) => ({
        ...prev,
        family_id: '',
        family_name: '',
        family_member_id: '',
        member_name: '',
      }));
      setFamilyMembersList([]);
      return;
    }

    const famId = parseInt(familyIdStr, 10);
    const selectedFam = familiesList.find((f) => f.id === famId);

    if (selectedFam) {
      const famName = selectedFam.family_name || `${selectedFam.head_name} Family`;
      const headName = selectedFam.head_name || selectedFam.first_name || 'Family Head';
      const contactNo = selectedFam.mobile_number || formData.contact_number;

      setFormData((prev) => ({
        ...prev,
        family_id: famId,
        family_name: famName,
        family_member_id: '',
        member_name: headName,
        booking_person: headName,
        contact_number: contactNo,
      }));

      fetchMembersForFamily(famId);
    }
  };

  // Handle Member Selection from Dropdown
  const handleMemberSelect = (e) => {
    const memberIdStr = e.target.value;
    if (memberIdStr === '') {
      setFormData((prev) => ({
        ...prev,
        family_member_id: '',
        member_name: '',
      }));
      return;
    }

    const memId = parseInt(memberIdStr, 10);
    const selectedMem = familyMembersList.find((m) => m.id === memId);

    if (selectedMem) {
      setFormData((prev) => ({
        ...prev,
        family_member_id: memId,
        member_name: selectedMem.full_name,
        booking_person: selectedMem.full_name,
        contact_number: selectedMem.mobile_number || prev.contact_number,
      }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData((prev) => ({ ...prev, document_url: file.name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.booking_person.trim()) {
      setError('Booking Person / Family name is required.');
      return;
    }
    if (!formData.contact_number.trim()) {
      setError('Contact Number is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        family_id: formData.family_id ? parseInt(formData.family_id, 10) : null,
        family_member_id: formData.family_member_id !== '' ? parseInt(formData.family_member_id, 10) : null,
        hall_charge: hallChargeNum,
        cleaning_charge: cleaningChargeNum,
        other_charge: otherChargeNum,
        advance_paid: advancePaidNum,
        total_charge: totalCharge,
        balance: balance,
      };

      if (initialData?.id) {
        await updateHallBooking(initialData.id, payload);
      } else {
        await createHallBooking(payload);
      }

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save hall booking:', err);
      setError(err.response?.data?.detail || 'Failed to save booking. Please try again.');
      setLoading(false);
    }
  };

  // Filtered families list based on search term
  const filteredFamilies = familiesList.filter((f) => {
    if (!familySearchTerm) return true;
    const query = familySearchTerm.toLowerCase();
    return (
      (f.family_name || '').toLowerCase().includes(query) ||
      (f.head_name || '').toLowerCase().includes(query) ||
      (f.family_code || '').toLowerCase().includes(query) ||
      (f.mobile_number || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialData ? 'Edit Hall Booking' : 'Create New Hall Booking'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Select community family/member and event charges below.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Booking Information & Family Integration */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-950 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Booking Information</span>
              </h4>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase flex items-center space-x-1">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>Community Integrated</span>
              </span>
            </div>

            {/* Family & Member Selection Row */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Select Family & Member (Community Module)</span>
                </span>
                {loadingFamilies && (
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1 font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading Families...</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Family Selection Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700">
                      Family Selection
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {familiesList.length} Families Available
                    </span>
                  </div>

                  <select
                    value={formData.family_id || ''}
                    onChange={handleFamilySelect}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Family from Community --</option>
                    {filteredFamilies.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        {fam.family_name ? `${fam.family_name} (${fam.head_name})` : fam.head_name} • {fam.family_code || `F-${fam.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Member Selection Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700">
                      Member Selection
                    </label>
                    {loadingMembers && (
                      <span className="text-[10px] font-bold text-indigo-600 animate-pulse">
                        Loading Members...
                      </span>
                    )}
                  </div>

                  <select
                    value={formData.family_member_id !== '' ? formData.family_member_id : ''}
                    onChange={handleMemberSelect}
                    disabled={!formData.family_id}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.family_id
                        ? '-- Select a Family First --'
                        : '-- Choose Member (Or Default Head) --'}
                    </option>
                    {familyMembersList.map((mem) => (
                      <option key={mem.id} value={mem.id}>
                        {mem.full_name} ({mem.relationship_type || (mem.is_head ? 'Family Head' : 'Member')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Standard Form Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hall */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Hall</label>
                <select
                  name="hall_name"
                  value={formData.hall_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Marriage Hall">Marriage Hall</option>
                  <option value="Community Hall">Community Hall</option>
                  <option value="Auditorium">Auditorium</option>
                  <option value="Mini Event Hall">Mini Event Hall</option>
                </select>
              </div>

              {/* Booking For */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Booking For</label>
                <select
                  name="booking_for"
                  value={formData.booking_for}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Family">Family</option>
                  <option value="External / Guest">External / Guest</option>
                  <option value="Community Member">Community Member</option>
                </select>
              </div>

              {/* Booking Person / Family */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Booking Person / Family <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="booking_person"
                  value={formData.booking_person}
                  onChange={handleChange}
                  placeholder="Name"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="+91..."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Booking Date */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Booking Date</label>
                <input
                  type="date"
                  name="booking_date"
                  value={formData.booking_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Function Type */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Function Type</label>
                <select
                  name="function_type"
                  value={formData.function_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Marriage">Marriage</option>
                  <option value="Walima">Walima</option>
                  <option value="Nikah">Nikah</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Reception">Reception</option>
                  <option value="General Event">General Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Charges */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Charges</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hall Charge */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Hall Charge</label>
                <input
                  type="number"
                  step="0.01"
                  name="hall_charge"
                  value={formData.hall_charge}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Cleaning Charge */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Cleaning Charge</label>
                <input
                  type="number"
                  step="0.01"
                  name="cleaning_charge"
                  value={formData.cleaning_charge}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Other Charge */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Other Charge</label>
                <input
                  type="number"
                  step="0.01"
                  name="other_charge"
                  value={formData.other_charge}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Advance */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Advance</label>
                <input
                  type="number"
                  step="0.01"
                  name="advance_paid"
                  value={formData.advance_paid}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Balance (Calculated) */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Balance</label>
                <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-rose-600">
                  ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Total Charge Calculated Summary */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Total Charge</label>
                <div className="w-full px-3.5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black">
                  ₹{totalCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Cooking Vessels */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 border-b border-slate-100 pb-3">
              Cooking Vessels
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center space-x-3">
              <input
                type="checkbox"
                id="needs_cooking_vessels"
                name="needs_cooking_vessels"
                checked={formData.needs_cooking_vessels}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="needs_cooking_vessels" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                Customer needs cooking vessels
              </label>
            </div>
          </div>

          {/* Section 4: Documents / Notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 border-b border-slate-100 pb-3">
              Documents / Notes
            </h4>

            {/* Notes */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Notes</label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Booking Instructions or special requirements"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
              />
            </div>

            {/* Document Upload Area */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Attach Document</label>
              <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-600">
                  {selectedFile ? selectedFile.name : 'Upload booking documents if required'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Booking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
