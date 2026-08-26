import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(() => localStorage.getItem('user_token'));
  const [userInfo, setUserInfo] = useState(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token'));
  const [adminInfo, setAdminInfo] = useState(() => {
    const saved = localStorage.getItem('admin_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [pendingMobile, setPendingMobile] = useState(() => localStorage.getItem('pending_mobile') || '');

  // Always re-hydrate the profile from the authenticated JWT on application start.
  // This prevents stale localStorage user_info from showing another account's details.
  useEffect(() => {
    let cancelled = false;

    const syncAuthenticatedUser = async () => {
      const token = localStorage.getItem('user_token');
      if (!token) return;

      try {
        const res = await getMe();
        if (cancelled) return;

        if (res?.user_info) {
          setUserToken(token);
          setUserInfo(res.user_info);
          localStorage.setItem('user_info', JSON.stringify(res.user_info));
        } else {
          throw new Error('Authenticated account profile was not returned.');
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('Authenticated user profile sync failed:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          setUserToken(null);
          setUserInfo(null);
          localStorage.removeItem('user_token');
          localStorage.removeItem('user_info');
        }
      }
    };

    syncAuthenticatedUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginUser = (token, info) => {
    setUserToken(token);
    setUserInfo(info);
    localStorage.setItem('user_token', token);
    localStorage.setItem('user_info', JSON.stringify(info));
    localStorage.removeItem('pending_mobile');
    setPendingMobile('');
  };

  const loginAdmin = (token, info) => {
    setAdminToken(token);
    setAdminInfo(info);
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_info', JSON.stringify(info));
  };

  const logoutUser = () => {
    setUserToken(null);
    setUserInfo(null);
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminInfo(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
  };

  const savePendingMobile = (mobile) => {
    setPendingMobile(mobile);
    localStorage.setItem('pending_mobile', mobile);
  };

  const updateUserProfileState = (updatedInfo) => {
    setUserInfo((prev) => {
      const merged = { ...prev, ...updatedInfo };
      localStorage.setItem('user_info', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        userInfo,
        adminToken,
        adminInfo,
        pendingMobile,
        loginUser,
        loginAdmin,
        logoutUser,
        logoutAdmin,
        savePendingMobile,
        updateUserProfileState,
        isUserAuthenticated: !!userToken,
        isAdminAuthenticated: !!adminToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
