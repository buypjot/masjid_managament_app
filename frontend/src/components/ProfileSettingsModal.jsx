import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/api';
import { Avatar } from './Avatar';
import {
  X,
  Camera,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Upload
} from 'lucide-react';

export const ProfileSettingsModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const { userInfo, updateUserProfileState } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    admin_name: '',
    admin_role: '',
    admin_email: '',
    admin_mobile: '',
    masjid_name: '',
    city: '',
    profile_photo: '',
  });

  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (userInfo && isOpen) {
      setFormData({
        admin_name: userInfo.admin_name || userInfo.full_name || '',
        admin_role: userInfo.admin_role || 'Administrator',
        admin_email: userInfo.email || userInfo.admin_email || '',
        admin_mobile: userInfo.admin_mobile || userInfo.mobile_number || '',
        masjid_name: userInfo.masjid_name || '',
        city: userInfo.city || '',
        profile_photo: userInfo.profile_photo || '',
      });
      setPreviewPhoto(userInfo.profile_photo || null);
      setError('');
      setSuccessMsg('');
    }
  }, [userInfo, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result;
      setPreviewPhoto(base64Str);
      setFormData((prev) => ({ ...prev, profile_photo: base64Str }));
      if (error) setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewPhoto(null);
    setFormData((prev) => ({ ...prev, profile_photo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.admin_name.trim()) {
      setError('Administrator Name is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        admin_name: formData.admin_name.trim(),
        admin_role: formData.admin_role.trim(),
        admin_email: formData.admin_email.trim(),
        admin_mobile: formData.admin_mobile.trim(),
        masjid_name: formData.masjid_name.trim(),
        city: formData.city.trim(),
        profile_photo: formData.profile_photo,
      };

      const res = await updateUserProfile(payload);
      if (res && res.user_info) {
        updateUserProfileState(res.user_info);
        if (onSaveSuccess) onSaveSuccess(res.user_info);
      }

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to update your profile.');
      } else {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Failed to save profile changes. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activePhoto = previewPhoto || formData.profile_photo;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Profile Settings</h3>
              <p className="text-xs font-medium text-slate-500">Manage account information & profile photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex flex-col space-y-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {error.includes('expired') && (
              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  window.location.href = '/login';
                }}
                className="self-start text-[11px] font-bold text-rose-700 underline hover:text-rose-900 ml-6 cursor-pointer"
              >
                Click here to Login & Refresh Token →
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="flex items-start space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs sm:text-sm">
          
          {/* Profile Photo Section */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
            <div className="relative group shrink-0">
              <Avatar
                src={activePhoto}
                name={formData.admin_name || 'Admin'}
                size="xl"
                className="ring-4 ring-white"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-500 transition-transform hover:scale-110"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">Profile Photo</h4>
              <p className="text-xs text-slate-500 font-medium">
                Upload a professional avatar image. Recommended size 400x400px.
              </p>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>{activePhoto ? 'Change Photo' : 'Add Photo'}</span>
                </button>

                {activePhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <User className="w-4 h-4 text-slate-500" />
                <span>Administrator Full Name *</span>
              </label>
              <input
                type="text"
                name="admin_name"
                required
                value={formData.admin_name}
                onChange={handleInputChange}
                placeholder="e.g. Mohamed Ismail"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
            </div>

            {/* Admin Role / Designation */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Designation / Role</span>
              </label>
              <input
                type="text"
                name="admin_role"
                value={formData.admin_role}
                onChange={handleInputChange}
                placeholder="e.g. Masjid Administrator"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Masjid Administrator', 'President', 'Secretary', 'Treasurer', 'Trustee', 'Imam'].map((roleItem) => (
                  <button
                    type="button"
                    key={roleItem}
                    onClick={() => setFormData((prev) => ({ ...prev, admin_role: roleItem }))}
                    className={`px-3 py-1 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                      formData.admin_role === roleItem
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {roleItem}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                name="admin_email"
                value={formData.admin_email}
                onChange={handleInputChange}
                placeholder="admin@masjid.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>Mobile Number</span>
              </label>
              <input
                type="text"
                name="admin_mobile"
                value={formData.admin_mobile}
                onChange={handleInputChange}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
            </div>

            {/* Masjid Name */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Masjid Name</span>
              </label>
              <input
                type="text"
                name="masjid_name"
                value={formData.masjid_name}
                onChange={handleInputChange}
                placeholder="Ismail Masjid"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs sm:text-sm mb-1.5 flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>City / Location</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Tenkasi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md flex items-center space-x-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ProfileSettingsModal;
