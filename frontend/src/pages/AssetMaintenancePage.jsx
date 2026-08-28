import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import {
  getAssets,
  getAssetMaintenances,
  createAssetMaintenance,
  updateAssetMaintenance,
  deleteAssetMaintenance
} from '../services/api';
import {
  Wrench, Plus, Search, Filter, Eye, Edit2, Trash2, CheckCircle2,
  AlertTriangle, Upload, X, Check, IndianRupee, Clock, RefreshCw, FileText
} from 'lucide-react';

export default function AssetMaintenancePage() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [assets, setAssets] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    id: null,
    maintenance_code: '',
    asset_id: '',
    asset_code: '',
    asset_name: '',
    maintenance_type: 'Preventive', // Preventive, Repair, Service, Inspection, Other
    service_date: new Date().toISOString().split('T')[0],
    service_provider: '',
    next_due_date: '',
    status: 'Scheduled', // Scheduled, In Progress, Completed, Cancelled

    // Work Details
    work_details: '',
    technician_notes: '',

    // Payment
    maintenance_cost: '',
    payment_status: 'Unpaid', // Unpaid, Partially Paid, Paid
    paid_from: 'Cash', // Cash, Bank Account, General Fund, Other Fund
    payment_method: 'Cash', // Cash, QR / UPI, Bank Transfer, Cheque, Other
    amount_paid: '',
    transaction_ref: '',

    // Completion
    completed: false
  });

  const docFileRef = useRef(null);
  const [docFile, setDocFile] = useState(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resAssets, resMnts] = await Promise.all([
        getAssets().catch(() => []),
        getAssetMaintenances().catch(() => [])
      ]);
      if (Array.isArray(resAssets)) setAssets(resAssets);
      if (Array.isArray(resMnts)) setMaintenances(resMnts);
    } catch (err) {
      console.warn('Error loading maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setIsEditing(false);
    const activeAssetsList = assets.filter(a => a.status !== 'Disposed');
    const firstAsset = activeAssetsList[0];

    const nextCount = maintenances.length + 1;
    const autoCode = `MNT-${nextCount < 10 ? '00' : nextCount < 100 ? '0' : ''}${nextCount}`;

    setForm({
      id: null,
      maintenance_code: autoCode,
      asset_id: firstAsset ? firstAsset.id : '',
      asset_code: firstAsset ? firstAsset.asset_code : '',
      asset_name: firstAsset ? firstAsset.asset_name : '',
      maintenance_type: 'Preventive',
      service_date: new Date().toISOString().split('T')[0],
      service_provider: '',
      next_due_date: '',
      status: 'Scheduled',
      work_details: '',
      technician_notes: '',
      maintenance_cost: '',
      payment_status: 'Unpaid',
      paid_from: 'Cash',
      payment_method: 'Cash',
      amount_paid: '',
      transaction_ref: '',
      completed: false
    });
    setDocFile(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec) => {
    setIsEditing(true);
    setForm({
      id: rec.id,
      maintenance_code: rec.maintenance_code || `MNT-${rec.id}`,
      asset_id: rec.asset_id || '',
      asset_code: rec.asset_code || '',
      asset_name: rec.asset_name || '',
      maintenance_type: rec.maintenance_type || 'Preventive',
      service_date: rec.service_date || new Date().toISOString().split('T')[0],
      service_provider: rec.service_provider || '',
      next_due_date: rec.next_due_date || '',
      status: rec.status || 'Scheduled',
      work_details: rec.work_details || '',
      technician_notes: rec.technician_notes || '',
      maintenance_cost: rec.maintenance_cost || rec.cost || '',
      payment_status: rec.payment_status || 'Unpaid',
      paid_from: rec.paid_from || 'Cash',
      payment_method: rec.payment_method || 'Cash',
      amount_paid: rec.amount_paid || '',
      transaction_ref: rec.transaction_ref || '',
      completed: Boolean(rec.completed || rec.status === 'Completed')
    });
    setDocFile(null);
    setShowAddModal(true);
  };

  // Open View Modal
  const handleOpenViewModal = (rec) => {
    setSelectedRecord(rec);
    setShowViewModal(true);
  };

  // Handle Asset Dropdown Change
  const handleAssetSelect = (e) => {
    const targetId = e.target.value;
    const found = assets.find(a => String(a.id) === String(targetId));
    if (found) {
      setForm(prev => ({
        ...prev,
        asset_id: found.id,
        asset_code: found.asset_code,
        asset_name: found.asset_name
      }));
    }
  };

  // Handle Completion Checkbox Toggle
  const handleCompletionToggle = (e) => {
    const isChecked = e.target.checked;
    setForm(prev => ({
      ...prev,
      completed: isChecked,
      status: isChecked ? 'Completed' : prev.status === 'Completed' ? 'Scheduled' : prev.status
    }));
  };

  // Save Submit
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!form.asset_name) {
      alert('Please select an asset for maintenance.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        asset_id: parseInt(form.asset_id) || undefined,
        maintenance_cost: parseFloat(form.maintenance_cost) || 0,
        cost: parseFloat(form.maintenance_cost) || 0,
        amount_paid: parseFloat(form.amount_paid) || 0,
        document_url: docFile ? docFile.name : form.document_url || null
      };

      if (isEditing && form.id) {
        await updateAssetMaintenance(form.id, payload);
      } else {
        await createAssetMaintenance(payload);
      }

      await loadData();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to save maintenance record:', err);
      alert('Failed to save maintenance record. Please check backend logs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (rec) => {
    if (!window.confirm(`Are you sure you want to delete maintenance record ${rec.maintenance_code || `#${rec.id}`}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteAssetMaintenance(rec.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete maintenance record:', err);
      alert('Failed to delete maintenance record.');
    }
  };

  // Stat Counters
  const inProgressCount = maintenances.filter(m => m.status === 'In Progress').length;
  const completedCount = maintenances.filter(m => m.status === 'Completed' || m.completed).length;

  // Filtered Records
  const filteredMaintenances = maintenances.filter(m => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (m.maintenance_code || '').toLowerCase().includes(q) ||
      (m.asset_name || '').toLowerCase().includes(q) ||
      (m.service_provider || '').toLowerCase().includes(q) ||
      (m.maintenance_type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      <UserSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP HEADER (Matching Reference Image 1) */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Asset Maintenance</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Schedule, record and close maintenance work for Masjid assets.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add Maintenance</span>
            </button>
          </div>
        </header>

        <main className="px-8 pb-10 space-y-6 flex-1">
          
          {/* STAT CARDS ROW (Matching Reference Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Live Services */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Live Services</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{maintenances.length}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Service logs</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                !
              </div>
            </div>

            {/* Card 2: In Progress */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">In Progress</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{inProgressCount}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Currently serviced</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ⚙
              </div>
            </div>

            {/* Card 3: Completed */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Completed</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{completedCount}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">PostgreSQL</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ✓
              </div>
            </div>

            {/* Card 4: Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Status</p>
                <p className="text-lg font-black text-slate-900 mt-1">Live API</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Active</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ₹
              </div>
            </div>

          </div>

          {/* SEARCH BAR & TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            
            {/* Search Filter Top Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search maintenance records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* MAINTENANCE RECORDS TABLE (Matching Reference Image 1) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">MAINTENANCE ID</th>
                    <th className="py-3.5 px-5">ASSET</th>
                    <th className="py-3.5 px-5">SERVICE</th>
                    <th className="py-3.5 px-5">DATE</th>
                    <th className="py-3.5 px-5">COST</th>
                    <th className="py-3.5 px-5">PAYMENT STATUS</th>
                    <th className="py-3.5 px-5">ASSET STATUS</th>
                    <th className="py-3.5 px-5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        Loading maintenance records...
                      </td>
                    </tr>
                  ) : filteredMaintenances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredMaintenances.map((rec) => {
                      const costVal = rec.maintenance_cost || rec.cost || 0;
                      const isCompleted = rec.completed || rec.status === 'Completed';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5 font-bold font-mono text-slate-900">
                            {rec.maintenance_code || `MNT-${rec.id}`}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-900">
                            {rec.asset_code ? `${rec.asset_code} • ` : ''}{rec.asset_name}
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-600">
                            {rec.maintenance_type || 'Preventive'}
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-600">
                            {rec.service_date || 'N/A'}
                          </td>
                          <td className="py-4 px-5 font-extrabold text-slate-900">
                            ₹{costVal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              rec.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                              rec.payment_status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {rec.payment_status || 'Unpaid'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' :
                              rec.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {isCompleted ? 'Live / Active' : rec.status || 'Under Maintenance'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenViewModal(rec)}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              title="Edit Record"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rec)}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT ASSET MAINTENANCE MODAL (Matching Reference Image 2)          */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">
                {isEditing ? 'Edit Asset Maintenance' : 'Add Asset Maintenance'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-8rem)] text-xs">
              
              <form id="maintenanceForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* SECTION 1: ASSET & MAINTENANCE */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Asset & Maintenance</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset</label>
                      <select
                        value={form.asset_id}
                        onChange={handleAssetSelect}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        {assets.filter(a => a.status !== 'Disposed').length === 0 ? (
                          <option value="">No Active Assets Available</option>
                        ) : (
                          assets.filter(a => a.status !== 'Disposed').map(a => (
                            <option key={a.id} value={a.id}>
                              {a.asset_code ? `${a.asset_code} • ` : ''}{a.asset_name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Type</label>
                      <select
                        value={form.maintenance_type}
                        onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Preventive">Preventive</option>
                        <option value="Repair">Repair</option>
                        <option value="Service">Service</option>
                        <option value="Inspection">Inspection</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Date</label>
                      <input
                        type="date"
                        value={form.service_date}
                        onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Service Provider / Vendor</label>
                      <input
                        type="text"
                        placeholder="Vendor name"
                        value={form.service_provider}
                        onChange={(e) => setForm({ ...form, service_provider: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Next Maintenance Date</label>
                      <input
                        type="date"
                        value={form.next_due_date}
                        onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({
                          ...form,
                          status: e.target.value,
                          completed: e.target.value === 'Completed'
                        })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: MAINTENANCE WORK */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Maintenance Work</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Work / Service Details</label>
                      <textarea
                        rows={3}
                        placeholder="What was repaired or serviced?"
                        value={form.work_details}
                        onChange={(e) => setForm({ ...form, work_details: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Technician Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Optional notes"
                        value={form.technician_notes}
                        onChange={(e) => setForm({ ...form, technician_notes: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: MAINTENANCE PAYMENT */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Maintenance Payment</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.maintenance_cost}
                        onChange={(e) => setForm({ ...form, maintenance_cost: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Status</label>
                      <select
                        value={form.payment_status}
                        onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Paid From</label>
                      <select
                        value={form.paid_from}
                        onChange={(e) => setForm({ ...form, paid_from: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Account">Bank Account</option>
                        <option value="General Fund">General Fund</option>
                        <option value="Other Fund">Other Fund</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Method</label>
                      <select
                        value={form.payment_method}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="QR / UPI">QR / UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount Paid</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount_paid}
                        onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction Reference</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={form.transaction_ref}
                        onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: COMPLETION */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Completion</h3>
                  
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="completedCheck"
                      checked={form.completed}
                      onChange={handleCompletionToggle}
                      className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                    />
                    <label htmlFor="completedCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Maintenance completed — return asset status to Live
                    </label>
                  </div>

                  {form.completed && (
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-emerald-800 text-[11px] font-medium leading-relaxed">
                      When saved, the asset status will change from Under Maintenance to <strong>Live / Active</strong>, and the maintenance history will be recorded.
                    </div>
                  )}
                </div>

                {/* SECTION 5: DOCUMENTS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Documents</h3>
                  
                  <div>
                    <input
                      ref={docFileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && setDocFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div
                      onClick={() => docFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all space-y-1"
                    >
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-bold text-slate-600 text-xs">
                        {docFile ? docFile.name : 'Upload service invoice, warranty document or maintenance report'}
                      </p>
                    </div>
                  </div>
                </div>

              </form>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="maintenanceForm"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save Maintenance'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MAINTENANCE DETAILS MODAL                                           */}
      {/* ========================================================================= */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-base font-extrabold text-slate-900">
                Maintenance Details — {selectedRecord.maintenance_code || `#${selectedRecord.id}`}
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Maintenance Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs">Maintenance Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Asset</p>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedRecord.asset_code ? `${selectedRecord.asset_code} • ` : ''}{selectedRecord.asset_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Maintenance Type</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.maintenance_type || 'Preventive'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Maintenance Date</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.service_date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Next Maintenance Date</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.next_due_date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Status</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      {selectedRecord.status || 'Scheduled'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Vendor</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.service_provider || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs">Work Details & Notes</h4>
                <p className="text-slate-700 font-medium leading-relaxed">
                  <strong>Service Details:</strong> {selectedRecord.work_details || 'No service details provided.'}
                </p>
                {selectedRecord.technician_notes && (
                  <p className="text-slate-600 font-medium leading-relaxed">
                    <strong>Technician Notes:</strong> {selectedRecord.technician_notes}
                  </p>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs">Payment Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Cost</p>
                    <p className="font-black text-slate-900 mt-0.5">₹{(selectedRecord.maintenance_cost || selectedRecord.cost || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Payment Status</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {selectedRecord.payment_status || 'Unpaid'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Paid From</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.paid_from || 'Cash'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Payment Method</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.payment_method || 'Cash'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Amount Paid</p>
                    <p className="font-bold text-slate-900 mt-0.5">₹{(selectedRecord.amount_paid || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Transaction Reference</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedRecord.transaction_ref || 'N/A'}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
