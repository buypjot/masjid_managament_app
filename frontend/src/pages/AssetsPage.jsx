import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import {
  getAssets, createAsset, deleteAsset,
  getAssetDisposals, createAssetDisposal
} from '../services/api';
import {
  Package, Wrench, History, PlusCircle, XCircle, Plus, Search,
  Filter, Eye, Trash2, CheckCircle2, AlertTriangle, ShieldCheck,
  Building2, Calendar, IndianRupee, Layers, FileText, Upload, X, Check
} from 'lucide-react';

import AssetMaintenancePage from './AssetMaintenancePage';
import AssetMaintenanceHistoryPage from './AssetMaintenanceHistoryPage';

export default function AssetsPage({ activeSubTab }) {
  if (activeSubTab === 'maintenance') {
    return <AssetMaintenancePage />;
  }
  if (activeSubTab === 'maintenance-history') {
    return <AssetMaintenanceHistoryPage />;
  }
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [assets, setAssets] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);

  // --------------------------------------------------------------------------
  // ADD ASSET FORM STATE
  // --------------------------------------------------------------------------
  const [assetForm, setAssetForm] = useState({
    // Asset Information
    asset_code: '',
    asset_name: '',
    category: 'Generator',
    brand_model: '',
    serial_number: '',
    barcode: '',
    location: 'Prayer Hall',
    status: 'Good',
    purchase_date: new Date().toISOString().split('T')[0],

    // Purchase Details
    supplier: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit_cost: '',
    purchase_cost: '',
    tax_gst: '',
    other_charges: '',
    total_invoice_amount: '',
    paid_from: 'General Fund',
    payment_ref: '',

    // Purchase Invoice & Notes
    invoice_notes: '',

    // Warranty
    warranty_available: 'Yes',
    warranty_expiry: '',
    warranty_provider: '',

    // Maintenance Schedule
    maintenance_frequency: '1 Month',
    next_maintenance: '',
    maintenance_required: 'Yes'
  });

  const invoiceFileRef = useRef(null);
  const otherDocFileRef = useRef(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [otherDocFile, setOtherDocFile] = useState(null);
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // --------------------------------------------------------------------------
  // DISPOSAL FORM STATE
  // --------------------------------------------------------------------------
  const [disposalForm, setDisposalForm] = useState({
    disposal_no: '',
    asset_id: '',
    asset_code: '',
    asset_name: '',
    disposal_date: new Date().toISOString().split('T')[0],
    dispose_reason: '',
    disposal_type: 'Demolish', // Demolish or Sale

    // Sale & Income
    sale_amount: '',
    buyer_name: '',
    sale_ref_no: '',
    income_fund: 'General Fund',
    payment_method: 'Cash',
    transaction_ref: '',

    // Demolition / Scrap
    scrap_amount: '',
    recovery_treatment: 'No Income',

    // Financial Calculation & Expenses
    disposal_expenses: '',
    disposal_notes: ''
  });

  const disposalDocFileRef = useRef(null);
  const [disposalDocFile, setDisposalDocFile] = useState(null);
  const [submittingDisposal, setSubmittingDisposal] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resAssets, resDisposals] = await Promise.all([
        getAssets().catch(() => []),
        getAssetDisposals().catch(() => [])
      ]);
      if (Array.isArray(resAssets)) setAssets(resAssets);
      if (Array.isArray(resDisposals)) setDisposals(resDisposals);
    } catch (err) {
      console.warn('Error loading assets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------------------------------
  // PURCHASE DETAILS CALCULATIONS
  // --------------------------------------------------------------------------
  useEffect(() => {
    const qty = parseInt(assetForm.quantity) || 1;
    const uCost = parseFloat(assetForm.unit_cost) || 0;
    const pCost = qty * uCost;
    const tax = parseFloat(assetForm.tax_gst) || 0;
    const other = parseFloat(assetForm.other_charges) || 0;
    const total = pCost + tax + other;

    setAssetForm(prev => ({
      ...prev,
      purchase_cost: pCost ? pCost.toFixed(2) : prev.purchase_cost,
      total_invoice_amount: total ? total.toFixed(2) : prev.total_invoice_amount
    }));
  }, [assetForm.quantity, assetForm.unit_cost, assetForm.tax_gst, assetForm.other_charges]);

  // Handle Save Asset Submit
  const handleSaveAssetSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!assetForm.asset_name.trim()) {
      alert('Please enter Asset Name');
      return;
    }

    setSubmittingAsset(true);
    try {
      const payload = {
        ...assetForm,
        quantity: parseInt(assetForm.quantity) || 1,
        unit_cost: parseFloat(assetForm.unit_cost) || 0,
        purchase_cost: parseFloat(assetForm.purchase_cost) || 0,
        tax_gst: parseFloat(assetForm.tax_gst) || 0,
        other_charges: parseFloat(assetForm.other_charges) || 0,
        total_invoice_amount: parseFloat(assetForm.total_invoice_amount) || 0,
        invoice_doc_url: invoiceFile ? invoiceFile.name : null,
        other_doc_url: otherDocFile ? otherDocFile.name : null
      };

      await createAsset(payload);
      await loadData();
      setShowAddAssetModal(false);
      
      // Reset Form
      setAssetForm({
        asset_code: '',
        asset_name: '',
        category: 'Generator',
        brand_model: '',
        serial_number: '',
        barcode: '',
        location: 'Prayer Hall',
        status: 'Good',
        purchase_date: new Date().toISOString().split('T')[0],
        supplier: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        quantity: 1,
        unit_cost: '',
        purchase_cost: '',
        tax_gst: '',
        other_charges: '',
        total_invoice_amount: '',
        paid_from: 'General Fund',
        payment_ref: '',
        invoice_notes: '',
        warranty_available: 'Yes',
        warranty_expiry: '',
        warranty_provider: '',
        maintenance_frequency: '1 Month',
        next_maintenance: '',
        maintenance_required: 'Yes'
      });
      setInvoiceFile(null);
      setOtherDocFile(null);
    } catch (err) {
      console.error('Failed to create asset:', err);
      alert('Failed to save asset. Please try again.');
    } finally {
      setSubmittingAsset(false);
    }
  };

  // Open Add Asset Modal with Auto-generated Asset ID
  const handleOpenAddAssetModal = () => {
    const nextCount = assets.length + 1;
    const autoCode = `AST-${nextCount < 10 ? '00' : nextCount < 100 ? '0' : ''}${nextCount}`;
    setAssetForm(prev => ({
      ...prev,
      asset_code: autoCode
    }));
    setShowAddAssetModal(true);
  };

  // Open Disposal Modal for Selected Asset or General
  const handleOpenDisposalModal = (assetObj = null) => {
    const activeAssetsList = assets.filter(a => a.status !== 'Disposed');
    const selected = assetObj || activeAssetsList[0];

    const nextCount = disposals.length + 1;
    const dispNo = `DISP-${nextCount < 10 ? '00' : nextCount < 100 ? '0' : ''}${nextCount}`;

    setDisposalForm({
      disposal_no: dispNo,
      asset_id: selected ? selected.id : '',
      asset_code: selected ? selected.asset_code : '',
      asset_name: selected ? selected.asset_name : '',
      disposal_date: new Date().toISOString().split('T')[0],
      dispose_reason: '',
      disposal_type: 'Demolish',
      sale_amount: '',
      buyer_name: '',
      sale_ref_no: '',
      income_fund: 'General Fund',
      payment_method: 'Cash',
      transaction_ref: '',
      scrap_amount: '',
      recovery_treatment: 'No Income'
    });
    setDisposalDocFile(null);
    setShowDisposalModal(true);
  };

  // Handle Disposal Asset Select Dropdown Change
  const handleDisposalAssetSelect = (e) => {
    const targetId = e.target.value;
    const found = assets.find(a => String(a.id) === String(targetId));
    if (found) {
      setDisposalForm(prev => ({
        ...prev,
        asset_id: found.id,
        asset_code: found.asset_code,
        asset_name: found.asset_name
      }));
    }
  };

  // Handle Confirm Disposal Submit
  const handleConfirmDisposalSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!disposalForm.asset_name) {
      alert('Please select an active asset to dispose.');
      return;
    }

    if (disposalForm.disposal_type === 'Sale' && (!disposalForm.sale_amount || parseFloat(disposalForm.sale_amount) <= 0)) {
      alert('Please enter a valid Sale Amount for Sale disposal.');
      return;
    }

    setSubmittingDisposal(true);
    try {
      const payload = {
        ...disposalForm,
        asset_id: parseInt(disposalForm.asset_id) || undefined,
        sale_amount: parseFloat(disposalForm.sale_amount) || 0,
        scrap_amount: parseFloat(disposalForm.scrap_amount) || 0,
        disposal_expenses: parseFloat(disposalForm.disposal_expenses) || 0,
        net_disposal_amount: ((parseFloat(disposalForm.sale_amount) || parseFloat(disposalForm.scrap_amount) || 0) - (parseFloat(disposalForm.disposal_expenses) || 0)),
        document_url: disposalDocFile ? disposalDocFile.name : null
      };

      await createAssetDisposal(payload);
      await loadData();
      setShowDisposalModal(false);
    } catch (err) {
      console.error('Failed to dispose asset:', err);
      alert('Failed to process asset disposal. Please check backend logs.');
    } finally {
      setSubmittingDisposal(false);
    }
  };

  // Stat Counters
  const activeAssets = assets.filter(a => a.status !== 'Disposed');
  const goodConditionCount = activeAssets.filter(a => a.status === 'Good' || a.condition === 'Good').length;
  const needsServiceCount = activeAssets.filter(a => a.status === 'Needs Service' || a.status === 'Under Repair' || a.condition === 'Needs Service').length;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      <UserSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP HEADER (Matching Reference Image 1) */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assets & Maintenance</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Track generators, AC, sound systems, CCTV, furniture and maintenance.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleOpenDisposalModal()}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              Dispose Asset
            </button>
            <button
              onClick={handleOpenAddAssetModal}
              className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add Asset</span>
            </button>
          </div>
        </header>

        <main className="px-8 pb-10 space-y-6 flex-1">
          
          {/* STAT CARDS ROW (Matching Reference Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Live Assets */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Live Assets</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{activeAssets.length}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">PostgreSQL</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ◈
              </div>
            </div>

            {/* Card 2: Good Condition */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Good Condition</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{goodConditionCount}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Active</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ✓
              </div>
            </div>

            {/* Card 3: Needs Service */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Needs Service</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{needsServiceCount}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Maintenance due</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                !
              </div>
            </div>

            {/* Card 4: Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Status</p>
                <p className="text-lg font-black text-slate-900 mt-1">Live API</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Connected</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ✖
              </div>
            </div>

          </div>

          {/* ASSETS TABLE (Matching Reference Image 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">ASSET ID</th>
                    <th className="py-3.5 px-5">ASSET NAME</th>
                    <th className="py-3.5 px-5">CATEGORY</th>
                    <th className="py-3.5 px-5">LOCATION</th>
                    <th className="py-3.5 px-5">ESTIMATED COST</th>
                    <th className="py-3.5 px-5">STATUS</th>
                    <th className="py-3.5 px-5">NEXT MAINTENANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    assets.map((ast) => {
                      const estCost = ast.purchase_cost || ast.total_invoice_amount || 0;
                      const isDisposed = ast.status === 'Disposed';

                      return (
                        <tr key={ast.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5 font-bold font-mono text-slate-900">
                            {ast.asset_code || `AST-${ast.id}`}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-900">{ast.asset_name}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600">{ast.category}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600">{ast.location}</td>
                          <td className="py-4 px-5 font-extrabold text-slate-900">
                            ₹{estCost.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isDisposed ? 'bg-rose-100 text-rose-800' :
                              ast.status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              ast.status === 'Needs Service' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {ast.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-600">
                            {ast.next_maintenance || 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ASSET DISPOSAL LOG TABLE (Matching Reference Image 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Asset Disposal Log</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">DISPOSAL NO.</th>
                    <th className="py-3.5 px-5">ASSET ID & NAME</th>
                    <th className="py-3.5 px-5">DATE</th>
                    <th className="py-3.5 px-5">REASON</th>
                    <th className="py-3.5 px-5">TYPE</th>
                    <th className="py-3.5 px-5">INCOME</th>
                    <th className="py-3.5 px-5">EXPENSES</th>
                    <th className="py-3.5 px-5">NET AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    disposals.map((disp) => {
                      const inc = disp.sale_amount || disp.scrap_amount || 0;
                      const exp = disp.disposal_expenses || 0;
                      const net = disp.net_disposal_amount !== undefined ? disp.net_disposal_amount : (inc - exp);

                      return (
                        <tr key={disp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5 font-bold font-mono text-slate-900">{disp.disposal_no}</td>
                          <td className="py-4 px-5 font-bold text-slate-900">{disp.asset_code ? `${disp.asset_code} — ` : ''}{disp.asset_name}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600">{disp.disposal_date}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600">{disp.dispose_reason || 'Decommissioned'}</td>
                          <td className="py-4 px-5 font-extrabold text-slate-800">{disp.disposal_type}</td>
                          <td className="py-4 px-5 font-extrabold text-emerald-700">
                            ₹{inc.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5 font-extrabold text-rose-600">
                            ₹{exp.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5 font-black text-slate-900">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${net >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              ₹{net.toLocaleString('en-IN')}
                            </span>
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
      {/* ADD ASSET / ASSET PURCHASE MODAL (Matching Reference Image 2)            */}
      {/* ========================================================================= */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">Add Asset / Asset Purchase</h2>
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-8rem)] text-xs">
              
              {/* Top Banner */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-blue-700 text-[11px] font-medium leading-relaxed">
                Asset creation and asset purchase are combined. Saving this form creates the asset record and, when purchase details are entered, records the purchase information for finance/reporting.
              </div>

              <form id="addAssetForm" onSubmit={handleSaveAssetSubmit} className="space-y-6">
                
                {/* SECTION 1: ASSET INFORMATION */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Asset Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset ID</label>
                      <input
                        type="text"
                        disabled
                        value={assetForm.asset_code || `AST-${(assets.length + 1) < 10 ? '00' : (assets.length + 1) < 100 ? '0' : ''}${assets.length + 1}`}
                        placeholder="Auto-generated"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Diesel Generator"
                        value={assetForm.asset_name}
                        onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Category</label>
                      <select
                        value={assetForm.category}
                        onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Generator">Generator</option>
                        <option value="Microphone">Microphone</option>
                        <option value="Speaker">Speaker</option>
                        <option value="Air Conditioning">Air Conditioning</option>
                        <option value="CCTV">CCTV</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Computer / IT">Computer / IT</option>
                        <option value="Vehicle">Vehicle</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Brand / Model</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={assetForm.brand_model}
                        onChange={(e) => setAssetForm({ ...assetForm, brand_model: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Serial Number</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={assetForm.serial_number}
                        onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset Tag / Barcode</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={assetForm.barcode}
                        onChange={(e) => setAssetForm({ ...assetForm, barcode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Location</label>
                      <select
                        value={assetForm.location}
                        onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Prayer Hall">Prayer Hall</option>
                        <option value="Main Building">Main Building</option>
                        <option value="Electrical Room">Electrical Room</option>
                        <option value="Office">Office</option>
                        <option value="Madrasa">Madrasa</option>
                        <option value="Marriage Hall">Marriage Hall</option>
                        <option value="Store Room">Store Room</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset Status</label>
                      <select
                        value={assetForm.status}
                        onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Good">Good</option>
                        <option value="Needs Service">Needs Service</option>
                        <option value="Under Repair">Under Repair</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={assetForm.purchase_date}
                        onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PURCHASE DETAILS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Purchase Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Supplier / Vendor</label>
                      <input
                        type="text"
                        placeholder="Vendor name"
                        value={assetForm.supplier}
                        onChange={(e) => setAssetForm({ ...assetForm, supplier: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Invoice Number</label>
                      <input
                        type="text"
                        placeholder="INV-001"
                        value={assetForm.invoice_number}
                        onChange={(e) => setAssetForm({ ...assetForm, invoice_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={assetForm.invoice_date}
                        onChange={(e) => setAssetForm({ ...assetForm, invoice_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={assetForm.quantity}
                        onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={assetForm.unit_cost}
                        onChange={(e) => setAssetForm({ ...assetForm, unit_cost: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Purchase Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={assetForm.purchase_cost}
                        onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Tax / GST</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={assetForm.tax_gst}
                        onChange={(e) => setAssetForm({ ...assetForm, tax_gst: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Other Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={assetForm.other_charges}
                        onChange={(e) => setAssetForm({ ...assetForm, other_charges: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Total Invoice Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={assetForm.total_invoice_amount}
                        onChange={(e) => setAssetForm({ ...assetForm, total_invoice_amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-slate-50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Paid From</label>
                      <select
                        value={assetForm.paid_from}
                        onChange={(e) => setAssetForm({ ...assetForm, paid_from: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="General Fund">General Fund</option>
                        <option value="Construction Fund">Construction Fund</option>
                        <option value="Other Fund">Other Fund</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Account">Bank Account</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Reference</label>
                      <input
                        type="text"
                        placeholder="Optional transaction / cheque / UTR"
                        value={assetForm.payment_ref}
                        onChange={(e) => setAssetForm({ ...assetForm, payment_ref: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: PURCHASE INVOICE */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Purchase Invoice</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Upload Invoice</label>
                      <input
                        ref={invoiceFileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && setInvoiceFile(e.target.files[0])}
                        className="hidden"
                      />
                      <div
                        onClick={() => invoiceFileRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all space-y-1"
                      >
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="font-bold text-slate-600 text-xs">
                          {invoiceFile ? invoiceFile.name : 'Upload supplier invoice — PDF, JPG or PNG'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Invoice Details / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Invoice description, warranty details, supplier notes or other purchase information."
                        value={assetForm.invoice_notes}
                        onChange={(e) => setAssetForm({ ...assetForm, invoice_notes: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: WARRANTY */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Warranty</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Warranty Available</label>
                      <select
                        value={assetForm.warranty_available}
                        onChange={(e) => setAssetForm({ ...assetForm, warranty_available: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Warranty Expiry</label>
                      <input
                        type="date"
                        disabled={assetForm.warranty_available === 'No'}
                        value={assetForm.warranty_expiry}
                        onChange={(e) => setAssetForm({ ...assetForm, warranty_expiry: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none ${
                          assetForm.warranty_available === 'No' ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Warranty Provider</label>
                      <input
                        type="text"
                        disabled={assetForm.warranty_available === 'No'}
                        placeholder="Optional"
                        value={assetForm.warranty_provider}
                        onChange={(e) => setAssetForm({ ...assetForm, warranty_provider: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none ${
                          assetForm.warranty_available === 'No' ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: MAINTENANCE SCHEDULE */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Maintenance Schedule</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Frequency</label>
                      <select
                        value={assetForm.maintenance_frequency}
                        onChange={(e) => setAssetForm({ ...assetForm, maintenance_frequency: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="12 Months">12 Months</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Next Maintenance</label>
                      <input
                        type="date"
                        value={assetForm.next_maintenance}
                        onChange={(e) => setAssetForm({ ...assetForm, next_maintenance: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Required</label>
                      <select
                        value={assetForm.maintenance_required}
                        onChange={(e) => setAssetForm({ ...assetForm, maintenance_required: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: DOCUMENTS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Documents</h3>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Other Asset Documents</label>
                    <input
                      ref={otherDocFileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && setOtherDocFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div
                      onClick={() => otherDocFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all space-y-1"
                    >
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-bold text-slate-600 text-xs">
                        {otherDocFile ? otherDocFile.name : 'Upload warranty card, quotation, service documents or other files'}
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
                onClick={() => setShowAddAssetModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="addAssetForm"
                disabled={submittingAsset}
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {submittingAsset ? 'Saving...' : 'Save Asset & Purchase'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSET DISPOSAL MODAL (Matching Reference Image 3)                         */}
      {/* ========================================================================= */}
      {showDisposalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">Asset Disposal</h2>
              <button
                onClick={() => setShowDisposalModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-8rem)] text-xs">
              
              <form id="disposalForm" onSubmit={handleConfirmDisposalSubmit} className="space-y-6">
                
                {/* SECTION 1: ASSET TO DISPOSE */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Asset to Dispose</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Asset</label>
                      <select
                        value={disposalForm.asset_id}
                        onChange={handleDisposalAssetSelect}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        {activeAssets.length === 0 ? (
                          <option value="">No Active Assets Available</option>
                        ) : (
                          activeAssets.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.asset_code ? `${a.asset_code} — ` : ''}{a.asset_name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Disposal Date</label>
                      <input
                        type="date"
                        value={disposalForm.disposal_date}
                        onChange={(e) => setDisposalForm({ ...disposalForm, disposal_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Disposal No.</label>
                      <input
                        type="text"
                        disabled
                        placeholder="Auto-generated"
                        value={disposalForm.disposal_no}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: DISPOSAL DETAILS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Disposal Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Dispose Reason</label>
                      <textarea
                        rows={3}
                        placeholder="Explain why this asset is being disposed, e.g. damaged, obsolete, replacement, beyond repair."
                        value={disposalForm.dispose_reason}
                        onChange={(e) => setDisposalForm({ ...disposalForm, dispose_reason: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Type of Disposal</label>
                      <select
                        value={disposalForm.disposal_type}
                        onChange={(e) => setDisposalForm({ ...disposalForm, disposal_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Demolish">Demolish</option>
                        <option value="Sale">Sale</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* CONDITIONAL SECTION A: SALE & INCOME (If Disposal Type === 'Sale') */}
                {disposalForm.disposal_type === 'Sale' && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Sale & Income</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Sale Amount <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={disposalForm.sale_amount}
                          onChange={(e) => setDisposalForm({ ...disposalForm, sale_amount: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Buyer / Purchaser Name</label>
                        <input
                          type="text"
                          placeholder="Purchaser name"
                          value={disposalForm.buyer_name}
                          onChange={(e) => setDisposalForm({ ...disposalForm, buyer_name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Sale Reference / Receipt No.</label>
                        <input
                          type="text"
                          placeholder="REC-001"
                          value={disposalForm.sale_ref_no}
                          onChange={(e) => setDisposalForm({ ...disposalForm, sale_ref_no: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Income Account / Fund</label>
                        <select
                          value={disposalForm.income_fund}
                          onChange={(e) => setDisposalForm({ ...disposalForm, income_fund: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="General Fund">General Fund</option>
                          <option value="Other Income">Other Income</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Method</label>
                        <select
                          value={disposalForm.payment_method}
                          onChange={(e) => setDisposalForm({ ...disposalForm, payment_method: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="Cash">Cash</option>
                          <option value="QR / UPI">QR / UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction Reference</label>
                        <input
                          type="text"
                          placeholder="Transaction / UTR reference"
                          value={disposalForm.transaction_ref}
                          onChange={(e) => setDisposalForm({ ...disposalForm, transaction_ref: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-emerald-800 text-[11px] font-medium leading-relaxed">
                      When a disposed asset is sold, the sale amount will automatically create an Income transaction and increase the selected cash/bank account or fund balance. The asset status will become <strong>Disposed</strong>.
                    </div>
                  </div>
                )}

                {/* CONDITIONAL SECTION B: DEMOLITION / SCRAP (If Disposal Type === 'Demolish') */}
                {disposalForm.disposal_type === 'Demolish' && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Demolition / Scrap</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Scrap / Recovery Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={disposalForm.scrap_amount}
                          onChange={(e) => setDisposalForm({ ...disposalForm, scrap_amount: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Recovery Treatment</label>
                        <select
                          value={disposalForm.recovery_treatment}
                          onChange={(e) => setDisposalForm({ ...disposalForm, recovery_treatment: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="No Income">No Income</option>
                          <option value="Record as Other Income">Record as Other Income</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: FINANCIAL EXPENSES & CALCULATION */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Financial Expenses & Net Calculation</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Disposal Expenses (Fee, Transport, Decommissioning)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={disposalForm.disposal_expenses}
                        onChange={(e) => setDisposalForm({ ...disposalForm, disposal_expenses: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Disposal Notes / Remarks</label>
                      <input
                        type="text"
                        placeholder="Optional remarks"
                        value={disposalForm.disposal_notes}
                        onChange={(e) => setDisposalForm({ ...disposalForm, disposal_notes: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown Live Summary */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Financial Breakdown</p>
                      <p className="text-xs font-medium text-slate-300 mt-0.5">
                        Income: ₹{((disposalForm.disposal_type === 'Sale' ? parseFloat(disposalForm.sale_amount) : parseFloat(disposalForm.scrap_amount)) || 0).toLocaleString('en-IN')} − Expenses: ₹{(parseFloat(disposalForm.disposal_expenses) || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Net Disposal Amount</p>
                      <p className="text-lg font-black text-emerald-400">
                        ₹{(((disposalForm.disposal_type === 'Sale' ? parseFloat(disposalForm.sale_amount) : parseFloat(disposalForm.scrap_amount)) || 0) - (parseFloat(disposalForm.disposal_expenses) || 0)).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: SUPPORTING DOCUMENTS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Supporting Documents</h3>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Upload Disposal Document</label>
                    <input
                      ref={disposalDocFileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && setDisposalDocFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div
                      onClick={() => disposalDocFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all space-y-1"
                    >
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-bold text-slate-600 text-xs">
                        {disposalDocFile ? disposalDocFile.name : 'Upload sale receipt, approval, demolition report or other document'}
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
                onClick={() => setShowDisposalModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="disposalForm"
                disabled={submittingDisposal}
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {submittingDisposal ? 'Processing Disposal...' : 'Confirm Disposal'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
