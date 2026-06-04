'use client';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface DeleteUserModalProps {
  userToDelete: User;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  userToDelete,
  onClose,
  onSuccess,
  onError
}) => {
  const { user: currentUser, deleteUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');

    if (userToDelete.id === currentUser?.id) {
      setError('Critical Security Guard: You cannot delete your own admin account.');
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteUser(userToDelete.id);
      onSuccess(`Successfully deleted analyst account of ${userToDelete.name}.`);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete user.';
      setError(errMsg);
      onError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        
        <div className="modal-header" style={{ borderBottomColor: 'var(--border-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="modal-title" style={{ color: 'var(--error)' }}>Confirm Delete Account</span>
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

          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Are you sure you want to delete the staff record for:
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
              src={userToDelete.avatar} 
              alt={userToDelete.name} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {userToDelete.name}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {userToDelete.email}
              </span>
            </div>
          </div>

          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: 'rgba(239, 68, 68, 0.05)', 
            borderLeft: '3px solid var(--error)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            fontSize: '0.82rem',
            color: 'var(--error-text)',
            lineHeight: 1.4
          }}>
            <strong>Warning:</strong> This action is permanent and cannot be undone. This user's profile record will be deleted from the database.
          </div>
        </div>

        <div className="modal-footer" style={{ borderTopColor: 'var(--border-muted)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            style={{ 
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              backgroundColor: 'var(--error)' 
            }}
          >
            {isSubmitting ? 'Deleting...' : 'Delete Staff'}
          </button>
        </div>

      </div>
    </div>
  );
};
