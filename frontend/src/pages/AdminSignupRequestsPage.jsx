import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminSidebar } from '../components/Sidebar';
import { getSignupRequests } from '../services/api';
import { Search, Filter, Eye, RefreshCw, CheckCircle2, Clock, XCircle, Building2, Phone, Mail, MapPin } from 'lucide-react';

export const AdminSignupRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getSignupRequests(statusFilter, search);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load signup requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      <AdminSidebar />
      <main className="min-w-0 h-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Masjid Signup Requests</h1>
              <p className="text-slate-400 text-xs mt-1">
                Review, verify, and approve registration requests submitted by Masjids.
              </p>
            </div>

            <button
              onClick={fetchRequests}
              disabled={loading}
              className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                    statusFilter === tab
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, mobile, city..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </form>
          </div>

          {/* Table Container */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading signup requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm font-medium">No signup requests found</p>
                <p className="text-slate-500 text-xs">No records matched the current filter or search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Req #</th>
                      <th className="py-3.5 px-4">Masjid Name</th>
                      <th className="py-3.5 px-4">Mobile Number</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">#{req.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100">{req.masjid_name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-200">{req.mobile_number}</td>
                        <td className="py-3.5 px-4 text-slate-300">{req.city}, {req.street}</td>
                        <td className="py-3.5 px-4 text-slate-400">{req.email}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                            }`}
                          >
                            {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {req.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
                            {req.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                            <span>{req.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/admin/signup-requests/${req.id}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold inline-flex items-center space-x-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review Request</span>
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
