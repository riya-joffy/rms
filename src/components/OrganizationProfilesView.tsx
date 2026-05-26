'use client';

import React, { useState, useMemo } from 'react';
import { Organization, MarketReport } from '../types';
import { useReports } from '../context/ReportContext';

interface OrganizationProfilesViewProps {
  onInspectReport: (report: MarketReport) => void;
}

export const OrganizationProfilesView: React.FC<OrganizationProfilesViewProps> = ({ onInspectReport }) => {
  const { organizations, reports, updateOrganization, deleteOrganization, addOrganization } = useReports();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Institution' | 'Hospital'>('All');
  
  // Navigation sub-state: 'list' | 'detail'
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Edit / Add modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);

  // Helper to find organization reports
  const getOrgReports = (orgName: string, orgType: string, orgId?: string) => {
    return reports.filter(r => {
      // Prioritize database relation link (organizationId)
      if (orgId && r.organizationId === orgId) return true;
      
      // Fallback to name match for backward compatibility
      const targetName = orgType === 'Hospital' ? r.hospitalName : r.institutionName;
      return targetName?.toLowerCase() === orgName.toLowerCase();
    });
  };

  // Sort reports chronologically (newest first)
  const getSortedOrgReports = (orgName: string, orgType: string, orgId?: string) => {
    const orgReps = getOrgReports(orgName, orgType, orgId);
    return [...orgReps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Dynamic calculations for profiles
  const profileDetails = useMemo(() => {
    return organizations.map(org => {
      const orgReps = getSortedOrgReports(org.name, org.type, org.id);
      const totalMeetings = orgReps.length;
      const lastVisit = totalMeetings > 0 ? `${orgReps[0].date} @ ${orgReps[0].time || '00:00'}` : 'Never visited';
      
      // Accumulate observation history
      const observations = orgReps
        .map(r => r.marketingObservation || r.observations)
        .filter(Boolean) as string[];

      return {
        ...org,
        totalMeetings,
        lastVisit,
        observations
      };
    });
  }, [organizations, reports]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profileDetails.filter(profile => {
      const matchesSearch = 
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.spocName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || profile.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [profileDetails, searchTerm, typeFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = organizations.length;
    const hospitals = organizations.filter(o => o.type === 'Hospital').length;
    const institutions = organizations.filter(o => o.type === 'Institution').length;
    const totalMeetings = reports.filter(r => r.status === 'Approved').length;

    return { total, hospitals, institutions, totalMeetings };
  }, [organizations, reports]);

  // Currently inspected profile
  const activeProfile = useMemo(() => {
    if (!selectedOrgId) return null;
    return profileDetails.find(p => p.id === selectedOrgId) || null;
  }, [profileDetails, selectedOrgId]);

  const handleOpenEdit = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setEditingOrg({ ...org });
    setShowModal(true);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingOrg({
      name: '',
      type: 'Institution',
      location: '',
      finalYearStudentsCount: undefined,
      numberOfBeds: undefined,
      numberOfEmployees: undefined,
      headOfInstitution: '',
      headOfHospital: '',
      headContact: '',
      contactNumber: '',
      spocName: '',
      spocContact: '',
      spocEmail: '',
      headOfHr: '',
      hrContact: '',
      hrEmail: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (orgId: string, orgName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you absolutely sure you want to delete the profile for "${orgName}"? This will permanently remove its metadata from the CRM.`)) {
      await deleteOrganization(orgId);
      if (selectedOrgId === orgId) {
        setViewState('list');
        setSelectedOrgId(null);
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg || !editingOrg.name?.trim() || !editingOrg.location?.trim()) {
      alert('Organization name and location are required.');
      return;
    }

    try {
      if (modalMode === 'edit' && editingOrg.id) {
        await updateOrganization(editingOrg.id, editingOrg);
      } else {
        await addOrganization(editingOrg as Omit<Organization, 'id'>);
      }
      setShowModal(false);
      setEditingOrg(null);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('An error occurred while saving the profile.');
    }
  };

  const handleFieldChange = (field: keyof Organization, value: any) => {
    setEditingOrg(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      
      {/* 1. LIST VIEW */}
      {viewState === 'list' && (
        <>
          {/* Executive Stats Row */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">CRM Profiles</span>
                <div className="stat-icon-box purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-footer"><span>Registered CRM Profiles</span></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Hospital Profiles</span>
                <div className="stat-icon-box blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 12h6M12 9v6" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">{stats.hospitals}</div>
              <div className="stat-footer"><span>Medical Centres</span></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Institution Profiles</span>
                <div className="stat-icon-box purple" style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-glow)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10v6M4 10h16M12 4v16" />
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M12 4L4 10h16z" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">{stats.institutions}</div>
              <div className="stat-footer"><span>Academic Partners</span></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Approved Audited Visits</span>
                <div className="stat-icon-box green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">{stats.totalMeetings}</div>
              <div className="stat-footer"><span>Total meeting logs</span></div>
            </div>
          </section>

          {/* Table Card wrapper */}
          <div className="table-card">
            <div className="table-header-bar">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="table-title">CRM Organization Directory</div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Audit and manage your hospital and academic profile linkages.
                </span>
              </div>

              <div className="filters-row">
                {/* Search */}
                <div className="search-input-wrapper">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search by name, city, SPOC..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filter */}
                <select 
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="All">All Types</option>
                  <option value="Hospital">Hospitals Only</option>
                  <option value="Institution">Institutions Only</option>
                </select>

                <button className="btn btn-primary" onClick={handleOpenAdd}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Profile
                </button>
              </div>
            </div>

            {/* Grid of Profile Cards */}
            <div style={{ padding: '32px' }}>
              {filteredProfiles.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                  gap: '24px' 
                }}>
                  {filteredProfiles.map((org) => {
                    const isHospital = org.type === 'Hospital';
                    return (
                      <div 
                        key={org.id} 
                        onClick={() => { setSelectedOrgId(org.id); setViewState('detail'); }}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-muted)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'all var(--transition-normal)',
                          backdropFilter: 'var(--glass-filter)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'var(--primary-glow)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--shadow-glow)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'var(--border-muted)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Upper Badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`badge ${isHospital ? 'approved' : 'pending'}`} style={{
                            backgroundColor: isHospital ? 'rgba(6, 182, 212, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                            color: isHospital ? 'rgb(6, 182, 212)' : 'var(--primary)',
                            border: isHospital ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid var(--primary-glow)'
                          }}>
                            {isHospital ? 'Hospital' : 'Institution'}
                          </span>
                          
                          {org.totalMeetings > 0 && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                              color: 'var(--success-text)', 
                              border: '1px solid var(--success-glow)', 
                              padding: '2px 8px', 
                              borderRadius: 'var(--radius-sm)', 
                              fontWeight: '600'
                            }}>
                              Previously Visited
                            </span>
                          )}
                        </div>

                        {/* Title and location */}
                        <div>
                          <h4 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: '800', marginBottom: '6px', lineBreak: 'anywhere' }}>{org.name}</h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            {org.location}
                          </div>
                        </div>

                        {/* SPOC Info Preview */}
                        <div style={{ 
                          backgroundColor: 'var(--bg-sidebar)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '0.8rem',
                          border: '1px solid var(--border-muted)'
                        }}>
                          <div style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '4px', marginBottom: '2px' }}>
                            SPOC CONTACT
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                            <span>Name:</span>
                            <span style={{ fontWeight: '600' }}>{isHospital ? (org.headOfHr || 'N/A') : (org.spocName || 'N/A')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Mobile:</span>
                            <span>{isHospital ? (org.hrContact || org.contactNumber || 'N/A') : (org.spocContact || 'N/A')}</span>
                          </div>
                        </div>

                        {/* Timeline Meta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <div>Meetings: <strong style={{ color: 'var(--text-main)' }}>{org.totalMeetings}</strong></div>
                          <div>Last: <strong style={{ color: 'var(--text-main)' }}>{org.totalMeetings > 0 ? org.lastVisit.split(' @ ')[0] : 'Never'}</strong></div>
                        </div>

                        {/* Action controls */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'flex-end', 
                          gap: '10px', 
                          borderTop: '1px solid var(--border-muted)', 
                          paddingTop: '14px', 
                          marginTop: '4px' 
                        }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px 10px' }}
                            onClick={(e) => handleOpenEdit(org, e)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                            Edit
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px 10px', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'transparent' }}
                            onClick={(e) => handleDelete(org.id, org.name, e)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <h4>No organization profiles match your query</h4>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try modifying your filter keyword or create a new profile.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 2. DETAIL PROFILE VIEW */}
      {viewState === 'detail' && activeProfile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Back Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => { setViewState('list'); setSelectedOrgId(null); }}
              style={{ border: '1px solid var(--border-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Profiles
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => handleOpenEdit(activeProfile, e)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                Edit Profile
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                onClick={(e) => handleDelete(activeProfile.id, activeProfile.name, e)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                Delete Profile
              </button>
            </div>
          </div>

          {/* Profile Main Header Panel */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            backdropFilter: 'var(--glass-filter)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            <div>
              <span className={`badge ${activeProfile.type === 'Hospital' ? 'approved' : 'pending'}`} style={{
                backgroundColor: activeProfile.type === 'Hospital' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                color: activeProfile.type === 'Hospital' ? 'rgb(6, 182, 212)' : 'var(--primary)',
                border: activeProfile.type === 'Hospital' ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid var(--primary-glow)',
                marginBottom: '12px'
              }}>
                {activeProfile.type}
              </span>
              
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                {activeProfile.name}
              </h2>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                  {activeProfile.location}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Last visit: {activeProfile.lastVisit}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '16px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>{activeProfile.totalMeetings}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL MEETINGS</div>
              </div>
              {activeProfile.type === 'Hospital' ? (
                <>
                  <div style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--info)' }}>{activeProfile.numberOfBeds || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>BEDS COUNT</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)' }}>{activeProfile.numberOfEmployees || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>EMPLOYEES</div>
                  </div>
                </>
              ) : (
                <div style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '16px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--info)' }}>{activeProfile.finalYearStudentsCount || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>GRADUATES</div>
                </div>
              )}
            </div>
          </div>

          {/* CRM Stakeholder Directory layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Leadership Stakeholder Box */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-lg)', padding: '24px', backdropFilter: 'var(--glass-filter)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '18px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Administrative Leadership
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{activeProfile.type === 'Hospital' ? 'Head of Hospital' : 'Head of Institution'}:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{activeProfile.type === 'Hospital' ? (activeProfile.headOfHospital || 'Not Set') : (activeProfile.headOfInstitution || 'Not Set')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Details:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{activeProfile.type === 'Hospital' ? (activeProfile.contactNumber || 'Not Set') : (activeProfile.headContact || 'Not Set')}</span>
                </div>
              </div>
            </div>

            {/* SPOC / HR Stakeholder Box */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-lg)', padding: '24px', backdropFilter: 'var(--glass-filter)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '18px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Key SPOC Contact
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Name:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{activeProfile.type === 'Hospital' ? (activeProfile.headOfHr || 'Not Set') : (activeProfile.spocName || 'Not Set')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{activeProfile.type === 'Hospital' ? (activeProfile.hrContact || 'Not Set') : (activeProfile.spocContact || 'Not Set')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{activeProfile.type === 'Hospital' ? (activeProfile.hrEmail || 'Not Set') : (activeProfile.spocEmail || 'Not Set')}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Observations and Timeline grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Observations History snippet list */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-lg)', padding: '24px', backdropFilter: 'var(--glass-filter)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Historical Visit Notes & Observations
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '420px', paddingRight: '6px' }}>
                {activeProfile.observations && activeProfile.observations.length > 0 ? (
                  activeProfile.observations.map((obs, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '16px', 
                        backgroundColor: 'var(--bg-sidebar)', 
                        border: '1px solid var(--border-muted)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        lineHeight: '1.45',
                        position: 'relative'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '0.7rem', color: 'var(--text-dark)', fontWeight: '700' }}>#{activeProfile.observations.length - idx}</div>
                      <div style={{ color: 'var(--text-main)' }}>{obs}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No observation histories found for this profile yet. Complete report visits to populate notes automatically.
                  </div>
                )}
              </div>
            </div>

            {/* Reports History Timeline */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-lg)', padding: '24px', backdropFilter: 'var(--glass-filter)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Chronological Report Timeline
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '420px', paddingRight: '6px' }}>
                {getSortedOrgReports(activeProfile.name, activeProfile.type, activeProfile.id).length > 0 ? (
                  getSortedOrgReports(activeProfile.name, activeProfile.type, activeProfile.id).map((rep) => {
                    const statusClass = rep.status === 'Approved' ? 'badge approved' : rep.status === 'Rejected' ? 'badge rejected' : 'badge pending';
                    return (
                      <div 
                        key={rep.id} 
                        style={{ 
                          padding: '16px', 
                          backgroundColor: 'var(--bg-sidebar)', 
                          border: '1px solid var(--border-muted)', 
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>{rep.id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rep.activityType} • {rep.date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>Submitted by {rep.staffName}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                          <span className={statusClass} style={{ fontSize: '0.65rem' }}>{rep.status}</span>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => onInspectReport(rep)}
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No reports timeline recorded yet.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. DYNAMIC PROFILE ADD/EDIT OVERLAY MODAL */}
      {showModal && editingOrg && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                {modalMode === 'edit' ? `Edit CRM Profile: ${editingOrg.name}` : 'Create New Organization Profile'}
              </h3>
              <button 
                onClick={() => { setShowModal(false); setEditingOrg(null); }}
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveModal}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Base Setup */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Profile Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. St. Jude Clinic"
                      value={editingOrg.name || ''} 
                      onChange={e => handleFieldChange('name', e.target.value)}
                      style={{ marginTop: '6px' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Organization Type</label>
                    <select 
                      className="form-select"
                      value={editingOrg.type || 'Institution'}
                      onChange={e => handleFieldChange('type', e.target.value)}
                      style={{ marginTop: '6px' }}
                      disabled={modalMode === 'edit'} // Lock type on edit to maintain consistency
                    >
                      <option value="Institution">Institution</option>
                      <option value="Hospital">Hospital</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Street, City, State focus..."
                    value={editingOrg.location || ''} 
                    onChange={e => handleFieldChange('location', e.target.value)}
                    style={{ marginTop: '6px' }}
                    required
                  />
                </div>

                {/* 2. Stakeholder Leader details */}
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px' }}>Leadership & Leadership Contact</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{editingOrg.type === 'Hospital' ? 'Head of Hospital' : 'Head of Institution'}</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={editingOrg.type === 'Hospital' ? 'e.g. Dr. Sarah Connor' : 'Dean Arthur Pendelton'}
                        value={editingOrg.type === 'Hospital' ? (editingOrg.headOfHospital || '') : (editingOrg.headOfInstitution || '')} 
                        onChange={e => handleFieldChange(editingOrg.type === 'Hospital' ? 'headOfHospital' : 'headOfInstitution', e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Leadership phone</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Direct contact details..."
                        value={editingOrg.type === 'Hospital' ? (editingOrg.contactNumber || '') : (editingOrg.headContact || '')} 
                        onChange={e => handleFieldChange(editingOrg.type === 'Hospital' ? 'contactNumber' : 'headContact', e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CRM SPOC Details */}
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px' }}>
                    {editingOrg.type === 'Hospital' ? 'HR / Management SPOC details' : 'Institutional SPOC details'}
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">SPOC Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Stakeholder direct representative..."
                        value={editingOrg.type === 'Hospital' ? (editingOrg.headOfHr || '') : (editingOrg.spocName || '')} 
                        onChange={e => handleFieldChange(editingOrg.type === 'Hospital' ? 'headOfHr' : 'spocName', e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">SPOC Telephone</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="SPOC direct mobile..."
                        value={editingOrg.type === 'Hospital' ? (editingOrg.hrContact || '') : (editingOrg.spocContact || '')} 
                        onChange={e => handleFieldChange(editingOrg.type === 'Hospital' ? 'hrContact' : 'spocContact', e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">SPOC Email address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="spoc@organization.com"
                      value={editingOrg.type === 'Hospital' ? (editingOrg.hrEmail || '') : (editingOrg.spocEmail || '')} 
                      onChange={e => handleFieldChange(editingOrg.type === 'Hospital' ? 'hrEmail' : 'spocEmail', e.target.value)}
                      style={{ marginTop: '6px' }}
                    />
                  </div>
                </div>

                {/* 4. Type Specific Numerical Metrics */}
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px' }}>Operational Statistics Metrics</h4>
                  {editingOrg.type === 'Hospital' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Bed capacity count</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="Beds quantity..."
                          value={editingOrg.numberOfBeds || ''} 
                          onChange={e => handleFieldChange('numberOfBeds', e.target.value ? Number(e.target.value) : undefined)}
                          style={{ marginTop: '6px' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total personnel / employees</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="e.g. 500"
                          value={editingOrg.numberOfEmployees || ''} 
                          onChange={e => handleFieldChange('numberOfEmployees', e.target.value ? Number(e.target.value) : undefined)}
                          style={{ marginTop: '6px' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Graduating candidates / Students count</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="Final year student numbers..."
                        value={editingOrg.finalYearStudentsCount || ''} 
                        onChange={e => handleFieldChange('finalYearStudentsCount', e.target.value ? Number(e.target.value) : undefined)}
                        style={{ marginTop: '6px' }}
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--border-muted)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowModal(false); setEditingOrg(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  {modalMode === 'edit' ? 'Update Profile' : 'Add Profile'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
