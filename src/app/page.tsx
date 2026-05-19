'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div 
      style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        gap: '16px'
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      <span>Verifying credentials session...</span>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
