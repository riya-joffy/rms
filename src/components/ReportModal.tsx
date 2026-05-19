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
            
            {/* Meta Details Row 1 */}
            <div className="report-detail-item">
              <span className="report-detail-label">Staff Analyst</span>
              <div className="report-detail-val">{report.staffName} ({report.staffId})</div>
            </div>
            <div className="report-detail-item">
              <span className="report-detail-label">Department</span>
              <div className="report-detail-val">{report.department}</div>
            </div>

            {/* Meta Details Row 2 */}
            <div className="report-detail-item">
              <span className="report-detail-label">Region / Market Hub</span>
              <div className="report-detail-val">{report.region}</div>
            </div>
            <div className="report-detail-item">
              <span className="report-detail-label">Date & Time Created</span>
              <div className="report-detail-val">
                {report.date} @ {report.time}
              </div>
            </div>

            {/* Report Category */}
            <div className="report-detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="report-detail-label">Intelligence Category</span>
              <div className="report-detail-val" style={{ fontWeight: '600', color: 'var(--primary)' }}>
                {report.category}
              </div>
            </div>

            {/* Market Metrics / Data Telemetry Section */}
            <div className="report-detail-block">
              <span className="report-detail-label">Market Metrics Telemetry</span>
              <div className="metrics-block-grid">
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Foot Traffic</div>
                  <div className="metric-mini-val">{report.metrics.footTraffic}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Sales Volume</div>
                  <div className="metric-mini-val" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${report.metrics.salesVolume.toLocaleString()}
                  </div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">Competitor Index</div>
                  <div className="metric-mini-val">{report.metrics.competitorPricingIndex}</div>
                </div>
                <div className="metric-mini-card">
                  <div className="metric-mini-label">CSAT Rating</div>
                  <div className="metric-mini-val">★ {report.metrics.customerSatisfaction} / 5</div>
                </div>
              </div>
            </div>

            {/* Detailed Observations */}
            <div className="report-detail-block">
              <span className="report-detail-label">Market Observations</span>
              <div className="report-detail-block-content">{report.observations}</div>
            </div>

            {/* Issues Found */}
            <div className="report-detail-block">
              <span className="report-detail-label">Identified Operational Obstacles / Issues</span>
              <div className="report-detail-block-content" style={{ borderLeft: '3px solid var(--error)' }}>
                {report.issuesFound || 'No major issues flagged.'}
              </div>
            </div>

            {/* Recommendations */}
            <div className="report-detail-block">
              <span className="report-detail-label">Strategic Recommendations</span>
              <div className="report-detail-block-content" style={{ borderLeft: '3px solid var(--success)' }}>
                {report.recommendations}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="report-detail-block">
              <span className="report-detail-label">Attachments & Telemetry Assets ({report.attachments.length})</span>
              {report.attachments.length > 0 ? (
                <div className="attachments-list">
                  {report.attachments.map((att) => (
                    <div className="attachment-item" key={att.id}>
                      <div className="attachment-meta">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span className="attachment-name">{att.name}</span>
                        <span className="attachment-size">({att.size})</span>
                      </div>
                      <a href="#" className="btn btn-secondary btn-sm" onClick={(e) => e.preventDefault()}>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '4px' }}>
                  No files attached.
                </div>
              )}
            </div>

            {/* Audit Chronology Log / History */}
            <div className="report-detail-block">
              <span className="report-detail-label">Submission Chronology</span>
              <div className="activity-list" style={{ marginTop: '8px', backgroundColor: 'var(--bg-sidebar)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
                {report.history.map((h) => (
                  <div className="activity-item" key={h.id}>
                    <div className={`activity-dot ${h.status === 'Approved' ? 'success' : h.status === 'Rejected' ? 'error' : ''}`} />
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

            {/* Admin Feedback Box (Admin-mode: editable; Staff-mode: viewable) */}
            {currentUser.role === 'admin' && report.status === 'Pending' ? (
              <div className="report-detail-block admin-feedback-box">
                <span className="report-detail-label">Executive Review Decision Feedback</span>
                <textarea
                  className="feedback-area"
                  placeholder="Provide brief notes, directives, or reasoning behind the approval/rejection decision..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            ) : report.feedback ? (
              <div className="report-detail-block admin-feedback-box">
                <span className="report-detail-label" style={{ color: 'var(--primary)' }}>Executive Review Feedback Notes</span>
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
                Reject & Send Feedback
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleReview('Approved')}
                disabled={isSubmitting}
              >
                Approve Submission
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
