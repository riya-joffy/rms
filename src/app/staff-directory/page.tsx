'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRouteGuard } from '../../components/AdminRouteGuard';

export default function StaffDirectoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <AdminRouteGuard>
      <div />
    </AdminRouteGuard>
  );
}
