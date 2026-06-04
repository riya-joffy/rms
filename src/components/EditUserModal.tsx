'use client';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';

interface EditUserModalProps {
  userToEdit: User;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ 
  userToEdit, 
  onClose, 
  onSuccess, 
  onError 
}) => {
  const { user: currentUser, updateUser } = useAuth();

  const [name, setName] = useState(userToEdit.name || '');
  const [role, setRole] = useState<UserRole>(userToEdit.role || 'staff');
  const [department, setDepartment] = useState(userToEdit.department || '');
  const [region, setRegion] = useState(userToEdit.region || '');
  const [status, setStatus] = useState<'active' | 'suspended'>(userToEdit.status || 'active');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (userToEdit.id === currentUser?.id && status === 'suspended') {
      setError('For security reasons, you cannot suspend your own admin account.');
      return;
    }

    setIsSubmitting(true);

    try {
      const avatar = userToEdit.avatar && userToEdit.avatar.includes('ui-avatars.com')
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random`
        : userToEdit.avatar;

      await updateUser(userToEdit.id, {
        name: name.trim(),
        role,
        department: department.trim() || 'Unassigned',
        region: role === 'admin' ? '' : region,
        status,
        avatar
      });

      onSuccess(`Successfully updated profile for ${name.trim()}.`);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update user.';
      setError(errMsg);
      onError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="modal-title">Edit Staff Profile</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            {error && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address (Login Credential)</label>
              <input
                type="email"
                className="form-input"
                value={userToEdit.email}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Email addresses are linked to login credentials and cannot be edited.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
              >
                <option value="staff">Staff Analyst</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Department</label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Market Analysis"
              />
            </div>

            {role === 'staff' && (
              <div className="form-group">
                <label className="form-label">Active Region Focus</label>
                <select
                  className="form-select"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">All Markets</option>
                  <option value="North America">North America</option>
                  <option value="Europe">Europe</option>
                  <option value="Asia Pacific">Asia Pacific</option>
                  <option value="Latin America">Latin America</option>
                  <option value="Kerala">Kerala</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
                required
                disabled={userToEdit.id === currentUser?.id}
                style={userToEdit.id === currentUser?.id ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              {userToEdit.id === currentUser?.id && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  You cannot suspend your own logged-in account.
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};
