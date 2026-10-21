import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Role not authorized, redirect to their specific dashboard or public page
    if (currentUser.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'activity_staff') return <Navigate to="/staff" replace />;
    if (currentUser.role === 'food_vendor' || currentUser.role === 'cafe_staff' || currentUser.role === 'ticket_counter_staff') return <Navigate to="/staff/ticketing" replace />;
    return <Navigate to="/" replace />; // Fallback for customers or others
  }

  // Authorized
  return <>{children}</>;
};








