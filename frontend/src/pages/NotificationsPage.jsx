import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import { getCommunityNotifications } from '../services/api';
import { Avatar } from '../components/Avatar';
import {
  Search,
  Bell,
  Users,
  Building2,
  Plus,
  Calendar,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const NotificationsPage = () => {
  const { userInfo } = useAuth();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [notificationItems, setNotificationItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const masjidName = userInfo?.masjid_name || 'Ismail Masjid';
  const userName = userInfo?.admin_name || userInfo?.full_name || userInfo?.masjid_name || 'Admin User';
  const userRole = userInfo?.admin_role || 'Administrator';

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await getCommunityNotifications();
        if (res && res.notifications) {
          setNotificationItems(res.notifications);
        }
      } catch (err) {
        console.warn('Failed to fetch live notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const filteredItems =
    filterCategory === 'All'
      ? notificationItems
      : notificationItems.filter((item) => item.type === filterCategory);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <UserSidebar />

      <div className="flex-1 flex flex-col min-h-screen justify-between overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-500">
              <span className="hover:text-slate-700 cursor-pointer">Masjid</span>
              <span>/</span>
              <span className="text-slate-900 font-bold">Notifications</span>
            </div>

            {/* Right Utilities & User Profile */}
            <div className="flex items-center space-x-3 self-end sm:self-auto">
              <button
                onClick={() => setShowSearchModal(true)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                </button>

                {showNotificationsPopover && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live System Alerts</h4>
                      <button onClick={() => setShowNotificationsPopover(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-900">
                        <p className="font-semibold">5 New Community Activity Items</p>
                        <p className="text-[11px] text-blue-700/90 mt-0.5">Payments, requests & event announcements logged.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pl-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{userName}</div>
                  <div className="text-[11px] font-medium text-slate-400 leading-tight">{userRole}</div>
                </div>
                <Avatar
                  src={userInfo?.profile_photo}
                  name={userName}
                  size="md"
                  showStatusDot={true}
                  status="online"
                />
              </div>
            </div>
          </div>

          {/* Title Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              All important activities and requests from the Masjid community in one place.
            </p>
          </div>

          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Live Notifications */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Notifications</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{notificationItems.length}</div>
                <p className="text-[11px] font-medium text-slate-400">Activity Feed</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm font-black text-base shrink-0">
                !
              </div>
            </div>

            {/* Card 2: Member Requests */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member Requests</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">Live</div>
                <p className="text-[11px] font-medium text-slate-400">New today</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Payments */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">Online</div>
                <p className="text-[11px] font-medium text-slate-400">Real-time</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm font-black text-lg shrink-0">
                ₹
              </div>
            </div>

            {/* Card 4: Status */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">Live API</div>
                <p className="text-[11px] font-medium text-slate-400">Connected</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0 font-extrabold text-base">
                +
              </div>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-medium">
            {['All', 'Member', 'Payment', 'Booking', 'Function', 'Event'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#0f172a] text-white font-bold shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notification Cards List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Fetching live notifications from PostgreSQL...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No live notifications found</p>
                <p className="text-xs text-slate-400">Activity items will appear here automatically when recorded.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNotification(item)}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    {/* Left Icon Container */}
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-slate-200 transition-colors">
                      {item.iconType === 'user' && <Users className="w-4 h-4 text-slate-700" />}
                      {item.iconType === 'rupee' && <span className="font-extrabold text-slate-700 text-sm">₹</span>}
                      {item.iconType === 'building' && <Building2 className="w-4 h-4 text-slate-700" />}
                      {item.iconType === 'plus' && <Plus className="w-4 h-4 text-slate-700" />}
                      {item.iconType === 'diamond' && <Calendar className="w-4 h-4 text-slate-700" />}
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">{item.description}</p>
                    </div>
                  </div>

                  {/* Right Section: Timestamp & Category Badge */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-xs font-medium text-slate-400 hidden sm:inline">{item.timestamp}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${item.badgeColor}`}>
                      {item.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>

        {/* Status Footer */}
        <footer className="text-center py-4 border-t border-slate-200/60 bg-[#f8fafc] text-slate-400 text-xs font-medium shrink-0">
          Masjid Manager • Live PostgreSQL Backend Connected
        </footer>
      </div>

      {/* MODAL: Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedNotification.badgeColor}`}>
                  {selectedNotification.type}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedNotification.title}</h3>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">{selectedNotification.description}</p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">Notification Payload Details</p>
              {Object.entries(selectedNotification.details).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-400 capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-semibold text-slate-900">{val}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close View
              </button>
            </div>
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
                placeholder="Search notifications, requests, or activities..."
                className="w-full text-sm font-medium focus:outline-none text-slate-900"
              />
              <button onClick={() => setShowSearchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
