import React from 'react';
import { MarketReport } from '../types';

interface ReportCardProps {
  report: MarketReport;
  onInspect: (report: MarketReport) => void;
  onApprove?: (report: MarketReport) => void;
  onReject?: (report: MarketReport) => void;
  onDelete?: (report: MarketReport) => void;
  getStatusBadgeClass: (status: string) => string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ 
  report, 
  onInspect, 
  onApprove, 
  onReject, 
  onDelete, 
  getStatusBadgeClass 
}) => {
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const entityName = report.institutionName || report.hospitalName || report.conferenceName || report.location || 'Unknown Location';

  return (
    <div className="report-card">
      <div className="rc-header">
        <div className="rc-avatar">{getInitials(report.staffName)}</div>
        <div className="rc-staff-info">
          <div className="rc-staff-name">{report.staffName}</div>
          <div className="rc-department">{report.department}</div>
        </div>
        <div className="rc-status">
          <span className={getStatusBadgeClass(report.status)}>{report.status}</span>
        </div>
      </div>
      
      <div className="rc-body">
        <div className="rc-row">
          <span className="rc-label">Activity:</span>
          <span className="rc-value">{report.activityType} {report.meetingType ? `(${report.meetingType})` : ''}</span>
        </div>
        <div className="rc-row">
          <span className="rc-label">Entity:</span>
          <span className="rc-value">{entityName}</span>
        </div>
        <div className="rc-row">
          <span className="rc-label">Meeting Date:</span>
          <span className="rc-value" style={{ fontWeight: '700', color: 'var(--text-main)' }}>
            {report.dateOfActivity || 'N/A'}
          </span>
        </div>
        <div className="rc-row">
          <span className="rc-label">Submitted:</span>
          <span className="rc-value">{report.date}</span>
        </div>
        <div className="rc-row">
          <span className="rc-label">Cost:</span>
          <span className="rc-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {report.costOfVisit !== undefined ? `$${report.costOfVisit}` : '-'}
          </span>
        </div>
        
        {report.marketingObservation && (
          <div className="rc-observation">
            <span className="rc-label">Observation Preview:</span>
            <p className="rc-obs-text">{report.marketingObservation}</p>
          </div>
        )}
      </div>
      
      <div className="rc-actions">
        <button 
          className="rc-btn rc-btn-view" 
          title="View Details"
          onClick={() => onInspect(report)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button 
          className="rc-btn rc-btn-approve" 
          title="Approve"
          onClick={(e) => { e.stopPropagation(); onApprove && onApprove(report); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button 
          className="rc-btn rc-btn-reject" 
          title="Reject"
          onClick={(e) => { e.stopPropagation(); onReject && onReject(report); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button 
          className="rc-btn rc-btn-delete" 
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(report); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
