import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminSidebar } from '../components/Sidebar';
import { getSignupRequestDetail, approveSignupRequest, rejectSignupRequest } from '../services/api';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Globe, CheckCircle2, XCircle,
  Clock, ShieldCheck, Loader2, AlertCircle, User, FileText, Landmark
} from 'lucide-react';

export const AdminSignupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqDetail, setReqDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await getSignupRequestDetail(id);
      setReqDetail(data);
      if (data.admin_notes) setAdminNotes(data.admin_notes);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await approveSignupRequest(id, adminNotes);
      setSuccessMsg(`Masjid '${res.masjid_name}' registration approved successfully! Mobile ${res.mobile_number} is now eligible for login.`);
      fetchDetail();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to approve registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this registration request?')) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await rejectSignupRequest(id, adminNotes);
      setSuccessMsg('Registration request has been rejected.');
      fetchDetail();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to reject registration.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Back Button */}
          <Link
            to="/admin/signup-requests"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Signup Requests</span>
          </Link>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Loading detail...</div>
          ) : !reqDetail ? (
            <div className="p-12 text-center text-rose-400 text-xs">Request not found.</div>
          ) : (
            <div className="space-y-6">
              
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-2xl">
                    🕌
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-xl font-bold text-white">{reqDetail.masjid_name}</h1>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">#{reqDetail.id}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Submitted on {new Date(reqDetail.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${
                      reqDetail.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : reqDetail.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                    }`}
                  >
                    {reqDetail.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {reqDetail.status === 'rejected' && <XCircle className="w-4 h-4 text-rose-400" />}
                    {reqDetail.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                    <span>Status: {reqDetail.status}</span>
                  </span>
                </div>
              </div>

              {/* Success / Error Alerts */}
              {successMsg && (
                <div className="flex items-start space-x-3 p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-3 p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Details Grid */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3">
                  Masjid Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Masjid Name</span>
                    </span>
                    <p className="text-slate-100 font-semibold text-sm pl-5">{reqDetail.masjid_name}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Registration / ID</span>
                    </span>
                    <p className="text-slate-200 font-medium pl-5">{reqDetail.masjid_reg_id || 'N/A'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Masjid Mobile</span>
                    </span>
                    <p className="text-emerald-400 font-mono font-semibold text-sm pl-5">{reqDetail.mobile_number}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>WhatsApp Number</span>
                    </span>
                    <p className="text-slate-200 font-mono pl-5">{reqDetail.whatsapp_number || reqDetail.mobile_number}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Email Address</span>
                    </span>
                    <p className="text-slate-200 font-medium pl-5">{reqDetail.email}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>Website</span>
                    </span>
                    <p className="text-slate-200 font-medium pl-5">{reqDetail.website || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3 text-xs">
                  <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Full Address</span>
                  </span>
                  <p className="text-slate-200 pl-5 leading-relaxed font-medium">
                    {reqDetail.street}
                    {reqDetail.area_locality ? `, ${reqDetail.area_locality}` : ''}, {reqDetail.city}
                    {reqDetail.pincode ? ` - ${reqDetail.pincode}` : ''}
                    {reqDetail.state ? `, ${reqDetail.state}` : ''}, {reqDetail.country || 'India'}
                  </p>
                </div>

                {/* Administrator Details Section */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Administrator / Authorized Person Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block font-medium">Full Name</span>
                      <span className="text-slate-100 font-semibold">{reqDetail.admin_name || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Admin Mobile</span>
                      <span className="text-emerald-400 font-mono font-semibold">{reqDetail.admin_mobile || reqDetail.mobile_number}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Admin Email</span>
                      <span className="text-slate-200">{reqDetail.admin_email || reqDetail.email}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Designation / Role</span>
                      <span className="text-slate-200 font-semibold">{reqDetail.admin_role || 'Primary Administrator'}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Notes & Approval Control */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Administrator Remarks / Review Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes or reasons regarding this registration..."
                      className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-2">
                    {reqDetail.status !== 'rejected' && (
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Request</span>
                      </button>
                    )}

                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/50 flex items-center space-x-2 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {reqDetail.status === 'approved' ? 'Re-Approve & Save' : 'Approve & Save Registration'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};
