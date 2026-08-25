import axios from 'axios';

// Dynamically determine API Base URL prioritizing production domain masjid.amandesk.com, current origin, or LAN IP
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, origin } = window.location;

    // Production Domain (https://masjid.amandesk.com or https://masjith.amandesk.com)
    if (hostname.includes('amandesk.com')) {
      if (protocol === 'https:') {
        return origin;
      }
      return `https://${hostname}`;
    }

    // Dynamic hostname fallback for LAN IP / localhost on API port 8011
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:8011`;
    }
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'https://masjid.amandesk.com';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const isAdminRoute = config.url?.includes('/admin/');
    const adminToken = localStorage.getItem('admin_token');
    const userToken = localStorage.getItem('user_token');

    if (isAdminRoute && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    } else if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to retry on Network Error
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if ((error.code === 'ERR_NETWORK' || !error.response) && error.config && !error.config._retry) {
      error.config._retry = true;
      const fallbackUrl = typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' ? `http://${window.location.hostname}:8011` : 'http://192.168.10.131:8011';
      console.warn(`Network Error encountered. Retrying request with fallback URL: ${fallbackUrl}`);
      error.config.baseURL = fallbackUrl;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);



// Auth API Calls
export const publicSignup = async (data) => {
  const response = await api.post('/api/auth/signup', data);
  return response.data;
};

export const sendOtp = async (mobileNumber) => {
  const response = await api.post('/api/auth/send-otp', { mobile_number: mobileNumber });
  return response.data;
};

