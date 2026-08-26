import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminSidebar } from '../components/Sidebar';
import { getSignupRequests, getMasjids } from '../services/api';
import { FileText, Clock, CheckCircle2, XCircle, Building2, ArrowRight, RefreshCw, Eye } from 'lucide-react';

export const AdminDashboardPage = () => {
  const [requests, setRequests] = useState([]);
  const [masjids, setMasjids] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, masjidsRes] = await Promise.all([
        getSignupRequests(),
        getMasjids().catch(() => []),
      ]);
      setRequests(reqRes);
      setMasjids(masjidsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      <AdminSidebar />
      <main className="min-w-0 h-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Overview</h1>
              <p className="text-slate-400 text-xs mt-1">
                Manage Masjid registration requests and system onboarding.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Requests */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Requests</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{requests.length}</div>
              <p className="text-[11px] text-slate-500">All submitted registration requests</p>
            </div>

            {/* Pending Requests */}
            <div className="glass-card rounded-2xl p-5 border border-amber-900/40 bg-amber-950/10 space-y-2">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-300 font-mono">{pendingCount}</div>
              <p className="text-[11px] text-amber-400/70">Awaiting administrator verification</p>
            </div>

            {/* Approved Masjids */}
            <div className="glass-card rounded-2xl p-5 border border-emerald-900/40 bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Approved Masjids</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-300 font-mono">{approvedCount}</div>
              <p className="text-[11px] text-emerald-400/70">Active & eligible for login</p>
            </div>

            {/* Rejected Requests */}
            <div className="glass-card rounded-2xl p-5 border border-rose-900/40 bg-rose-950/10 space-y-2">
              <div className="flex items-center justify-between text-rose-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Rejected Requests</span>
                <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-rose-300 font-mono">{rejectedCount}</div>
              <p className="text-[11px] text-rose-400/70">Declined registration requests</p>
            </div>
          </div>

          {/* Quick Action Banner */}
          {pendingCount > 0 && (
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-900/60 flex items-center justify-center text-amber-300 border border-amber-700/50">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">
                    {pendingCount} Pending Registration Request{pendingCount > 1 ? 's' : ''} Require Attention
                  </h4>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Review submitted details and approve eligible Masjids.
                  </p>
                </div>
              </div>

              <Link
                to="/admin/signup-requests"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md flex items-center space-x-1.5 shrink-0 transition-colors"
              >
                <span>Review Pending</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Recent Signup Requests Table Preview */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-200">Recent Signup Requests</h3>
              <Link
                to="/admin/signup-requests"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>View All Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No signup requests submitted yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Req #</th>
                      <th className="py-3 px-4">Masjid Name</th>
                      <th className="py-3 px-4">Mobile Number</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {requests.slice(0, 5).map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">#{req.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-100">{req.masjid_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{req.mobile_number}</td>
                        <td className="py-3 px-4">{req.city}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/signup-requests/${req.id}`}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
