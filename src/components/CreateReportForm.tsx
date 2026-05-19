'use client';

import React, { useState, useRef } from 'react';
import { MarketReport, MarketMetrics, Attachment } from '../types';
import { useReports } from '../context/ReportContext';

interface CreateReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ onSuccess, onCancel }) => {
  const { createReport } = useReports();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [region, setRegion] = useState('North America');
  const [category, setCategory] = useState<'Competitor Intelligence' | 'Consumer Trends' | 'Pricing Analysis' | 'Inventory & Supply' | 'Promotional Tracking'>('Competitor Intelligence');
  const [observations, setObservations] = useState('');
  const [issuesFound, setIssuesFound] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Metrics Fields State
  const [footTraffic, setFootTraffic] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [salesVolume, setSalesVolume] = useState('50000');
  const [competitorPricingIndex, setCompetitorPricingIndex] = useState('100');
  const [customerSatisfaction, setCustomerSatisfaction] = useState('4');

  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateFileUpload(e.target.files[0]);
    }
  };

  const simulateFileUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    // Simulate uploading increments
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
            const newAttachment: Attachment = {
              id: `att-${Date.now()}`,
              name: file.name,
              size: `${sizeInMB} MB`,
              type: file.type || 'application/octet-stream',
              url: '#'
            };
            setAttachments(prevAtt => [...prevAtt, newAttachment]);
            setIsUploading(false);
            setUploadProgress(0);
          }, 200);
          return 100;
        }
        return prev + 30;
      });
    }, 150);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!observations.trim()) {
      alert('Please fill out observations.');
      return;
    }
    if (!recommendations.trim()) {
      alert('Please fill out strategic recommendations.');
      return;
    }

    const reportData = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      region,
      category,
      observations,
      metrics: {
        footTraffic,
        salesVolume: Number(salesVolume) || 0,
        competitorPricingIndex: Number(competitorPricingIndex) || 100,
        customerSatisfaction: Number(customerSatisfaction) || 4
      },
      issuesFound,
      recommendations,
      attachments
    };

    createReport(reportData);
    onSuccess();
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div className="form-grid">
        
        {/* Region */}
        <div className="form-group">
          <label className="form-label">Location / Target Region</label>
          <select 
            className="form-select"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option>North America</option>
            <option>Europe</option>
            <option>Asia Pacific</option>
            <option>Latin America</option>
            <option>Middle East</option>
          </select>
        </div>

        {/* Intelligence Category */}
        <div className="form-group">
          <label className="form-label">Intelligence Category</label>
          <select 
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
          >
            <option>Competitor Intelligence</option>
            <option>Consumer Trends</option>
            <option>Pricing Analysis</option>
            <option>Inventory & Supply</option>
            <option>Promotional Tracking</option>
          </select>
        </div>

        {/* Metrics Sub-Grid (Full Width) */}
        <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '16px', marginBottom: '8px' }}>
          <label className="form-label" style={{ color: 'var(--primary)', fontWeight: '700' }}>Market Metrics Telemetry Data</label>
          <div className="metrics-block-grid" style={{ marginTop: '8px' }}>
            
            {/* Foot Traffic */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Foot Traffic Density</label>
              <select 
                className="form-select"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={footTraffic}
                onChange={(e) => setFootTraffic(e.target.value as any)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {/* Sales Volume */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Est. Daily Sales (USD)</label>
              <input 
                type="number"
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={salesVolume}
                onChange={(e) => setSalesVolume(e.target.value)}
                min="0"
              />
            </div>

            {/* Competitor Index */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Competitor Price Index</label>
              <input 
                type="number"
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={competitorPricingIndex}
                onChange={(e) => setCompetitorPricingIndex(e.target.value)}
                min="0"
                max="250"
              />
            </div>

            {/* Customer Satisfaction */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>CSAT Rating Score</label>
              <select 
                className="form-select"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={customerSatisfaction}
                onChange={(e) => setCustomerSatisfaction(e.target.value)}
              >
                <option value="1">★ 1 - Poor</option>
                <option value="2">★ 2 - Average</option>
                <option value="3">★ 3 - Good</option>
                <option value="4">★ 4 - Very Good</option>
                <option value="5">★ 5 - Exceptional</option>
              </select>
            </div>

          </div>
        </div>

        {/* Observations */}
        <div className="form-group full-width">
          <label className="form-label">Core Observations</label>
          <textarea 
            className="form-textarea"
            placeholder="Record detailed observations of store layouts, marketing behaviors, foot traffic reactions, and general field dynamics..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            required
          />
        </div>

        {/* Issues Found */}
        <div className="form-group full-width">
          <label className="form-label">Issues & Bottlenecks Identified (Optional)</label>
          <textarea 
            className="form-textarea"
            placeholder="Describe any supply gaps, logistics failures, local complaints, stockouts, or competitive pricing threats..."
            value={issuesFound}
            onChange={(e) => setIssuesFound(e.target.value)}
          />
        </div>

        {/* Recommendations */}
        <div className="form-group full-width">
          <label className="form-label">Strategic / Operational Recommendations</label>
          <textarea 
            className="form-textarea"
            placeholder="Provide actionable suggestions to resolve issues, optimize margins, increase shelf visibility, or counter competitor discounts..."
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            required
          />
        </div>

        {/* File Attachments Zone */}
        <div className="form-group full-width">
          <label className="form-label">Upload Intelligence Assets & Documents</label>
          <div 
            className="file-upload-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="upload-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="upload-text">Drag & Drop file here, or click to browse</div>
            <div className="upload-sub">Accepts CSV, XLSX, PDF, TXT or PNG files (Max 10MB)</div>
          </div>

          {/* Upload Progress Loader bar */}
          {isUploading && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>Simulating file telemetry packaging...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'var(--bg-sidebar)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--primary)', transition: 'width 0.1s ease' }} />
              </div>
            </div>
          )}

          {/* Uploaded Files Display List */}
          {attachments.length > 0 && (
            <div className="attachments-list" style={{ marginTop: '16px' }}>
              {attachments.map((att) => (
                <div className="attachment-item" key={att.id}>
                  <div className="attachment-meta">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="attachment-name" style={{ color: 'var(--primary)' }}>{att.name}</span>
                    <span className="attachment-size">({att.size})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveAttachment(att.id)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Form Buttons */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          marginTop: '32px',
          borderTop: '1px solid var(--border-muted)',
          paddingTop: '20px'
        }}
      >
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Submit Report For Review
        </button>
      </div>
    </form>
  );
};
