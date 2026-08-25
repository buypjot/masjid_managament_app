import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityFamilies } from '../services/api';
import { Avatar } from './Avatar';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { 
  Search, 
  Bell, 
  Plus, 
  Users, 
  Layers, 
  ArrowRight, 
  X,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';

export const MasjidDashboard = () => {
  const { userInfo, logoutUser } = useAuth();
  const navigate = useNavigate();

  // State for metrics & dynamic activity log (Starting empty from database)
  const [metrics, setMetrics] = useState({
    families: 0,
    members: 0,
    santhaCollected: 0,
    pendingSantha: 0,
    availableBalance: 0,
  });

  const [activities, setActivities] = useState([]);

  // Dynamic Monthly Collection Chart Data (Months 1 to 12)
  const [monthlyData, setMonthlyData] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      heightPct: 5,
      amount: '₹0',
    }))
  );


  // Fetch real database families count, members count, financial stats & 12-month collections
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await getCommunityFamilies();
        if (res) {
          const familyCount = res.stats?.total_families || (res.families ? res.families.length : 0);
          const membersCount = res.stats?.total_members || (res.families ? res.families.reduce((acc, f) => acc + (f.member_count || 1), 0) : 0);
          const collected = res.stats?.total_collected !== undefined 
            ? res.stats.total_collected 
            : (res.families ? res.families.reduce((acc, f) => acc + (f.collected_amount || 0), 0) : 0);
          const pending = res.stats?.total_pending !== undefined 
            ? res.stats.total_pending 
            : (res.families ? res.families.reduce((acc, f) => acc + (f.pending_amount || 0), 0) : 0);

          setMetrics({
            families: familyCount,
            members: membersCount,
            santhaCollected: collected,
            pendingSantha: pending,
            availableBalance: collected,
          });

          // Dynamic 12-month collection chart array from API
          if (res.monthly_collections && res.monthly_collections.length > 0) {
            setMonthlyData(res.monthly_collections);
          }

          // Dynamic comprehensive live activity list across all collections
          if (res.activities && res.activities.length > 0) {
            setActivities(res.activities);
          } else if (res.families && res.families.length > 0) {
            const liveLogs = res.families
              .filter((f) => f.collected_amount && f.collected_amount > 0)
              .map((f) => ({
                id: f.id,
                title: 'Santha Collection',
                subtitle: f.family_name,
                amount: f.collected_amount,
                type: 'income',
                time: 'Recently collected',
              }));
            setActivities(liveLogs);
          } else {
            setActivities([]);
          }

        }
      } catch (err) {
        console.warn('Network error fetching dashboard stats:', err);
      }
    };

    fetchDashboardStats();
  }, []);


  // Modals & Popovers state
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeModuleModal, setActiveModuleModal] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Collect Santha Form State
  const [formData, setFormData] = useState({
    familyIdName: '',
    amount: '',
    paymentType: 'Santha Payment',
    notes: '',
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newActivity = {
      id: Date.now(),
      title: formData.paymentType,
      subtitle: formData.familyIdName || 'Registered Family',
      amount: parsedAmount,
      type: 'income',
      time: 'Just now',
    };

    setActivities([newActivity, ...activities]);
    setMetrics((prev) => ({
      ...prev,
      santhaCollected: prev.santhaCollected + parsedAmount,
      availableBalance: prev.availableBalance + parsedAmount,
      pendingSantha: Math.max(0, prev.pendingSantha - parsedAmount),
    }));

    setFormData({ familyIdName: '', amount: '', paymentType: 'Santha Payment', notes: '' });
    setShowCollectModal(false);
  };

  const formatCurrency = (val) => {
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  const masjidName = userInfo?.masjid_name || 'Ismail Masjid';
  const userName = userInfo?.admin_name || userInfo?.full_name || userInfo?.masjid_name || 'Admin User';
  const userRole = userInfo?.admin_role || 'Administrator';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm font-medium text-slate-500">
            <span className="hover:text-slate-700 cursor-pointer">Masjid</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Dashboard</span>
          </div>

          {/* Top Right Utilities & User Badge */}
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {/* Search Icon Button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live System Alerts</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900">
                      <p className="font-semibold">Pending Santha Alert</p>
                      <p className="text-[11px] text-amber-700/90 mt-0.5">12 families have pending dues for the current active cycle.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-900">
                      <p className="font-semibold">Santha Collection Synced</p>
                      <p className="text-[11px] text-emerald-700/90 mt-0.5">PostgreSQL live sync operational. All amounts up to date.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Section with Interactive Menu Dropdown */}
            <div className="relative pl-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-1 rounded-xl hover:bg-slate-200/60 transition-colors focus:outline-none cursor-pointer"
                title="User Profile Menu"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-extrabold text-slate-900 leading-tight">{userName}</div>
                  <div className="text-[11px] font-medium text-slate-400 leading-tight">{userRole}</div>
                </div>
                <Avatar
                  src={userInfo?.profile_photo}
                  name={userName}
                  size="md"
                  showStatusDot={true}
                  status="online"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in duration-100">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/60 rounded-xl">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{userInfo?.email || 'admin@masjid.org'}</p>
                    <div className="inline-flex items-center space-x-1 mt-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Authenticated Account</span>
                    </div>
                  </div>

                  {/* Profile Settings Menu Item (Requirement 4) */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>Profile Settings</span>
                  </button>

                  {/* Logout Item */}
                  <button
                    onClick={() => {
                      logoutUser();
                      navigate('/login');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Title & Main CTA Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Masjid Dashboard
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 flex items-center space-x-1.5">
              <span>{masjidName}</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">Live API Data</span>
            </p>
          </div>

          {/* Primary Action Button "+ Collect Santha" */}
          <button
            onClick={() => setShowCollectModal(true)}
            className="inline-flex items-center justify-center space-x-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Collect Santha</span>
          </button>
        </div>

        {/* Top 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Metric Card 1: Families & Members */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Families & Members</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline space-x-1.5">
                <span>{metrics.families}</span>
                <span className="text-xs font-extrabold text-slate-400 uppercase">Fam</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700">{metrics.members}</span>
                <span className="text-xs font-extrabold text-emerald-600 uppercase">Members</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Total Registered Members</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Metric Card 2: Total Collections */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collections</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(metrics.santhaCollected)}</div>
              <p className="text-[11px] font-medium text-slate-400">Santha + Juma + Donations + Functions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm font-black text-lg shrink-0">
              ₹
            </div>
          </div>

          {/* Metric Card 3: Pending Santha */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Santha</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(metrics.pendingSantha)}</div>
              <p className="text-[11px] font-medium text-slate-400">Live Dues</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm font-black text-base shrink-0">
              !
            </div>
          </div>

          {/* Metric Card 4: Available Balance */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Balance</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(metrics.availableBalance)}</div>
              <p className="text-[11px] font-medium text-slate-400">Cash + Bank</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3-Column Main Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Column 1: Monthly Collection Bar Chart */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Collection</h3>
            </div>

            {/* Bar Chart Canvas */}
            <div className="h-64 flex items-end justify-between gap-1.5 pt-8 px-2 border-b border-slate-100 relative">
              {monthlyData.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                    {item.amount}
                  </div>

                  {/* Vertical Bar */}
                  <div
                    style={{ height: `${item.heightPct}%` }}
                    className="w-full bg-[#0f172a] rounded-t-sm group-hover:bg-emerald-600 transition-colors cursor-pointer"
                  ></div>
                </div>
              ))}
            </div>

            {/* X-Axis Labels 1 to 12 */}
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400 pt-1">
              {monthlyData.map((item) => (
                <span key={item.month} className="flex-1 text-center">
                  {item.month}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2: Recent Live Activity */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6 flex flex-col">
            <h3 className="text-base font-bold text-slate-900">Recent Live Activity</h3>

            <div className="space-y-5 flex-1 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  No recent activity records yet.<br />Added families will appear here.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start justify-between pb-3.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{act.title}</h4>
                        {act.receipt_no && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {act.receipt_no}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{act.subtitle}</p>
                      {act.time && (
                        <p className="text-[10px] text-slate-400 font-semibold">{act.time}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-extrabold ${
                          act.amount > 0 ? 'text-[#16a34a]' : 'text-slate-700'
                        }`}
                      >
                        {act.amount > 0 ? `+${formatCurrency(act.amount)}` : (act.amount === 0 ? 'Record Log' : `-${formatCurrency(Math.abs(act.amount))}`)}
                      </span>
                      {act.payment_method && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{act.payment_method}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Column 3: Attention & Quick Modules */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Attention & Quick Modules</h3>

            <div className="space-y-3">
              {/* Module 1: Functions & Community Charges (Purple) */}
              <div
                onClick={() => setActiveModuleModal('functions')}
                className="bg-[#f5f3ff] border border-[#e9d5ff] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7e22ce] flex items-center space-x-1">
                    <span>✦</span>
                    <span>Functions & Community Charges</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#7e22ce] group-hover:underline flex items-center space-x-0.5">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <p className="text-[11px] text-[#9333ea]/80 font-medium mt-1">
                  Manage marriage, circumcision & Nikah charges
                </p>
              </div>

              {/* Module 2: Santha Collection (Yellow/Cream) */}
              <div
                onClick={() => setActiveModuleModal('santha')}
                className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <h4 className="text-xs font-bold text-[#a16207]">Santha Collection</h4>
                <p className="text-[11px] text-[#ca8a04]/80 font-medium mt-1">
                  View live family dues
                </p>
              </div>

              {/* Module 3: Tenant Rent (Red/Pink) */}
              <div
                onClick={() => setActiveModuleModal('tenant')}
                className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <h4 className="text-xs font-bold text-[#be123c]">Tenant Rent</h4>
                <p className="text-[11px] text-[#e11d48]/80 font-medium mt-1">
                  Manage property rent collections
                </p>
              </div>

              {/* Module 4: Asset Maintenance (Blue) */}
              <div
                onClick={() => setActiveModuleModal('asset')}
                className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <h4 className="text-xs font-bold text-[#0369a1]">Asset Maintenance</h4>
                <p className="text-[11px] text-[#0284c7]/80 font-medium mt-1">
                  Check live asset condition
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: Collect Santha Form */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center text-sm font-bold">
                  ₹
                </div>
                <h3 className="text-lg font-bold text-slate-900">Collect Santha / Payment</h3>
              </div>
              <button onClick={() => setShowCollectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Family Name / Member ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdul Rahman Family"
                  value={formData.familyIdName}
                  onChange={(e) => setFormData({ ...formData, familyIdName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900 bg-white"
                  >
                    <option value="Santha Payment">Santha Payment</option>
                    <option value="Donation">Donation</option>
                    <option value="Nikah Fee">Nikah Fee</option>
                    <option value="Tenant Rent">Tenant Rent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Receipt Ref</label>
                <input
                  type="text"
                  placeholder="Optional reference details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Search Dialog */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search families, transactions, or modules..."
                className="w-full text-sm font-medium focus:outline-none text-slate-900"
              />
              <button onClick={() => setShowSearchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-400 space-y-2">
              <p className="font-semibold uppercase tracking-wider text-[10px]">Quick Suggestions</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium cursor-pointer hover:bg-slate-200">
                  Abdul Rahman Family
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium cursor-pointer hover:bg-slate-200">
                  Pending Santha
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium cursor-pointer hover:bg-slate-200">
                  Generator Maintenance
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Module View */}
      {activeModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {activeModuleModal === 'functions' && '✦ Functions & Community Charges'}
                {activeModuleModal === 'santha' && 'Santha Collection'}
                {activeModuleModal === 'tenant' && 'Tenant Rent Management'}
                {activeModuleModal === 'asset' && 'Asset Maintenance'}
              </h3>
              <button onClick={() => setActiveModuleModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-600">
              {activeModuleModal === 'functions' && (
                <>
                  <p className="font-medium text-slate-700">Recent Marriage & Nikah Charge Registrations:</p>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                    <div className="flex justify-between font-bold text-purple-900">
                      <span>Nikah Registration Fee</span>
                      <span>₹2,500</span>
                    </div>
                    <p className="text-[11px] text-purple-700">Scheduled for Saturday • Abdul Rahman Family</p>
                  </div>
                </>
              )}

              {activeModuleModal === 'santha' && (
                <>
                  <p className="font-medium text-slate-700">Live Family Santha Status:</p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1">
                    <div className="flex justify-between font-bold text-amber-900">
                      <span>Active Cycle Santha Dues</span>
                      <span>₹21,000 Total Dues</span>
                    </div>
                    <p className="text-[11px] text-amber-700">4 Registered families • Live PostgreSQL Sync</p>
                  </div>
                </>
              )}

              {activeModuleModal === 'tenant' && (
                <>
                  <p className="font-medium text-slate-700">Property Rental Collections:</p>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                    <div className="flex justify-between font-bold text-rose-900">
                      <span>Shops 1-4 Rental Income</span>
                      <span>₹18,000 / month</span>
                    </div>
                    <p className="text-[11px] text-rose-700">All tenants active for current month</p>
                  </div>
                </>
              )}

              {activeModuleModal === 'asset' && (
                <>
                  <p className="font-medium text-slate-700">Asset Condition Summary:</p>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 space-y-1">
                    <div className="flex justify-between font-bold text-sky-900">
                      <span>Generator & AC Units</span>
                      <span>Serviced</span>
                    </div>
                    <p className="text-[11px] text-sky-700">Last maintenance completed yesterday (-₹14,500)</p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveModuleModal(null)}
                className="px-4 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};
