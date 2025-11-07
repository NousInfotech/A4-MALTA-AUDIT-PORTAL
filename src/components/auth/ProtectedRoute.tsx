import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { EnhancedLoader } from '../ui/enhanced-loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admins bypass status checks
  if (user.role !== 'super-admin' && user.status !== 'approved') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Handle super-admin redirect
    const redirectPath = user.role === 'super-admin' ? '/super-admin/dashboard' : `/${user.role}`;
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};