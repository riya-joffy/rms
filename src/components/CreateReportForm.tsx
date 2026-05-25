'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MarketReport, Organization } from '../types';
import { useReports } from '../context/ReportContext';

interface CreateReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  reportToEdit?: MarketReport | null;
}

const ACTIVITY_TYPES = [
  'Meetings with Institutes',
  'Follow up with Institutes',
  'Campaigns Conducted',
  'Participation in Conferences',
  'Meetings with Hospitals',
  'Follow up with Hospitals'
];

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ onSuccess, onCancel, reportToEdit }) => {
  const { createReport, organizations, addOrganization } = useReports();

  // Unified form data
  const [formData, setFormData] = useState<Partial<MarketReport>>({
    activityType: ACTIVITY_TYPES[0],
    meetingType: 'Institution',
    status: 'Draft',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (reportToEdit) {
      let derivedMeetingType = (reportToEdit.meetingType as 'Institution' | 'Hospital') || 'Institution';
      if (!reportToEdit.meetingType) {
        if (reportToEdit.activityType?.includes('Hospital') || reportToEdit.hospitalName) {
          derivedMeetingType = 'Hospital';
        } else {
          derivedMeetingType = 'Institution';
        }
      }

      setFormData({
        ...reportToEdit,
        meetingType: derivedMeetingType
      });

      if (derivedMeetingType === 'Hospital') {
        setSearchTerm(reportToEdit.hospitalName || '');
      } else if (reportToEdit.activityType?.includes('Conference')) {
        setSearchTerm(reportToEdit.conferenceName || '');
      } else {
        setSearchTerm(reportToEdit.institutionName || '');
      }
      setIsAutoFilled(!!(reportToEdit.institutionName || reportToEdit.hospitalName));
    } else {
      setFormData({ 
        activityType: ACTIVITY_TYPES[0], 
        meetingType: 'Institution',
        status: 'Draft' 
      });
      setSearchTerm('');
      setIsAutoFilled(false);
    }
  }, [reportToEdit]);

  const handleChange = (field: keyof MarketReport, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Keep notes field in sync with marketingObservation for legacy display compatibility
      if (field === 'marketingObservation') {
        next.notes = value;
      }
      return next;
    });
  };

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    
    let defaultMeetingType: 'Institution' | 'Hospital' = 'Institution';
    if (newType.includes('Hospital')) {
      defaultMeetingType = 'Hospital';
    } else if (newType.includes('Institute') || newType.includes('Campaign')) {
      defaultMeetingType = 'Institution';
    } else {
      defaultMeetingType = (formData.meetingType as 'Institution' | 'Hospital') || 'Institution';
    }

    setFormData({ 
      activityType: newType, 
      meetingType: defaultMeetingType,
      status: 'Draft' 
    });
    setSearchTerm('');
    setIsAutoFilled(false);
  };

  const handleMeetingTypeChange = (type: 'Institution' | 'Hospital') => {
    if (formData.meetingType === type) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        meetingType: type,
        // Reset dynamic fields when switching types to keep records clean
        institutionName: type === 'Institution' ? searchTerm : '',
        hospitalName: type === 'Hospital' ? searchTerm : '',
        headOfInstitution: '',
        headOfHospital: '',
        headContact: '',
        contactNumber: '',
        spocName: '',
        headOfHr: '',
        spocContact: '',
        hrContact: '',
        spocEmail: '',
        hrEmail: '',
        finalYearStudentsCount: undefined,
        numberOfBeds: undefined,
        numberOfEmployees: undefined
      }));
      setIsAutoFilled(false);
      setIsTransitioning(false);
    }, 200);
  };

  const filteredOrgs = organizations.filter(org => {
    if (!searchTerm) return false;
    
    const targetType = formData.meetingType || 'Institution';
    if (org.type !== targetType) return false;

    return org.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectOrg = (org: Organization) => {
    setSearchTerm(org.name);
    setShowSuggestions(false);
    setIsAutoFilled(true);

    const updates: Partial<MarketReport> = { location: org.location };
    
    if (org.type === 'Institution') {
      updates.institutionName = org.name;
      updates.finalYearStudentsCount = org.finalYearStudentsCount;
      updates.headOfInstitution = org.headOfInstitution;
      updates.headContact = org.headContact || org.contactNumber;
      updates.spocName = org.spocName;
      updates.spocContact = org.spocContact;
      updates.spocEmail = org.spocEmail;
    } else if (org.type === 'Hospital') {
      updates.hospitalName = org.name;
      updates.numberOfBeds = org.numberOfBeds;
      updates.numberOfEmployees = org.numberOfEmployees;
      updates.headOfHospital = org.headOfHospital;
      updates.contactNumber = org.contactNumber; 
      updates.headOfHr = org.headOfHr;
      updates.hrContact = org.hrContact;
      updates.hrEmail = org.hrEmail;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const checkAndSaveOrganization = () => {
    const orgName = searchTerm.trim();
    if (!orgName) return;

    const orgType = (formData.meetingType as 'Institution' | 'Hospital') || 'Institution';
    const existing = organizations.find(o => o.name.toLowerCase() === orgName.toLowerCase() && o.type === orgType);
    
    if (!existing) {
      const newOrg: Omit<Organization, 'id'> = {
        name: orgName,
        type: orgType,
        location: formData.location || '',
      };

      if (orgType === 'Institution') {
        newOrg.finalYearStudentsCount = formData.finalYearStudentsCount;
        newOrg.headOfInstitution = formData.headOfInstitution;
        newOrg.headContact = formData.headContact;
        newOrg.spocName = formData.spocName;
        newOrg.spocContact = formData.spocContact;
        newOrg.spocEmail = formData.spocEmail;
      } else if (orgType === 'Hospital') {
        newOrg.numberOfBeds = formData.numberOfBeds;
        newOrg.numberOfEmployees = formData.numberOfEmployees;
        newOrg.headOfHospital = formData.headOfHospital;
        newOrg.contactNumber = formData.contactNumber;
        newOrg.headOfHr = formData.headOfHr;
        newOrg.hrContact = formData.hrContact;
        newOrg.hrEmail = formData.hrEmail;
      }

      addOrganization(newOrg);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    setIsAutoFilled(false);
    
    if (formData.meetingType === 'Hospital') {
      handleChange('hospitalName', value);
    } else {
      handleChange('institutionName', value);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields in the form?")) {
      setFormData({
        activityType: ACTIVITY_TYPES[0],
        meetingType: 'Institution',
        status: 'Draft',
      });
      setSearchTerm('');
      setIsAutoFilled(false);
    }
  };

  const submitFinal = async (status: 'Draft' | 'Pending') => {
    if (!searchTerm.trim()) {
      alert('Organization name is required.');
      return;
    }
    
    checkAndSaveOrganization();

    const isHospital = formData.meetingType === 'Hospital';
    const reportData = {
      ...formData,
      institutionName: isHospital ? undefined : searchTerm,
      hospitalName: isHospital ? searchTerm : undefined,
      id: reportToEdit?.id,
      status,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      attachments: reportToEdit?.attachments || []
    } as any;

    try {
      await createReport(reportData);
      onSuccess();
    } catch (err) {
      console.error('Failed to save report:', err);
      alert('Failed to save report. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFinal('Pending');
  };

  const renderFields = () => {
    const isHospital = formData.meetingType === 'Hospital';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Dynamic Card 1: Primary Entity and Location Information */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          backdropFilter: 'var(--glass-filter)'
        }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            Entity Profile
          </h4>
          
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Search existing {formData.meetingType}</label>
              <div ref={wrapperRef} style={{ position: 'relative', marginTop: '6px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder={`Type to search or enter a new ${isHospital ? 'hospital' : 'institution'}...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    style={{ paddingLeft: '48px' }}
                    required
                  />
                  {isAutoFilled && (
                    <div style={{ position: 'absolute', right: '16px', color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--success-glow)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      Auto-filled
                    </div>
                  )}
                </div>
                
                {showSuggestions && filteredOrgs.length > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 8px)', 
                    left: 0, 
                    right: 0, 
                    backgroundColor: 'var(--bg-sidebar)', 
                    border: '1px solid var(--border-muted)', 
                    borderRadius: 'var(--radius-md)', 
                    zIndex: 100, 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    boxShadow: 'var(--shadow-lg)',
                    backdropFilter: 'var(--glass-filter)'
                  }}>
                    {filteredOrgs.map(org => (
                      <div 
                        key={org.id} 
                        onClick={() => handleSelectOrg(org)}
                        style={{ 
                          padding: '12px 16px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid var(--border-muted)',
                          transition: 'background-color var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{org.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                          {org.location || 'No location set'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Location</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Street address, City, Region..."
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Card 2: Strategic CRM Contacts & Profile Details */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          backdropFilter: 'var(--glass-filter)'
        }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            CRM Stakeholder Directory
          </h4>
          
          <div className="form-grid">
            {/* Leadership Stakeholder */}
            <div className="form-group">
              <label className="form-label">{isHospital ? 'Head of Hospital' : 'Head of Institution'}</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={isHospital ? 'e.g. Dr. Sarah Connor' : 'e.g. Dean Arthur Pendelton'}
                  value={isHospital ? (formData.headOfHospital || '') : (formData.headOfInstitution || '')} 
                  onChange={e => handleChange(isHospital ? 'headOfHospital' : 'headOfInstitution', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Leadership Contact details</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Primary phone or direct extension..."
                  value={isHospital ? (formData.contactNumber || '') : (formData.headContact || '')} 
                  onChange={e => handleChange(isHospital ? 'contactNumber' : 'headContact', e.target.value)} 
                />
              </div>
            </div>

            {/* SPOC Stakeholder */}
            <div className="form-group">
              <label className="form-label">{isHospital ? 'Head of HR / SPOC Name' : 'SPOC Name'}</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Single Point of Contact (SPOC) Name..."
                  value={isHospital ? (formData.headOfHr || '') : (formData.spocName || '')} 
                  onChange={e => handleChange(isHospital ? 'headOfHr' : 'spocName', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">SPOC Contact Number</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="SPOC direct mobile number..."
                  value={isHospital ? (formData.hrContact || '') : (formData.spocContact || '')} 
                  onChange={e => handleChange(isHospital ? 'hrContact' : 'spocContact', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">SPOC Email Address</label>
              <div style={{ marginTop: '6px' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="spoc@organization.com"
                  value={isHospital ? (formData.hrEmail || '') : (formData.spocEmail || '')} 
                  onChange={e => handleChange(isHospital ? 'hrEmail' : 'spocEmail', e.target.value)} 
                />
              </div>
            </div>

            {/* Dynamic Metric Field depending on meeting type */}
            {isHospital ? (
              <>
                <div className="form-group">
                  <label className="form-label">Number of Beds</label>
                  <div style={{ marginTop: '6px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 250"
                      value={formData.numberOfBeds || ''} 
                      onChange={e => handleChange('numberOfBeds', e.target.value ? Number(e.target.value) : undefined)} 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Staff / Employees</label>
                  <div style={{ marginTop: '6px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 1500"
                      value={formData.numberOfEmployees || ''} 
                      onChange={e => handleChange('numberOfEmployees', e.target.value ? Number(e.target.value) : undefined)} 
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Number of Final Year Students</label>
                <div style={{ marginTop: '6px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Total candidates in graduating class..."
                    value={formData.finalYearStudentsCount || ''} 
                    onChange={e => handleChange('finalYearStudentsCount', e.target.value ? Number(e.target.value) : undefined)} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Card 3: Additional Activity Information (Follow Ups, Campaigns, Conferences) */}
        {(formData.activityType?.includes('Follow up') || formData.activityType === 'Campaigns Conducted' || formData.activityType === 'Participation in Conferences') && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            backdropFilter: 'var(--glass-filter)'
          }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
              Activity Scope Details
            </h4>
            
            <div className="form-grid">
              {/* Follow ups */}
              {formData.activityType?.includes('Follow up') && (
                <>
                  <div className="form-group">
                    <label className="form-label">Date of Activity</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="date" className="form-input" value={formData.dateOfActivity || ''} onChange={e => handleChange('dateOfActivity', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mode of Meeting</label>
                    <div style={{ marginTop: '6px' }}>
                      <select className="form-select" value={formData.modeOfMeeting || ''} onChange={e => handleChange('modeOfMeeting', e.target.value)}>
                        <option value="">Select Mode</option>
                        <option>Physical</option>
                        <option>Virtual</option>
                        <option>Telephonic</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Feedback from Client</label>
                    <div style={{ marginTop: '6px' }}>
                      <textarea className="form-textarea" placeholder="Detail the outcome or notes from client follow up..." value={formData.feedbackFromClient || ''} onChange={e => handleChange('feedbackFromClient', e.target.value)} style={{ minHeight: '90px' }} />
                    </div>
                  </div>
                </>
              )}

              {/* Campaigns */}
              {formData.activityType === 'Campaigns Conducted' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Number of Students Attended</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="number" className="form-input" placeholder="e.g. 150" value={formData.numberOfStudentsAttended || ''} onChange={e => handleChange('numberOfStudentsAttended', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Students Registered</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="number" className="form-input" placeholder="e.g. 75" value={formData.numberOfStudentsRegistered || ''} onChange={e => handleChange('numberOfStudentsRegistered', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">List of Students Captured</label>
                    <div style={{ marginTop: '6px' }}>
                      <textarea className="form-textarea" placeholder="Enter captured student names, classes, or paste link to spreadsheet..." value={formData.listOfStudentsCaptured || ''} onChange={e => handleChange('listOfStudentsCaptured', e.target.value)} style={{ minHeight: '90px' }} />
                    </div>
                  </div>
                </>
              )}

              {/* Conferences */}
              {formData.activityType === 'Participation in Conferences' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Target Professionals</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="text" className="form-input" placeholder="e.g. Cardiologists, HR Managers..." value={formData.targetProfessionals || ''} onChange={e => handleChange('targetProfessionals', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Participants</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="number" className="form-input" placeholder="e.g. 500" value={formData.numberOfParticipants || ''} onChange={e => handleChange('numberOfParticipants', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foot Falls of Participants</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="number" className="form-input" placeholder="Booth traffic estimate..." value={formData.footFallsOfParticipants || ''} onChange={e => handleChange('footFallsOfParticipants', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Registrations</label>
                    <div style={{ marginTop: '6px' }}>
                      <input type="number" className="form-input" placeholder="Leads or signups captured..." value={formData.numberOfRegistrations || ''} onChange={e => handleChange('numberOfRegistrations', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Card 4: Cost Analysis and Intelligence Observations */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          backdropFilter: 'var(--glass-filter)'
        }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            Observations & Financials
          </h4>
          
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Cost of Visit ($)</label>
              <div style={{ marginTop: '6px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>$</span>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Total travel, dining, or miscellaneous expenses..."
                  value={formData.costOfVisit || ''} 
                  onChange={e => handleChange('costOfVisit', e.target.value ? Number(e.target.value) : undefined)} 
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Marketing Observation</label>
              <div style={{ marginTop: '6px' }}>
                <textarea 
                  className="form-textarea" 
                  placeholder="Document structural market patterns, competitor strategies, client needs, or key observations..."
                  value={formData.marketingObservation || ''} 
                  onChange={e => handleChange('marketingObservation', e.target.value)} 
                  style={{ minHeight: '140px' }}
                  required
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%', padding: '0px', backgroundColor: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {reportToEdit && (
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid var(--primary-glow)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" /></svg>
          <div>
            <strong>Modifying Draft:</strong> Editing stored draft <strong>{reportToEdit.id}</strong>.
          </div>
        </div>
      )}

      {/* SECTION 1: CORE CONFIGURATION */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        backdropFilter: 'var(--glass-filter)'
      }}>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: '800' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem' }}>1</span>
          Core Session Setup
        </h3>
        
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Activity Type</label>
            <div style={{ marginTop: '6px' }}>
              <select 
                className="form-select"
                value={formData.activityType}
                onChange={handleActivityChange}
                style={{ padding: '12px 16px' }}
              >
                {ACTIVITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Segment Buttons for Meeting Type */}
          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '8px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Select Meeting Entity Type</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div 
                onClick={() => handleMeetingTypeChange('Institution')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: formData.meetingType === 'Institution' ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-sidebar)',
                  border: formData.meetingType === 'Institution' ? '2px solid var(--primary)' : '2px solid var(--border-muted)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all var(--transition-normal)',
                  boxShadow: formData.meetingType === 'Institution' ? 'var(--shadow-glow)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={formData.meetingType === 'Institution' ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2">
                  <path d="M22 10v6M2 10v6M4 10h16M12 4v16" />
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M12 4L4 10h16z" />
                </svg>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.meetingType === 'Institution' ? 'var(--text-main)' : 'var(--text-muted)' }}>Institution</span>
              </div>
              <div 
                onClick={() => handleMeetingTypeChange('Hospital')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: formData.meetingType === 'Hospital' ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-sidebar)',
                  border: formData.meetingType === 'Hospital' ? '2px solid var(--primary)' : '2px solid var(--border-muted)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all var(--transition-normal)',
                  boxShadow: formData.meetingType === 'Hospital' ? 'var(--shadow-glow)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={formData.meetingType === 'Hospital' ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 12h6M12 9v6" />
                </svg>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.meetingType === 'Hospital' ? 'var(--text-main)' : 'var(--text-muted)' }}>Hospital</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DYNAMIC FORM PANELS WITH TRANSITIONS */}
      <div>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: '800' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem' }}>2</span>
          Reporting Data
        </h3>
        
        <div style={{
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(12px)' : 'translateY(0)'
        }}>
          {renderFields()}
        </div>
      </div>

      {/* BOTTOM CONTROLS & SUBMISSION WORKFLOW */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '12px', 
          marginTop: '16px',
          borderTop: '1px solid var(--border-muted)',
          paddingTop: '24px',
          flexWrap: 'wrap'
        }}
      >
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
          style={{ border: '1px solid var(--border-muted)' }}
        >
          Cancel
        </button>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn" 
            onClick={handleReset}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error-text)' }}
          >
            Reset Form
          </button>

          <button 
            type="button" 
            className="btn" 
            onClick={() => submitFinal('Draft')}
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
      </div>

    </form>
  );
};
