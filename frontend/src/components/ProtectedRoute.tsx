import { Navigate } from "react-router-dom";
import { useAppStore } from "../lib/store";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps routes that require authentication.
 * If no token exists → redirect to /login.
 */
export function ProtectedRoute({ children }: Props) {
  const token = useAppStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
