import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedUserRoute, ProtectedAdminRoute } from './components/ProtectedRoute';

import { SignupPage } from './pages/SignupPage';
import { UserLoginPage } from './pages/UserLoginPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CommunityPage } from './pages/CommunityPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { PropertiesPage } from './pages/PropertiesPage';

import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminSignupRequestsPage } from './pages/AdminSignupRequestsPage';
import { AdminSignupDetailPage } from './pages/AdminSignupDetailPage';

const AppFrame = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/notifications');
  const isAdminRoute = location.pathname.startsWith('/admin/') && location.pathname !== '/admin/login';
  const themeClass = isDashboardRoute || isAdminRoute ? 'dashboard-theme' : '';

  return (
    <div className={`min-h-screen flex flex-col font-sans ${themeClass} bg-slate-950 text-slate-100`}>
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/signup" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* Protected User Dashboard & Notifications */}
          <Route path="/dashboard" element={<ProtectedUserRoute><UserDashboardPage /></ProtectedUserRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedUserRoute><NotificationsPage /></ProtectedUserRoute>} />
          <Route path="/notifications" element={<ProtectedUserRoute><NotificationsPage /></ProtectedUserRoute>} />

          {/* Protected Community Sub-Routes */}
          <Route path="/dashboard/community" element={<ProtectedUserRoute><CommunityPage activeSubTab="families" /></ProtectedUserRoute>} />
          <Route path="/dashboard/community/families" element={<ProtectedUserRoute><CommunityPage activeSubTab="families" /></ProtectedUserRoute>} />
          <Route path="/dashboard/community/head-changes" element={<ProtectedUserRoute><CommunityPage activeSubTab="head-changes" /></ProtectedUserRoute>} />
          <Route path="/dashboard/community/member-requests" element={<ProtectedUserRoute><CommunityPage activeSubTab="member-requests" /></ProtectedUserRoute>} />
          <Route path="/dashboard/community/statements" element={<ProtectedUserRoute><CommunityPage activeSubTab="statements" /></ProtectedUserRoute>} />
          <Route path="/dashboard/community/functions" element={<ProtectedUserRoute><CommunityPage activeSubTab="functions" /></ProtectedUserRoute>} />

          {/* Protected Collections Sub-Routes */}
          <Route path="/dashboard/collections" element={<ProtectedUserRoute><CollectionsPage activeSubTab="santha" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/santha" element={<ProtectedUserRoute><CollectionsPage activeSubTab="santha" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/santha-arrears" element={<ProtectedUserRoute><CollectionsPage activeSubTab="santha-arrears" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/santha-advances" element={<ProtectedUserRoute><CollectionsPage activeSubTab="santha-advances" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/santha-receipts" element={<ProtectedUserRoute><CollectionsPage activeSubTab="santha-receipts" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/juma-collection" element={<ProtectedUserRoute><CollectionsPage activeSubTab="juma-collection" /></ProtectedUserRoute>} />
          <Route path="/dashboard/collections/donations" element={<ProtectedUserRoute><CollectionsPage activeSubTab="donations" /></ProtectedUserRoute>} />

          {/* Protected Properties Sub-Routes */}
          <Route path="/dashboard/properties" element={<ProtectedUserRoute><PropertiesPage activeSubTab="properties-rent" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/properties-rent" element={<ProtectedUserRoute><PropertiesPage activeSubTab="properties-rent" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/tenants" element={<ProtectedUserRoute><PropertiesPage activeSubTab="tenants" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/rent-collection" element={<ProtectedUserRoute><PropertiesPage activeSubTab="rent-collection" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/rent-arrears" element={<ProtectedUserRoute><PropertiesPage activeSubTab="rent-arrears" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/hall-bookings" element={<ProtectedUserRoute><PropertiesPage activeSubTab="hall-bookings" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/cooking-vessels" element={<ProtectedUserRoute><PropertiesPage activeSubTab="cooking-vessels" /></ProtectedUserRoute>} />
          <Route path="/dashboard/properties/property-documents" element={<ProtectedUserRoute><PropertiesPage activeSubTab="property-documents" /></ProtectedUserRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>} />
          <Route path="/admin/signup-requests" element={<ProtectedAdminRoute><AdminSignupRequestsPage /></ProtectedAdminRoute>} />
          <Route path="/admin/signup-requests/:id" element={<ProtectedAdminRoute><AdminSignupDetailPage /></ProtectedAdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppFrame />
      </Router>
    </AuthProvider>
  );
}