export const verifyOtp = async (mobileNumber, otpCode) => {
  const response = await api.post('/api/auth/verify-otp', {
    mobile_number: mobileNumber,
    otp_code: otpCode,
  });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const updateUserProfile = async (data) => {
  const response = await api.put('/api/auth/profile', data);
  return response.data;
};

export const getLoggedInUsers = async () => {
  const response = await api.get('/api/auth/logged-in-users');
  return response.data;
};

// Admin API Calls
export const adminLogin = async (username, password) => {
  const response = await api.post('/api/admin/login', { username, password });
  return response.data;
};

export const getSignupRequests = async (statusFilter = null, search = null) => {
  const params = {};
  if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
  if (search) params.search = search;
  const response = await api.get('/api/admin/signup-requests', { params });
  return response.data;
};

export const getSignupRequestDetail = async (id) => {
  const response = await api.get(`/api/admin/signup-requests/${id}`);
  return response.data;
};

export const approveSignupRequest = async (id, adminNotes = '') => {
  const response = await api.post(`/api/admin/signup-requests/${id}/approve`, {
    status: 'approved',
    admin_notes: adminNotes,
  });
  return response.data;
};

export const rejectSignupRequest = async (id, adminNotes = '') => {
  const response = await api.post(`/api/admin/signup-requests/${id}/reject`, {
    status: 'rejected',
    admin_notes: adminNotes,
  });
  return response.data;
};

export const getMasjids = async () => {
  const response = await api.get('/api/masjids');
  return response.data;
};

// Community API Calls
export const getCommunityFamilies = async (params = {}) => {
  const response = await api.get('/api/community/families', { params });
  return response.data;
};

export const createCommunityFamily = async (data) => {
  const response = await api.post('/api/community/families', data);
  return response.data;
};

export const addCommunityMember = async (data) => {
  const response = await api.post('/api/community/members', data);
  return response.data;
};

export const updateCommunityMember = async (memberId, data) => {
  const response = await api.put(`/api/community/members/${memberId}`, data);
  return response.data;
};

export const deleteCommunityMember = async (memberId) => {
  const response = await api.delete(`/api/community/members/${memberId}`);
  return response.data;
};

export const getCommunityNextMemberCode = async (familyId = null) => {
  const params = {};
  if (familyId) params.family_id = familyId;
  const response = await api.get('/api/community/members/next-code', { params });
  return response.data;
};

export const getCommunityMemberDetail = async (memberId) => {
  const response = await api.get(`/api/community/members/${memberId}`);
  return response.data;
};

export const updateCommunityFamily = async (familyId, data) => {
  const response = await api.put(`/api/community/families/${familyId}`, data);
  return response.data;
};


export const getCommunityMembers = async (familyId = null) => {
  const params = {};
  if (familyId) params.family_id = familyId;
  const response = await api.get('/api/community/members', { params });
  return response.data;
};


export const getCommunityHeadChanges = async () => {
  const response = await api.get('/api/community/head-changes');
  return response.data;
};

export const submitCommunityHeadChange = async (data) => {
  const response = await api.post('/api/community/head-changes', data);
  return response.data;
};

export const getCommunityMemberRequests = async () => {
  const response = await api.get('/api/community/member-requests');
  return response.data;
};

export const getCommunityFamilyStatements = async () => {
  const response = await api.get('/api/community/family-statements');
  return response.data;
};

export const getCommunityFunctions = async () => {
  const response = await api.get('/api/community/functions');
  return response.data;
};

export const createCommunityFunction = async (data) => {
  const response = await api.post('/api/community/functions', data);
  return response.data;
};

export const updateCommunityFunction = async (functionId, data) => {
  const response = await api.put(`/api/community/functions/${functionId}`, data);
  return response.data;
};

export const getCommunityFamilyActivity = async (familyId) => {
  const response = await api.get(`/api/community/family-activity/${familyId}`);
  return response.data;
};

export const getCommunityNotifications = async () => {
  const response = await api.get('/api/community/notifications');
  return response.data;
};

// --------------------------------------------------------------------------
// COLLECTIONS API SERVICES
// --------------------------------------------------------------------------

export const getSanthaOverview = async (month = 'August', year = 2026) => {
  const response = await api.get(`/api/collections/santha-overview?month=${month}&year=${year}`);
  return response.data;
};

export const getSanthaCollections = async () => {
  const response = await api.get('/api/collections/santha');
  return response.data;
};

export const createSanthaCollection = async (data) => {
  const response = await api.post('/api/collections/santha', data);
  return response.data;
};

export const getSanthaArrears = async () => {
  const response = await api.get('/api/collections/santha-arrears');
  return response.data;
};

export const getFamilySanthaCalculation = async (familyId) => {
  const response = await api.get(`/api/collections/santha-calculation/${familyId}`);
  return response.data;
};

export const getSanthaAdvances = async () => {
  const response = await api.get('/api/collections/santha-advances');
  return response.data;
};

export const updateSanthaCollection = async (id, data) => {
  const response = await api.put(`/api/collections/santha/${id}`, data);
  return response.data;
};

export const deleteSanthaCollection = async (id) => {
  const response = await api.delete(`/api/collections/santha/${id}`);
  return response.data;
};

export const getSanthaReceipts = async () => {
  const response = await api.get('/api/collections/santha-receipts');
  return response.data;
};

export const getJumaCollections = async () => {
  const response = await api.get('/api/collections/juma');
  return response.data;
};

export const createJumaCollection = async (data) => {
  const response = await api.post('/api/collections/juma', data);
  return response.data;
};

export const updateJumaCollection = async (id, data) => {
  const response = await api.put(`/api/collections/juma/${id}`, data);
  return response.data;
};

export const deleteJumaCollection = async (id) => {
  const response = await api.delete(`/api/collections/juma/${id}`);
  return response.data;
};

export const getDonations = async () => {
  const response = await api.get('/api/collections/donations');
  return response.data;
};

export const createDonation = async (data) => {
  const response = await api.post('/api/collections/donations', data);
  return response.data;
};

export const updateDonation = async (id, data) => {
  const response = await api.put(`/api/collections/donations/${id}`, data);
  return response.data;
};

export const deleteDonation = async (id) => {
  const response = await api.delete(`/api/collections/donations/${id}`);
  return response.data;
};

// Properties & Assets API Calls
export const getProperties = async (search = null) => {
  const params = search ? { search } : {};
  const response = await api.get('/api/properties', { params });
  return response.data;
};

export const createProperty = async (data) => {
  const response = await api.post('/api/properties', data);
  return response.data;
};

export const getTenants = async () => {
  const response = await api.get('/api/properties/tenants/list');
  return response.data;
};

export const createTenant = async (data) => {
  const response = await api.post('/api/properties/tenants/list', data);
  return response.data;
};

export const getRentCollections = async () => {
  const response = await api.get('/api/properties/collections/list');
  return response.data;
};

export const createRentCollection = async (data) => {
  const response = await api.post('/api/properties/collections/list', data);
  return response.data;
};

export const getHallBookings = async () => {
  const response = await api.get('/api/properties/hall-bookings/list');
  return response.data;
};

export const createHallBooking = async (data) => {
  const response = await api.post('/api/properties/hall-bookings/list', data);
  return response.data;
};

export const getCookingVessels = async () => {
  const response = await api.get('/api/properties/vessels/list');
  return response.data;
};

export const createCookingVessel = async (data) => {
  const response = await api.post('/api/properties/vessels/list', data);
  return response.data;
};

export const getPropertyDocuments = async () => {
  const response = await api.get('/api/properties/documents/list');
  return response.data;
};

export const createPropertyDocument = async (data) => {
  const response = await api.post('/api/properties/documents/list', data);
  return response.data;
};

export default api;

