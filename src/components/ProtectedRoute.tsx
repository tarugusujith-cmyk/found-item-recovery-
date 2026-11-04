import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../types';

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="panel mx-auto mt-16 max-w-md p-8 text-center">
        <p className="text-lg font-bold">You don't have access to this page</p>
        <p className="mt-1 text-sm text-muted">Your role ({user.role}) can't open it. Use the menu to go somewhere else.</p>
      </div>
    );
  }
  return <Outlet />;
}
