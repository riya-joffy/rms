import React from 'react';
import { MarketReport } from '../types';

interface ReportCardProps {
  report: MarketReport;
  onInspect: (report: MarketReport) => void;
  getStatusBadgeClass: (status: string) => string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ 
  report, 
  onInspect, 
  getStatusBadgeClass 
}) => {
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const entityName = report.institutionName || report.hospitalName || report.conferenceName || report.location || 'Unknown Location';

  return (
    <div 
      className="report-card"
      onDoubleClick={() => onInspect(report)}
      style={{ cursor: 'pointer' }}
    >
      <div className="rc-header">
        <div className="rc-avatar">{getInitials(report.staffName)}</div>
        <div className="rc-staff-info">
          <div className="rc-staff-name">{report.staffName}</div>
          <div className="rc-department">{report.department}</div>
        </div>
        {report.status !== 'Pending' && (
          <div className="rc-status">
            <span className={getStatusBadgeClass(report.status)}>{report.status}</span>
          </div>
        )}
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
            {report.costOfVisit !== undefined ? `₹${report.costOfVisit}` : '-'}
          </span>
        </div>
        
        {report.marketingObservation && (
          <div className="rc-observation">
            <span className="rc-label">Observation Preview:</span>
            <p className="rc-obs-text">{report.marketingObservation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
