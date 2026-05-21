'use client';

import React, { useState, useEffect } from 'react';
import { MarketReport } from '../types';
import { useReports } from '../context/ReportContext';

interface CreateReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  reportToEdit?: MarketReport | null;
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ onSuccess, onCancel, reportToEdit }) => {
  const { createReport } = useReports();

  // Form Fields State
  const [activityType, setActivityType] = useState('Hospital Visit');
  const [meetingType, setMeetingType] = useState('Physical');
  const [institutionName, setInstitutionName] = useState('');
  const [location, setLocation] = useState('');
  const [finalYearStudentsCount, setFinalYearStudentsCount] = useState('0');
  const [headOfInstitution, setHeadOfInstitution] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [spocName, setSpocName] = useState('');
  const [spocContact, setSpocContact] = useState('');
  const [spocEmail, setSpocEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [reportStatus, setReportStatus] = useState<'Draft' | 'Pending'>('Draft');

  // Pre-populate fields if editing an existing draft
  useEffect(() => {
    if (reportToEdit) {
      setActivityType(reportToEdit.activityType || 'Hospital Visit');
      setMeetingType(reportToEdit.meetingType || 'Physical');
      setInstitutionName(reportToEdit.institutionName || '');
      setLocation(reportToEdit.location || '');
      setFinalYearStudentsCount(reportToEdit.finalYearStudentsCount ? String(reportToEdit.finalYearStudentsCount) : '0');
      setHeadOfInstitution(reportToEdit.headOfInstitution || '');
      setContactNumber(reportToEdit.contactNumber || '');
      setSpocName(reportToEdit.spocName || '');
      setSpocContact(reportToEdit.spocContact || '');
      setSpocEmail(reportToEdit.spocEmail || '');
      setNotes(reportToEdit.notes || '');
      setDateTime(reportToEdit.dateTime || '');
      setReportStatus(reportToEdit.status === 'Pending' ? 'Pending' : 'Draft');
    } else {
      clearFormFields();
    }
  }, [reportToEdit]);

  const clearFormFields = () => {
    setActivityType('Hospital Visit');
    setMeetingType('Physical');
    setInstitutionName('');
    setLocation('');
    setFinalYearStudentsCount('0');
    setHeadOfInstitution('');
    setContactNumber('');
    setSpocName('');
    setSpocContact('');
    setSpocEmail('');
    setNotes('');
    setDateTime('');
    setReportStatus('Draft');
  };

  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      alert('Please fill out the Institution/Hospital Name to save a draft.');
      return;
    }

    const reportData = {
      id: reportToEdit?.id,
      status: 'Draft' as const,
      activityType,
      meetingType,
      institutionName,
      location,
      finalYearStudentsCount: Number(finalYearStudentsCount) || 0,
      headOfInstitution,
      contactNumber,
      spocName,
      spocContact,
      spocEmail,
      notes,
      dateTime,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      attachments: reportToEdit?.attachments || []
    };

    createReport(reportData);
    clearFormFields();
    onSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionName.trim()) {
      alert('Institution/Hospital Name is required.');
      return;
    }
    if (!location.trim()) {
      alert('Location is required.');
      return;
    }
    if (!dateTime.trim()) {
      alert('Date and Time are required.');
      return;
    }

    const reportData = {
      id: reportToEdit?.id,
      status: 'Pending' as const,
      activityType,
      meetingType,
      institutionName,
      location,
      finalYearStudentsCount: Number(finalYearStudentsCount) || 0,
      headOfInstitution,
      contactNumber,
      spocName,
      spocContact,
      spocEmail,
      notes,
      dateTime,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      attachments: reportToEdit?.attachments || []
    };

    createReport(reportData);
    clearFormFields();
    onSuccess();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to clear all form fields?')) {
      clearFormFields();
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%', padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}>
      
      {reportToEdit && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--primary-glow)', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
          <strong>Editing Draft:</strong> You are modifying draft report <strong>{reportToEdit.id}</strong>.
        </div>
      )}

      {/* Section 1: Core Activity details */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', fontSize: '1.1rem' }}>
        1. Activity & Meeting Schedule
      </h3>
      <div className="form-grid" style={{ marginBottom: '32px' }}>
        
        <div className="form-group">
          <label className="form-label">Activity Type</label>
          <select 
            className="form-select"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            <option>Hospital Visit</option>
            <option>Institution Visit</option>
            <option>SPOC Meeting</option>
            <option>Seminar</option>
            <option>Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Meeting Type</label>
          <select 
            className="form-select"
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
          >
            <option>Physical</option>
            <option>Virtual</option>
            <option>Telephonic</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date and Time</label>
          <input 
            type="datetime-local"
            className="form-input"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Location / City</label>
          <input 
            type="text"
            className="form-input"
            placeholder="e.g. Chicago, IL"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Report Status</label>
          <select 
            className="form-select"
            value={reportStatus}
            onChange={(e) => setReportStatus(e.target.value as 'Draft' | 'Pending')}
          >
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

      </div>

      {/* Section 2: Institution personnel info */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', fontSize: '1.1rem' }}>
        2. Institution / Hospital Details
      </h3>
      <div className="form-grid" style={{ marginBottom: '32px' }}>
        
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Institution / Hospital Name</label>
          <input 
            type="text"
            className="form-input"
            placeholder="Enter full legal name of hospital or clinic"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Head of Institution</label>
          <input 
            type="text"
            className="form-input"
            placeholder="e.g. Dean or Chief Medical Officer"
            value={headOfInstitution}
            onChange={(e) => setHeadOfInstitution(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contact Number (Head)</label>
          <input 
            type="text"
            className="form-input"
            placeholder="e.g. +1 555-0100"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Number of Final Year Students</label>
          <input 
            type="number"
            className="form-input"
            value={finalYearStudentsCount}
            onChange={(e) => setFinalYearStudentsCount(e.target.value)}
            min="0"
          />
        </div>

      </div>

      {/* Section 3: SPOC details */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', fontSize: '1.1rem' }}>
        3. Single Point of Contact (SPOC)
      </h3>
      <div className="form-grid" style={{ marginBottom: '32px' }}>
        
        <div className="form-group">
          <label className="form-label">SPOC Name</label>
          <input 
            type="text"
            className="form-input"
            placeholder="Full Name of SPOC coordinate"
            value={spocName}
            onChange={(e) => setSpocName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">SPOC Contact Number</label>
          <input 
            type="text"
            className="form-input"
            placeholder="SPOC direct mobile/desk phone"
            value={spocContact}
            onChange={(e) => setSpocContact(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">SPOC Email Address</label>
          <input 
            type="email"
            className="form-input"
            placeholder="spoc@institution.edu"
            value={spocEmail}
            onChange={(e) => setSpocEmail(e.target.value)}
          />
        </div>

      </div>

      {/* Section 4: Notes and observations */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', fontSize: '1.1rem' }}>
        4. Field Notes & Observations
      </h3>
      <div className="form-grid" style={{ marginBottom: '24px' }}>
        
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Notes / Observations</label>
          <textarea 
            className="form-textarea"
            placeholder="Outline student reactions, queries, bottlenecks, action items, or clinic schedules..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: '120px' }}
          />
        </div>

      </div>

      {/* Form Buttons */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          gap: '12px', 
          marginTop: '32px',
          borderTop: '1px solid var(--border-muted)',
          paddingTop: '20px'
        }}
      >
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleClear}
          style={{ marginRight: 'auto', border: '1px solid var(--border-muted)' }}
        >
          Clear Form
        </button>

        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
          style={{ border: '1px solid var(--border-muted)' }}
        >
          Cancel
        </button>

        <button 
          type="button" 
          className="btn" 
          onClick={handleSaveDraft}
          style={{ backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}
        >
          Save Draft
        </button>

        <button 
          type="submit" 
          className="btn btn-primary"
        >
          Submit Report
        </button>
      </div>

    </form>
  );
};
