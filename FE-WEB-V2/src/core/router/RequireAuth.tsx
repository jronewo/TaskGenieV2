import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth() {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Outlet />;
}
