import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../lib/adminStore';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps admin-only routes.
 * If no admin token exists → redirect to /admin/login.
 */
export function AdminProtectedRoute({ children }: Props) {
  const token = useAdminStore((s) => s.adminToken);
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
