'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, login, loading, sendPasswordReset, resendVerificationEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // New States
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setVerificationNeeded(false);
    setResendSuccess(null);
    setResendError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-not-verified' || err.message?.includes('not verified')) {
        setVerificationNeeded(true);
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetError(null);
    setResetSuccess(null);
    setSubmitting(true);

    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSuccess('A password reset link has been sent to your email address.');
      setResetEmail('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setSubmitting(true);
    setResendSuccess(null);
    setResendError(null);
    try {
      await resendVerificationEmail(email.trim(), password);
      setResendSuccess('Verification email resent successfully. Please check your inbox. (In mock mode, your email is now verified!)');
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-card">
        
        {view === 'forgot-password' ? (
          <>
            {/* Logo */}
            <div className="login-header">
              <div className="login-logo">
                <div className="login-logo-icon">M</div>
                <span>Forgot Password</span>
              </div>
              <p className="login-subtitle">Reset your account password</p>
            </div>

            {/* Error / Success Notices */}
            {resetError && <div className="login-error">{resetError}</div>}
            {resetSuccess && (
              <div 
                className="login-success" 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid var(--success)', 
                  color: 'var(--success-text)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.85rem', 
                  marginBottom: '16px', 
                  textAlign: 'center' 
                }}
              >
                {resetSuccess}
              </div>
            )}

            {/* Reset Form */}
            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email-input">Work Email Address</label>
                <input
                  id="reset-email-input"
                  type="email"
                  className="form-input"
                  placeholder="e.g. name@company.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                disabled={submitting}
              >
                {submitting ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError(null);
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    padding: 0
                  }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Logo */}
            <div className="login-header">
              <div className="login-logo">
                <div className="login-logo-icon">M</div>
                <span>MarketPulse RMS</span>
              </div>
              <p className="login-subtitle">Market report system</p>
            </div>

            {/* Error Notice */}
            {error && <div className="login-error">{error}</div>}

            {/* Verification Alert Banner */}
            {verificationNeeded && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid var(--warning)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px', 
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--warning-text)', lineHeight: '1.4' }}>
                  <strong>Verification Required:</strong> Check your inbox. You must verify your email address before signing in.
                </div>
                
                {resendSuccess && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success-text)' }}>
                    {resendSuccess}
                  </div>
                )}
                {resendError && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--error-text)' }}>
                    {resendError}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResendVerification}
                  disabled={submitting}
                  style={{ alignSelf: 'flex-start', padding: '8px 12px', fontSize: '0.8rem', borderColor: 'var(--warning)' }}
                >
                  {submitting ? 'Resending...' : 'Resend Verification Email'}
                </button>
              </div>
            )}

            {/* Login Form */}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="email-input">Work Email Address</label>
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  placeholder="e.g. name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password-input">Password</label>
                <input
                  id="password-input"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot-password');
                      setError(null);
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                disabled={submitting || loading}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In To Account'}
              </button>
            </form>
          </>
        )}

      </div>

      {/* Embedded CSS animation for spinner inside standard scope */}
      <style jsx global>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
