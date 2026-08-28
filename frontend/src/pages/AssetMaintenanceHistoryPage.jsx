import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import {
  getAssets,
  getAssetMaintenances,
  getAssetDisposals
} from '../services/api';
import {
  Package, Wrench, History, Search, Filter, Calendar, IndianRupee,
  Clock, ArrowRight, ShieldCheck, Tag, MapPin, CheckCircle2, AlertTriangle,
  XCircle, Truck, FileText, Check, ChevronRight
} from 'lucide-react';

export default function AssetMaintenanceHistoryPage() {
  const { userInfo } = useAuth();

  const [assets, setAssets] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resAssets, resMnts, resDisps] = await Promise.all([
        getAssets().catch(() => []),
        getAssetMaintenances().catch(() => []),
        getAssetDisposals().catch(() => [])
      ]);

      if (Array.isArray(resAssets)) {
        setAssets(resAssets);
        if (resAssets.length > 0 && !selectedAssetId) {
          setSelectedAssetId(resAssets[0].id);
        }
      }
      if (Array.isArray(resMnts)) setMaintenances(resMnts);
      if (Array.isArray(resDisps)) setDisposals(resDisps);
    } catch (err) {
      console.warn('Error loading asset history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Assets List
  const filteredAssets = assets.filter(a => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.asset_code || '').toLowerCase().includes(q) ||
      (a.asset_name || '').toLowerCase().includes(q) ||
      (a.category || '').toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q)
    );
  });

  const selectedAsset = assets.find(a => String(a.id) === String(selectedAssetId)) || assets[0];

  // Related Records for Selected Asset
  const assetMaintenances = selectedAsset
    ? maintenances.filter(m => String(m.asset_id) === String(selectedAsset.id) || m.asset_code === selectedAsset.asset_code)
    : [];

  const assetDisposal = selectedAsset
    ? disposals.find(d => String(d.asset_id) === String(selectedAsset.id) || d.asset_code === selectedAsset.asset_code)
    : null;

  // Calculate totals for selected asset
  const totalMntCost = assetMaintenances.reduce((acc, curr) => acc + (curr.maintenance_cost || curr.cost || 0), 0);
  const purchaseCost = selectedAsset ? parseFloat(selectedAsset.purchase_cost || selectedAsset.estimated_cost || 0) : 0;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      <UserSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP HEADER */}
        <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200/60 bg-white">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance History & Asset Lifecycle</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Complete chronological lifecycle, repairs, services, and disposal log for each Masjid asset.
            </p>
          </div>
        </header>

        <main className="flex-1 p-8 flex flex-col md:flex-row gap-6 min-h-0">
          
          {/* LEFT PANEL: PRODUCT / ASSET LIST */}
          <div className="w-full md:w-80 shrink-0 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
            
            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">Loading assets...</div>
              ) : filteredAssets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">No assets found.</div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = selectedAsset && asset.id === selectedAsset.id;
                  const isDisposed = asset.status === 'Disposed';

                  return (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {asset.asset_code || `AST-${asset.id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isDisposed
                              ? 'bg-rose-500/20 text-rose-300'
                              : isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {asset.status || 'Good'}
                          </span>
                        </div>
                        <p className={`font-bold text-xs truncate mt-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {asset.asset_name}
                        </p>
                        <p className={`text-[10px] font-medium truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          {asset.category || 'Equipment'} • {asset.location || 'Masjid'}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: CHRONOLOGICAL LIFECYCLE TIMELINE */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
            
            {!selectedAsset ? (
              <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
                Select an asset from the left menu to view its complete lifecycle history.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* SELECTED ASSET HEADER CARD */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs rounded-lg border border-emerald-500/30">
                          {selectedAsset.asset_code || `AST-${selectedAsset.id}`}
                        </span>
                        <span className="px-3 py-1 bg-white/10 text-slate-200 font-extrabold text-xs rounded-lg uppercase">
                          {selectedAsset.status || 'Good'}
                        </span>
                      </div>
                      <h2 className="text-xl font-black mt-2 tracking-tight">{selectedAsset.asset_name}</h2>
                      <div className="flex items-center space-x-4 text-xs text-slate-300 font-semibold mt-2">
                        <span className="flex items-center space-x-1">
                          <Tag className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{selectedAsset.category || 'Equipment'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{selectedAsset.location || 'Masjid Premises'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Purchased: {selectedAsset.purchase_date || 'N/A'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-right min-w-44">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total Investment</p>
                      <p className="text-xl font-black text-emerald-400 mt-0.5">
                        ₹{(purchaseCost + totalMntCost).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium mt-1">
                        Cost: ₹{purchaseCost.toLocaleString('en-IN')} | Mnt: ₹{totalMntCost.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* LIFECYCLE TIMELINE SECTION */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Asset Event Timeline & Maintenance Log
                  </h3>

                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6">
                    
                    {/* EVENT 1: DISPOSAL EVENT (IF DISPOSED) */}
                    {assetDisposal && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                          ✕
                        </div>
                        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black text-[10px] rounded-lg uppercase">
                              Disposal Recorded ({assetDisposal.disposal_type})
                            </span>
                            <span className="text-xs font-bold text-slate-500">{assetDisposal.disposal_date}</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-xs">
                            Asset Disposed — {assetDisposal.disposal_no}
                          </h4>
                          <p className="text-xs text-slate-700 font-medium">
                            <strong>Reason:</strong> {assetDisposal.dispose_reason || 'No disposal reason specified.'}
                          </p>
                          <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-rose-100 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Sale / Recovery Income</p>
                              <p className="font-extrabold text-emerald-700 mt-0.5">₹{(assetDisposal.sale_amount || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Disposal Expenses</p>
                              <p className="font-extrabold text-rose-600 mt-0.5">₹{(assetDisposal.disposal_expenses || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Net Amount</p>
                              <p className="font-black text-slate-900 mt-0.5">
                                ₹{((assetDisposal.sale_amount || 0) - (assetDisposal.disposal_expenses || 0)).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EVENT 2: MAINTENANCE EVENTS */}
                    {assetMaintenances.map((mnt) => (
                      <div key={mnt.id} className="relative">
                        <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                          ⚙
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {mnt.maintenance_code || `MNT-${mnt.id}`}
                              </span>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-lg">
                                {mnt.maintenance_type || 'Service'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{mnt.service_date}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-slate-700 font-medium">
                                <strong>Work Details:</strong> {mnt.work_details || 'Routine maintenance and inspection work.'}
                              </p>
                              {mnt.technician_notes && (
                                <p className="text-slate-500 font-medium mt-1">
                                  <strong>Technician Notes:</strong> {mnt.technician_notes}
                                </p>
                              )}
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Vendor:</span>
                                <span className="font-bold text-slate-900">{mnt.service_provider || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Cost:</span>
                                <span className="font-extrabold text-slate-900">
                                  ₹{(mnt.maintenance_cost || mnt.cost || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Payment Status:</span>
                                <span className={`font-extrabold ${mnt.payment_status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {mnt.payment_status || 'Unpaid'}
                                </span>
                              </div>
                              {mnt.next_due_date && (
                                <div className="flex justify-between pt-1 border-t border-slate-200">
                                  <span className="text-slate-500 font-semibold">Next Service:</span>
                                  <span className="font-bold text-indigo-600">{mnt.next_due_date}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* EVENT 3: ASSET CREATION & PROCUREMENT */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                        ✓
                      </div>
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-lg">
                            Asset Registered / Purchased
                          </span>
                          <span className="text-xs font-bold text-slate-500">{selectedAsset.purchase_date || selectedAsset.created_at || 'Registration Date'}</span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-xs">
                          Procurement Record — {selectedAsset.asset_code || `AST-${selectedAsset.id}`}
                        </h4>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">Quantity & Unit Cost</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {selectedAsset.quantity || 1} unit(s) @ ₹{(selectedAsset.unit_cost || purchaseCost).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">Supplier / Vendor</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{selectedAsset.supplier || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">Paid From</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{selectedAsset.paid_from || 'General Fund'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">Warranty</p>
                            <p className="font-semibold text-slate-700 mt-0.5">
                              {selectedAsset.warranty_available === 'Yes' ? `Expiry: ${selectedAsset.warranty_expiry || 'N/A'}` : 'No Warranty'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

        </main>
      </div>

    </div>
  );
}
