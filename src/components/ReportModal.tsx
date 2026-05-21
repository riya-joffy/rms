'use client';

import React, { useState } from 'react';
import { MarketReport, User } from '../types';
import { useReports } from '../context/ReportContext';

interface ReportModalProps {
  report: MarketReport | null;
  onClose: () => void;
  currentUser: User | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose, currentUser }) => {
  const { reviewReport } = useReports();
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report || !currentUser) return null;

  const isAuthorized = currentUser.role === 'admin' || report.staffId === currentUser.id;
  if (!isAuthorized) return null;

  const handleReview = async (status: 'Approved' | 'Rejected') => {
    if (!feedbackInput.trim() && status === 'Rejected') {
      alert('Please provide feedback comments explaining the rejection reasons.');
      return;
    }

    setIsSubmitting(true);
    // Simulate slight operation delay
    setTimeout(() => {
      reviewReport(report.id, status, feedbackInput.trim());
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'badge approved';
      case 'Rejected': return 'badge rejected';
      default: return 'badge pending';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="modal-title" style={{ fontFamily: 'var(--font-mono)' }}>{report.id}</span>
            <span className={getStatusBadgeClass(report.status)}>{report.status}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="report-detail-grid">
            
            {/* Row 1: Submitter Info */}
            <div className="report-detail-item">
              <span className="report-detail-label">Staff User</span>
              <div className="report-detail-val">{report.staffName} ({report.staffId})</div>
            </div>
            <div className="report-detail-item">
              <span className="report-detail-label">Department</span>
              <div className="report-detail-val">{report.department}</div>
            </div>

            {/* Row 2: Basic Activity details */}
            <div className="report-detail-item">
              <span className="report-detail-label">Activity & Meeting Type</span>
              <div className="report-detail-val" style={{ fontWeight: '600', color: 'var(--primary)' }}>
                {report.activityType} ({report.meetingType})
              </div>
            </div>
            <div className="report-detail-item">
              <span className="report-detail-label">Scheduled Date & Time</span>
              <div className="report-detail-val">
                {report.dateTime ? new Date(report.dateTime).toLocaleString() : `${report.date} @ ${report.time}`}
              </div>
            </div>

            {/* Row 3: Institution details */}
            <div className="report-detail-block" style={{ gridColumn: 'span 2' }}>
              <span className="report-detail-label">Institution Details</span>
              <div className="metrics-block-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Name</div>
                  <div className="metric-mini-val" style={{ fontSize: '0.95rem' }}>{report.institutionName}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Location / City</div>
                  <div className="metric-mini-val">{report.location}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Final Year Students</div>
                  <div className="metric-mini-val" style={{ fontFamily: 'var(--font-mono)' }}>{report.finalYearStudentsCount}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Head of Institution</div>
                  <div className="metric-mini-val">{report.headOfInstitution || 'N/A'}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Head Contact</div>
                  <div className="metric-mini-val" style={{ fontSize: '0.85rem' }}>{report.contactNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Row 4: SPOC details */}
            <div className="report-detail-block" style={{ gridColumn: 'span 2' }}>
              <span className="report-detail-label">Single Point of Contact (SPOC)</span>
              <div className="metrics-block-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">SPOC Name</div>
                  <div className="metric-mini-val">{report.spocName || 'N/A'}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">SPOC Contact</div>
                  <div className="metric-mini-val" style={{ fontSize: '0.85rem' }}>{report.spocContact || 'N/A'}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">SPOC Email</div>
                  <div className="metric-mini-val" style={{ fontSize: '0.85rem' }}>{report.spocEmail || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Row 5: Notes & Observations */}
            <div className="report-detail-block" style={{ gridColumn: 'span 2' }}>
              <span className="report-detail-label">Notes & Observations</span>
              <div className="report-detail-block-content" style={{ borderLeft: '3px solid var(--primary)' }}>
                {report.notes || 'No notes compiled.'}
              </div>
            </div>

            {/* Timeline - Admin Only */}
            {currentUser.role === 'admin' && (
              <div className="report-detail-block" style={{ gridColumn: 'span 2' }}>
                <span className="report-detail-label">Timeline Tracking</span>
                <div className="activity-list" style={{ marginTop: '8px', backgroundColor: 'var(--bg-sidebar)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
                  {report.history.map((h) => (
                    <div className="activity-item" key={h.id}>
                      <div className={`activity-dot ${h.status === 'Approved' ? 'success' : h.status === 'Rejected' ? 'error' : h.status === 'Draft' ? 'warning' : ''}`} />
                      <div className="activity-details">
                        <div className="activity-text">
                          Status changed to <strong>{h.status}</strong> by <strong>{h.user}</strong>
                        </div>
                        {h.comment && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>"{h.comment}"</div>}
                        <span className="activity-time">{new Date(h.date).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review feedback */}
            {currentUser.role === 'admin' && report.status === 'Pending' ? (
              <div className="report-detail-block admin-feedback-box" style={{ gridColumn: 'span 2' }}>
                <span className="report-detail-label">Review Feedback Comments</span>
                <textarea
                  className="feedback-area"
                  placeholder="Enter comments explaining approval decision or rejection reasons..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            ) : report.feedback ? (
              <div className="report-detail-block admin-feedback-box" style={{ gridColumn: 'span 2' }}>
                <span className="report-detail-label" style={{ color: 'var(--primary)' }}>Review Notes & Comments</span>
                <div 
                  className="report-detail-block-content" 
                  style={{ 
                    backgroundColor: 'rgba(168, 85, 247, 0.04)',
                    borderColor: 'var(--primary-glow)',
                    color: 'var(--text-main)',
                    fontStyle: 'italic' 
                  }}
                >
                  "{report.feedback}"
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
          
          {currentUser.role === 'admin' && report.status === 'Pending' && (
            <>
              <button 
                className="btn btn-danger" 
                onClick={() => handleReview('Rejected')}
                disabled={isSubmitting}
              >
                Reject
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleReview('Approved')}
                disabled={isSubmitting}
              >
                Approve
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
