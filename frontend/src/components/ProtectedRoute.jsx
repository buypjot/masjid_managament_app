import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedUserRoute = ({ children }) => {
  const { isUserAuthenticated } = useAuth();
  const location = useLocation();

  if (!isUserAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const ProtectedAdminRoute = ({ children }) => {
  const { isAdminAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
