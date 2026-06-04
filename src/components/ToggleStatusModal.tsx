'use client';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { toast } from 'react-toastify';

interface ToggleStatusModalProps {
  userToToggle: User;
  onClose: () => void;
}

export const ToggleStatusModal: React.FC<ToggleStatusModalProps> = ({
  userToToggle,
  onClose
}) => {
  const { toggleUserStatus } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const actionType = userToToggle.status === 'active' ? 'disable' : 'enable';
      await toggleUserStatus(userToToggle.id);
      
      if (actionType === 'disable') {
        toast.success("Staff account disabled successfully");
      } else {
        toast.success("Staff account enabled successfully");
      }
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update account status.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabling = userToToggle.status === 'active';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        
        <div className="modal-header" style={{ borderBottomColor: 'var(--border-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="modal-title" style={{ color: isDisabling ? 'var(--error)' : 'var(--primary)' }}>
              Confirm {isDisabling ? 'Disable' : 'Enable'} Account
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
            {isDisabling 
              ? "Are you sure you want to disable this staff account?"
              : "Are you sure you want to enable this staff account?"}
          </p>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px', 
            backgroundColor: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-muted)'
          }}>
            <img 
              src={userToToggle.avatar} 
              alt={userToToggle.name} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {userToToggle.name}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {userToToggle.email}
              </span>
            </div>
          </div>

          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: isDisabling ? 'rgba(239, 68, 68, 0.05)' : 'rgba(124, 58, 237, 0.05)', 
            borderLeft: `3px solid ${isDisabling ? 'var(--error)' : 'var(--primary)'}`,
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            fontSize: '0.82rem',
            color: isDisabling ? 'var(--error-text)' : 'var(--text-main)',
            lineHeight: 1.4
          }}>
            {isDisabling 
              ? "The user will be immediately logged out and prevented from accessing the dashboard. Their reports and historical data will be preserved."
              : "The user will be allowed to log back in and resume dashboard operations."}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTopColor: 'var(--border-muted)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className={`btn ${isDisabling ? 'btn-danger' : 'btn-primary'}`}
            type="button"
            onClick={handleToggle}
            disabled={isSubmitting}
            style={{ 
              boxShadow: isDisabling 
                ? '0 4px 14px rgba(239, 68, 68, 0.3)' 
                : '0 4px 14px rgba(124, 58, 237, 0.3)',
              backgroundColor: isDisabling ? 'var(--error)' : 'var(--primary)'
            }}
          >
            {isSubmitting 
              ? (isDisabling ? 'Disabling...' : 'Enabling...') 
              : (isDisabling ? 'Disable Account' : 'Enable Account')}
          </button>
        </div>

      </div>
    </div>
  );
};
