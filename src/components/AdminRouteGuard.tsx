'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdminRole } from '../lib/roles';

interface AdminRouteGuardProps {
  children: ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdminRole(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || !isAdminRole(user.role)) {
    return null;
  }

  return <>{children}</>;
};
