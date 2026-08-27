/**
 * Protected-route gate — see spec/05-technical-spec.md §5.
 * Every route except /login is wrapped in this.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
