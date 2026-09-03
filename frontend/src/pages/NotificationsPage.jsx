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
    <div className="notification-page dashboard-theme flex h-screen overflow-hidden bg-[#f4fbf8] font-sans">
      <UserSidebar />

      <div className="min-w-0 h-full flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">

          {/* Top utility header */}
          <div className="notification-topbar flex flex-col gap-4 border-b border-emerald-100/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-emerald-700">Masjid</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-950">Notifications</span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => setShowSearchModal(true)}
                className="notification-icon-button"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
                  className="notification-icon-button"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                </button>

                {showNotificationsPopover && (
                  <div className="notification-popover absolute right-0 z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-900">Live System Alerts</h4>
                      <button onClick={() => setShowNotificationsPopover(false)} className="text-slate-400 transition hover:text-emerald-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
                      <p className="font-bold">5 New Community Activity Items</p>
                      <p className="mt-1 text-[11px] text-emerald-700">Payments, requests & event announcements logged.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pl-1">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-extrabold leading-tight text-slate-900">{userName}</div>
                  <div className="text-[11px] font-medium leading-tight text-slate-400">{userRole}</div>
                </div>
                <Avatar src={userInfo?.profile_photo} name={userName} size="md" showStatusDot={true} status="online" />
              </div>
            </div>
          </div>

          {/* Premium notification hero */}
          <section className="notification-hero relative overflow-hidden rounded-[28px] border border-emerald-200/70 p-6 sm:p-8 lg:p-9">
            <div className="notification-hero-glow" />
            <div className="relative z-10 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                <Bell className="h-3.5 w-3.5" />
                Community updates
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Notifications</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-emerald-50 sm:text-base">
                All important activities and requests from the Masjid community in one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">Live activity</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">Community connected</span>
              </div>
            </div>
            <div className="notification-hero-orb" aria-hidden="true">
              <Bell className="h-20 w-20 text-white/20 sm:h-28 sm:w-28" />
            </div>
          </section>

          {/* Metrics */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Live Notifications', value: notificationItems.length, note: 'Activity Feed', icon: Bell, tone: 'emerald' },
              { label: 'Member Requests', value: 'Live', note: 'New today', icon: Users, tone: 'teal' },
              { label: 'Payments', value: 'Online', note: 'Real-time', icon: CheckCircle2, tone: 'cyan' },
              { label: 'Status', value: 'Active', note: 'Connected', icon: Building2, tone: 'green' }
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className={`notification-metric-card notification-tone-${metric.tone}`} style={{ '--notification-delay': `${index * 80}ms` }}>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-800/65">{metric.label}</span>
                    <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{metric.value}</div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">{metric.note}</p>
                  </div>
                  <div className="notification-metric-icon">
                    <MetricIcon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Filter and list */}
          <section className="notification-panel rounded-[26px] border border-emerald-100/80 bg-white/90 p-4 shadow-[0_14px_45px_rgba(5,150,105,0.07)] sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.10)]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Activity center</span>
                </div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Recent Notifications</h2>
              </div>

              <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                {['All', 'Member', 'Payment', 'Booking', 'Function', 'Event'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`notification-filter ${filterCategory === cat ? 'notification-filter-active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="notification-empty-state">
                  <div className="notification-loading-ring"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                  <p className="text-sm font-bold text-slate-800">Loading live notifications...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="notification-empty-state">
                  <div className="notification-empty-icon"><Bell className="h-7 w-7" /></div>
                  <p className="text-sm font-bold text-slate-800">No live notifications found</p>
                  <p className="text-xs font-medium text-slate-400">Activity items will appear here automatically when recorded.</p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isUnread = item.is_read === false || item.read === false || item.unread === true;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedNotification(item)}
                      className={`notification-card ${isUnread ? 'notification-card-unread' : 'notification-card-read'}`}
                      style={{ '--notification-delay': `${index * 55}ms` }}
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className={`notification-card-icon ${isUnread ? 'notification-card-icon-unread' : ''}`}>
                          {item.iconType === 'user' && <Users className="h-4 w-4" />}
                          {item.iconType === 'rupee' && <span className="text-sm font-black">₹</span>}
                          {item.iconType === 'building' && <Building2 className="h-4 w-4" />}
                          {item.iconType === 'plus' && <Plus className="h-4 w-4" />}
                          {item.iconType === 'diamond' && <Calendar className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-extrabold text-slate-950">{item.title}</h3>
                            {isUnread && <span className="notification-unread-badge">New</span>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{item.description}</p>
                        </div>
                      </div>

                      <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
                        <span className="hidden text-[10px] font-bold text-slate-400 sm:inline">{item.timestamp}</span>
                        <span className={`notification-type-badge ${item.badgeColor || ''}`}>{item.type}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Notification detail modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="notification-modal w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className={`notification-type-badge ${selectedNotification.badgeColor || ''}`}>{selectedNotification.type}</span>
                <h3 className="mt-2 text-lg font-black text-slate-950">{selectedNotification.title}</h3>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="notification-close-button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{selectedNotification.description}</p>
            <div className="mt-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="border-b border-emerald-100 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-800">Notification Payload Details</p>
              {Object.entries(selectedNotification.details).map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4 text-xs">
                  <span className="capitalize font-medium text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-right font-bold text-slate-900">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setSelectedNotification(null)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-800">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 p-4 pt-20 backdrop-blur-sm">
          <div className="notification-search-modal w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <Search className="h-5 w-5 text-emerald-600" />
              <input
                type="text"
                autoFocus
                placeholder="Search notifications, requests, or activities..."
                className="w-full text-sm font-medium text-slate-900 outline-none"
              />
              <button onClick={() => setShowSearchModal(false)} className="notification-close-button">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
