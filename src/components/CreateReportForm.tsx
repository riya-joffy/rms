'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MarketReport, Organization } from '../types';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';

interface CreateReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  reportToEdit?: MarketReport | null;
}

const ACTIVITY_TYPES = [
  'Meeting with Organisation',
  'Meetings with Institutes',
  'Follow up with Institutes',
  'Campaigns Conducted',
  'Participation in Conferences',
  'Meetings with Hospitals',
  'Follow up with Hospitals'
];

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ onSuccess, onCancel, reportToEdit }) => {
  const { reports, createReport, organizations, addOrganization, updateOrganization } = useReports();
  const { user } = useAuth();
  const isStaff = user?.role !== 'admin';

  const getDaysDifference = (dateStr?: string) => {
    if (!dateStr) return { diffDays: null, isValid: false, status: 'empty' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { diffDays: null, isValid: false, status: 'invalid' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const meetingDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    meetingDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - meetingDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { diffDays, isValid: false, status: 'future' };
    } else if (diffDays > 2) {
      return { diffDays, isValid: false, status: 'expired' };
    }
    return { diffDays, isValid: true, status: 'valid' };
  };

  // Unified form data
  const [formData, setFormData] = useState<Partial<MarketReport>>({
    activityType: ACTIVITY_TYPES[0],
    meetingType: 'Institution',
    status: 'Draft',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
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
      setProfileExpanded(false);
      setIsEditingProfile(false);
    } else {
      setFormData({ 
        activityType: ACTIVITY_TYPES[0], 
        meetingType: 'Institution',
        status: 'Draft' 
      });
      setSearchTerm('');
      setIsAutoFilled(false);
      setProfileExpanded(false);
      setIsEditingProfile(false);
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
    if (newType === 'Meeting with Organisation') {
      defaultMeetingType = (formData.meetingType as 'Institution' | 'Hospital') || 'Institution';
    } else if (newType.includes('Hospital')) {
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
    setProfileExpanded(false);
    setIsEditingProfile(false);
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
      setProfileExpanded(false);
      setIsEditingProfile(false);
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
    setProfileExpanded(false);
    setIsEditingProfile(false);

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

  const checkAndSaveOrganization = async (): Promise<string | undefined> => {
    const orgName = searchTerm.trim();
    if (!orgName) return undefined;

    const orgType = (formData.meetingType as 'Institution' | 'Hospital') || 'Institution';
    const existing = organizations.find(o => o.name.toLowerCase() === orgName.toLowerCase() && o.type === orgType);
    
    if (existing) {
      // Update existing organization with any edited fields
      const updatedOrg: Partial<Organization> = {
        location: formData.location || '',
      };
      
      if (orgType === 'Institution') {
        updatedOrg.finalYearStudentsCount = formData.finalYearStudentsCount;
        updatedOrg.headOfInstitution = formData.headOfInstitution;
        updatedOrg.headContact = formData.headContact;
        updatedOrg.spocName = formData.spocName;
        updatedOrg.spocContact = formData.spocContact;
        updatedOrg.spocEmail = formData.spocEmail;
      } else if (orgType === 'Hospital') {
        updatedOrg.numberOfBeds = formData.numberOfBeds;
        updatedOrg.numberOfEmployees = formData.numberOfEmployees;
        updatedOrg.headOfHospital = formData.headOfHospital;
        updatedOrg.contactNumber = formData.contactNumber;
        updatedOrg.headOfHr = formData.headOfHr;
        updatedOrg.hrContact = formData.hrContact;
        updatedOrg.hrEmail = formData.hrEmail;
      }
      
      await updateOrganization(existing.id, updatedOrg);
      return existing.id;
    }

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

    const saved = await addOrganization(newOrg);
    return saved?.id;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    setIsAutoFilled(false);
    setProfileExpanded(false);
    
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
      setProfileExpanded(false);
      setIsEditingProfile(false);
    }
  };

  const submitFinal = async (status: 'Draft' | 'Pending') => {
    if (!searchTerm.trim()) {
      alert('Organization name is required.');
      return;
    }
    
    // Policy Check: Staff members can only submit reports within two days of the meeting or activity
    if (status === 'Pending') {
      if (!formData.dateOfActivity) {
        alert('Date of Meeting / Activity is required to submit a report.');
        return;
      }
      
      const { isValid, diffDays, status: dateStatus } = getDaysDifference(formData.dateOfActivity);
      if (isStaff && !isValid) {
        if (dateStatus === 'future') {
          alert('Error: The meeting or activity date cannot be in the future.');
        } else {
          alert(`Error: Under corporate policy, staff members can only submit reports within 2 days of the meeting or activity. The selected meeting date occurred ${diffDays} days ago.`);
        }
        return;
      }
    }
    
    const orgId = await checkAndSaveOrganization();

    const isHospital = formData.meetingType === 'Hospital';
    const reportData = {
      ...formData,
      organizationId: orgId,
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

            {isAutoFilled && (
              <div style={{ 
                gridColumn: 'span 2',
                background: 'rgba(34, 197, 94, 0.04)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-text)', fontWeight: '700', fontSize: '0.9rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Profile Loaded Successfully
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: isEditingProfile ? 'var(--primary)' : 'rgba(168, 85, 247, 0.08)',
                        color: isEditingProfile ? '#ffffff' : 'var(--primary)',
                        border: '1px solid var(--primary-glow)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {isEditingProfile ? '✏️ Save Mode' : '✏️ Edit Profile'}
                    </button>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                      color: 'var(--primary)', 
                      border: '1px solid var(--primary-glow)', 
                      padding: '4px 8px', 
                      borderRadius: 'var(--radius-sm)', 
                      fontWeight: '600'
                    }}>
                      Previously Used
                    </span>
                  </div>
                </div>

                {isEditingProfile && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--primary)',
                    backgroundColor: 'rgba(168, 85, 247, 0.04)',
                    border: '1px solid var(--primary-glow)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Editing Mode Active: Modifications to location and contacts will update this profile globally upon submission.</span>
                  </div>
                )}

                {!isEditingProfile && (
                  <div 
                    onClick={() => setProfileExpanded(!profileExpanded)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-sidebar)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {profileExpanded ? '▼' : '▶'} {searchTerm} Profile
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {profileExpanded ? 'Collapse Details' : 'Expand Details'}
                    </span>
                  </div>
                )}

                {!isEditingProfile && profileExpanded && (
                  <div style={{ 
                    padding: '12px 4px 4px 4px', 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px', 
                    fontSize: '0.8rem',
                    borderTop: '1px solid var(--border-muted)',
                    color: 'var(--text-muted)'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>Location:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>{formData.location || 'N/A'}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>Leadership Head:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                        {isHospital ? (formData.headOfHospital || 'N/A') : (formData.headOfInstitution || 'N/A')}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>Leadership Contact:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                        {isHospital ? (formData.contactNumber || 'N/A') : (formData.headContact || 'N/A')}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>SPOC Name:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                        {isHospital ? (formData.headOfHr || 'N/A') : (formData.spocName || 'N/A')}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>SPOC Contact:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                        {isHospital ? (formData.hrContact || 'N/A') : (formData.spocContact || 'N/A')}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>SPOC Email:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                        {isHospital ? (formData.hrEmail || 'N/A') : (formData.spocEmail || 'N/A')}
                      </div>
                    </div>
                    {isHospital ? (
                      <>
                        <div>
                          <strong style={{ color: 'var(--primary)' }}>Total Beds:</strong>
                          <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>{formData.numberOfBeds || 'N/A'}</div>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--primary)' }}>Total Employees:</strong>
                          <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>{formData.numberOfEmployees || 'N/A'}</div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <strong style={{ color: 'var(--primary)' }}>Final Year Students:</strong>
                        <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>{formData.finalYearStudentsCount || 'N/A'}</div>
                      </div>
                    )}
                    
                    {/* Previous Notes */}
                    <div style={{ gridColumn: 'span 2', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-muted)' }}>
                      <strong style={{ color: 'var(--primary)' }}>Previous observations timeline:</strong>
                      <div style={{ 
                        marginTop: '4px', 
                        padding: '10px', 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-muted)', 
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '90px',
                        overflowY: 'auto'
                      }}>
                        {(() => {
                          const org = organizations.find(o => o.name.toLowerCase() === searchTerm.toLowerCase() && o.type === formData.meetingType);
                          const relatedReports = reports.filter(r => {
                            if (org?.id && r.organizationId === org.id) return true;
                            const targetName = formData.meetingType === 'Hospital' ? r.hospitalName : r.institutionName;
                            return targetName?.toLowerCase() === searchTerm.toLowerCase();
                          });
                          const obs = relatedReports
                            .map(r => r.marketingObservation || r.observations)
                            .filter(Boolean);
                          
                          if (obs.length > 0) {
                            return (
                              <ul style={{ paddingLeft: '14px', margin: 0, color: 'var(--text-muted)' }}>
                                {obs.map((o, i) => (
                                  <li key={i} style={{ marginBottom: '4px' }}>{o}</li>
                                ))}
                              </ul>
                            );
                          }
                          return 'No observations history recorded for this profile yet.';
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(!isAutoFilled || isEditingProfile) && (
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
            )}
          </div>
        </div>

        {(!isAutoFilled || isEditingProfile) && (
          /* Dynamic Card 2: Strategic CRM Contacts & Profile Details */
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
        )}

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
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
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
          <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Date of Meeting / Activity</label>
            <div style={{ marginTop: '6px' }}>
              <input 
                type="date" 
                className="form-input" 
                value={formData.dateOfActivity || ''} 
                onChange={e => handleChange('dateOfActivity', e.target.value)} 
                required
              />
            </div>
            {(() => {
              const { diffDays, isValid, status } = getDaysDifference(formData.dateOfActivity);
              if (status === 'empty') {
                return (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                    * Required for report submission.
                  </span>
                );
              }
              if (!isStaff) {
                return (
                  <span style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    ✨ Admin Mode: Validation bypassed. {diffDays !== null ? `(Date is ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago)` : ''}
                  </span>
                );
              }
              if (status === 'valid') {
                return (
                  <span style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    ✓ Valid: Meeting was {diffDays === 0 ? 'today' : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`} (within 2-day limit).
                  </span>
                );
              }
              if (status === 'future') {
                return (
                  <span style={{ fontSize: '0.72rem', color: 'var(--error-text)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    ⚠️ Invalid: Date cannot be in the future.
                  </span>
                );
              }
              if (status === 'expired') {
                return (
                  <span style={{ fontSize: '0.72rem', color: 'var(--error-text)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    ⚠️ Expired: Meeting was {diffDays} days ago (2-day limit).
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* Dynamic Segment Buttons / Dropdown for Meeting Type */}
          {formData.activityType === 'Meeting with Organisation' && (
            <div 
              className="form-group" 
              style={{ 
                gridColumn: 'span 2', 
                marginTop: '8px',
                animation: 'fadeInSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transformOrigin: 'top center'
              }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInSlide {
                  from {
                    opacity: 0;
                    transform: translateY(-8px);
                    max-height: 0;
                    margin-top: 0;
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                    max-height: 120px;
                    margin-top: 8px;
                  }
                }
              `}} />
              <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Select Meeting Entity Type</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-select"
                  value={formData.meetingType || 'Institution'}
                  onChange={(e) => handleMeetingTypeChange(e.target.value as 'Institution' | 'Hospital')}
                  style={{ 
                    padding: '12px 16px',
                    width: '100%',
                    backgroundColor: 'var(--bg-sidebar)',
                    border: '2px solid var(--border-muted)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a855f7' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    backgroundSize: '14px',
                    transition: 'all var(--transition-fast)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = 'var(--shadow-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-muted)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="Institution" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Institution</option>
                  <option value="Hospital" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Hospital</option>
                </select>
              </div>
            </div>
          )}
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
