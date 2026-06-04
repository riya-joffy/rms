'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/Navbar';
import { ReportModal } from '../../components/ReportModal';
import { CreateReportForm } from '../../components/CreateReportForm';
import { MarketReport } from '../../types';
import { ReportCard } from '../../components/ReportCard';
import { CreateUserModal } from '../../components/CreateUserModal';
import { ToggleStatusModal } from '../../components/ToggleStatusModal';
import { DeleteUserModal } from '../../components/DeleteUserModal';
import { User } from '../../types';
import { ExpenseTracker } from '../../components/ExpenseTracker';
import { AdminExpenseTracker } from '../../components/AdminExpenseTracker';
import { OrganizationProfilesView } from '../../components/OrganizationProfilesView';
import { SVGCharts } from '../../components/SVGCharts';
import { AdminAnalytics } from '../../components/AdminAnalytics';
import { isAdminRole, isStaffRole } from '../../lib/roles';
import { MonthlyTargetDashboard } from '../../components/MonthlyTargetDashboard';



export default function DashboardPage() {
  const { user, users, toggleUserStatus, loading: authLoading } = useAuth();
  const { reports, stats, loading: reportsLoading } = useReports();
  const router = useRouter();

  // Tab State: 'dashboard' | 'reports' | 'staff' | 'notifications' | 'settings' | 'create-report'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search & Filter States for Report Table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  // Modal & Edit States
  const [selectedReport, setSelectedReport] = useState<MarketReport | null>(null);
  const [reportToEdit, setReportToEdit] = useState<MarketReport | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showSuccessToast = (message: string) => setToast({ message, type: 'success' });
  const showErrorToast = (message: string) => setToast({ message, type: 'error' });

  // Verification redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    console.log('ROLE:', user.role);
    console.log('ACTIVE TAB:', activeTab);

    if (isStaffRole(user.role) && !['dashboard', 'create-report', 'organization-profiles', 'expense-tracker'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
    if (isAdminRole(user.role) && !['dashboard', 'organization-profiles', 'staff', 'staff-expenses'].includes(activeTab)) {
      setActiveTab('dashboard');
    }


  }, [activeTab, setActiveTab, user]);

  if (authLoading || !user) {
    return (
      <div 
        style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-main)',
          gap: '16px'
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>Loading operational session...</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ==========================================
  // Report Filtering Logic
  // ==========================================
  const filteredReports = reports.filter(rep => {
    // Search keyword query matcher
    const matchSearch = 
      rep.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.observations || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'All' || rep.status === statusFilter;
    const matchRegion = regionFilter === 'All' || (rep.region || '') === regionFilter;

    return matchSearch && matchStatus && matchRegion;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'badge approved';
      case 'Rejected': return 'badge rejected';
      default: return 'badge pending';
    }
  };

  const handleInspectReport = (report: MarketReport) => {
    if (isAdminRole(user.role) || report.staffId === user.id) {
      setSelectedReport(report);
    }
  };

  return (
    <div className="app-container">
      
      {/* 1. Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      {/* 2. Main Wrapper */}
      <div className="main-wrapper">
        
        {/* Navbar */}
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />

        {/* 3. Dynamic Page Content Body */}
        <main className="content-body">
          
          {/* ========================================================
              TAB A: EXECUTIVE / STAFF ANALYTICS DASHBOARD
              ======================================================== */}
          {activeTab === 'dashboard' && (
            <>
              {isStaffRole(user.role) ? (
                <>
                  {/* Staff Telemetry Stats Cards Grid */}
                  <section className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Total Reports</span>
                      </div>
                      <div className="stat-value">
                        {reports.filter(r => r.staffId === user.id).length}
                      </div>
                      <div className="stat-footer">
                        <span>All recorded reports</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Draft Reports</span>
                      </div>
                      <div className="stat-value">
                        {reports.filter(r => r.staffId === user.id && r.status === 'Draft').length}
                      </div>
                      <div className="stat-footer">
                        <span>Saved drafts</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Submitted Reports</span>
                      </div>
                      <div className="stat-value">
                        {reports.filter(r => r.staffId === user.id && r.status !== 'Draft').length}
                      </div>
                      <div className="stat-footer">
                        <span>Pending or reviewed</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Admin Feedback Count</span>
                      </div>
                      <div className="stat-value">
                        {reports.filter(r => r.staffId === user.id && (r.status === 'Approved' || r.status === 'Rejected')).length}
                      </div>
                      <div className="stat-footer">
                        <span>Processed submissions</span>
                      </div>
                    </div>
                  </section>

                  {/* Operational Submissions Graph */}
                  <SVGCharts reports={reports.filter(r => r.staffId === user.id)} />

                  {/* Monthly Targets Analytics */}
                  <MonthlyTargetDashboard />


                  {/* My Submissions & Drafts Tracker */}
                  <div className="table-card" style={{ marginTop: '24px' }}>
                    <div className="table-header-bar">
                      <div className="table-title">My Submissions & Drafts Tracker</div>
                      <div className="filters-row" style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => { setReportToEdit(null); setActiveTab('create-report'); }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Create New Report
                        </button>
                      </div>
                    </div>

                    <div className="data-table-container">
                      {reports.filter(r => r.staffId === user.id).length > 0 ? (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Institution / Hospital</th>
                              <th>Location</th>
                              <th>Activity Type</th>
                              <th>Meeting Date</th>
                              <th>Submitted Date</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reports
                              .filter(r => r.staffId === user.id)
                              .map((rep) => (
                                <tr key={rep.id}>
                                  <td style={{ fontWeight: '600' }}>{rep.institutionName || rep.hospitalName || rep.conferenceName || 'N/A'}</td>
                                  <td>{rep.location}</td>
                                  <td>{rep.activityType} {rep.meetingType ? `(${rep.meetingType})` : ''}</td>
                                  <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{rep.dateOfActivity || 'N/A'}</td>
                                  <td>{rep.date} @ {rep.time}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    {rep.status === 'Draft' ? (
                                      <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                          setReportToEdit(rep);
                                          setActiveTab('create-report');
                                        }}
                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                      >
                                        Edit Draft
                                      </button>
                                    ) : (
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleInspectReport(rep)}
                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                      >
                                        Inspect Details
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <h4>No institutional reports recorded yet</h4>
                          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "Create New Report" to start documenting your visits and field activity.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Admin Telemetry Stats Cards Grid */}
                  <section className="stats-grid">
                    {/* Stat 1 */}
                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Total Submissions</span>
                        <div className="stat-icon-box purple">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      </div>
                      <div className="stat-value">{stats.totalReports}</div>
                      <div className="stat-footer">
                        <span className="trend-badge up">↑ {stats.monthlyGrowthRate}%</span>
                        <span>vs past 30 days</span>
                      </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Pending Audits</span>
                        <div className="stat-icon-box orange">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                      </div>
                      <div className="stat-value" style={{ color: stats.pendingReports > 0 ? 'var(--warning)' : 'inherit' }}>
                        {stats.pendingReports}
                      </div>
                      <div className="stat-footer">
                        <span>Awaiting reviews</span>
                      </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Approved Decisions</span>
                        <div className="stat-icon-box green">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                      <div className="stat-value">{stats.approvedReports}</div>
                      <div className="stat-footer">
                        <span className="trend-badge up">
                          {stats.totalReports > 0 ? Math.round((stats.approvedReports / stats.totalReports) * 100) : 100}% Approved
                        </span>
                      </div>
                    </div>

                    {/* Stat 4 */}
                    <div className="stat-card">
                      <div className="stat-header">
                        <span className="stat-title">Audited Rejections</span>
                        <div className="stat-icon-box blue" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      </div>
                      <div className="stat-value" style={{ color: 'rgb(239, 68, 68)' }}>
                        {reports.filter(r => r.status === 'Rejected').length}
                      </div>
                      <div className="stat-footer">
                        <span>Awaiting staff edits</span>
                      </div>
                    </div>
                  </section>

                  {/* Modern Analytics Graphs */}
                  <AdminAnalytics reports={reports} />

                  {/* Monthly Targets Analytics */}
                  <MonthlyTargetDashboard />


                  {/* ========================================================
                      REPORT MANAGEMENT (CARDS VIEW)
                      ======================================================== */}
                  <div className="table-card" style={{ marginTop: '24px' }}>
                    
                    {/* Search & Scoping bar */}
                    <div className="table-header-bar">
                      <div className="table-title">Report Management</div>
                      
                      {/* Search & filter items */}
                      <div className="filters-row">
                        
                        {/* Search query box */}
                        <div className="search-input-wrapper">
                          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input 
                            type="text" 
                            placeholder="Filter by keyword, analyst, observations..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>

                        {/* Status Scope selector */}
                        <select 
                          className="filter-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending Audit</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        {/* Region Scope selector */}
                        <select 
                          className="filter-select"
                          value={regionFilter}
                          onChange={(e) => setRegionFilter(e.target.value)}
                        >
                          <option value="All">All Regions</option>
                          <option value="North America">North America</option>
                          <option value="Europe">Europe</option>
                          <option value="Asia Pacific">Asia Pacific</option>
                          <option value="Latin America">Latin America</option>
                        </select>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="data-table-container" style={{ padding: '24px' }}>
                      {filteredReports.length > 0 ? (
                        <div className="report-card-grid">
                          {filteredReports.map((rep) => (
                            <ReportCard 
                              key={rep.id}
                              report={rep}
                              onInspect={handleInspectReport}
                              getStatusBadgeClass={getStatusBadgeClass}
                            />
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                          </svg>
                          <h4>No reports matched your filters</h4>
                          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try widening your text query or resetting search constraints.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </>
              )}
            </>
          )}

          {/* ========================================================
              TAB C: STAFF & PERMISSIONS ACCESS BOARD (ADMIN ONLY)
              ======================================================== */}
          {activeTab === 'staff' && isAdminRole(user.role) && (
            <div className="table-card">
              
              <div className="table-header-bar">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="table-title">Analyst Personnel Access Control</div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Total registered operational agents: {users.length}
                  </span>
                </div>
                <div className="filters-row" style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateUserModal(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create New User
                  </button>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Permission Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((staff) => (
                      <tr key={staff.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={staff.avatar} alt={staff.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ fontWeight: '600' }}>{staff.name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{staff.email}</td>
                        <td>
                          <span className={`badge ${staff.role === 'admin' ? 'approved' : 'pending'}`}>
                            {staff.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${staff.status === 'active' ? 'active' : 'disabled'}`}>
                            {staff.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {staff.id === user.id ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                disabled
                                style={{ padding: '6px 12px', minHeight: '30px', minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, cursor: 'not-allowed' }}
                                title="You cannot disable your own admin account"
                              >
                                Disable
                              </button>
                            ) : (
                              <button
                                className={`btn btn-sm ${staff.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => setUserToToggleStatus(staff)}
                                style={{ padding: '6px 12px', minHeight: '30px', minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {staff.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                            )}

                            {staff.id === user.id ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                disabled
                                style={{ padding: '6px', minHeight: '30px', minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, cursor: 'not-allowed' }}
                                title="You cannot delete your own account"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm rc-btn-delete"
                                onClick={() => setUserToDelete(staff)}
                                style={{ padding: '6px', minHeight: '30px', minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete Staff Member"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB: ADMIN STAFF EXPENSE TRACKER
              ======================================================== */}
          {activeTab === 'staff-expenses' && isAdminRole(user.role) && (
            <AdminExpenseTracker
              reports={reports}
              users={users}
              onInspectReport={handleInspectReport}
            />
          )}

          {/* ========================================================
              TAB: STAFF EXPENSE TRACKER
              ======================================================== */}
          {activeTab === 'expense-tracker' && isStaffRole(user.role) && (
            <ExpenseTracker
              reports={reports.filter((r) => r.staffId === user.id)}
              onInspectReport={handleInspectReport}
            />
          )}

          {/* ========================================================
              TAB F: CREATE / EDIT REPORT FORM INLINE
              ======================================================== */}
          {activeTab === 'create-report' && (
            <div className="table-card" style={{ padding: '0px', background: 'transparent', border: 'none' }}>
              <CreateReportForm 
                reportToEdit={reportToEdit}
                onSuccess={() => { setReportToEdit(null); setActiveTab('dashboard'); }}
                onCancel={() => { setReportToEdit(null); setActiveTab('dashboard'); }}
              />
            </div>
          )}

          {/* ========================================================
              TAB G: CRM ORGANIZATION PROFILES DIRECTORY
              ======================================================== */}
          {activeTab === 'organization-profiles' && (
            <OrganizationProfilesView 
              onInspectReport={handleInspectReport}
            />
          )}


        </main>
      </div>

      {/* ========================================================
          GLOBAL MODAL PORTALS
          ======================================================== */}
      
      {/* A. Report Details Modal */}
      {selectedReport && (
        <ReportModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
          currentUser={user}
        />
      )}



      {/* B. Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal onClose={() => setShowCreateUserModal(false)} />
      )}

      {/* C. Toggle Status Confirmation Modal */}
      {userToToggleStatus && (
        <ToggleStatusModal
          userToToggle={userToToggleStatus}
          onClose={() => setUserToToggleStatus(null)}
        />
      )}

      {/* D. Delete User Modal */}
      {userToDelete && (
        <DeleteUserModal
          userToDelete={userToDelete}
          onClose={() => setUserToDelete(null)}
          onSuccess={showSuccessToast}
          onError={showErrorToast}
        />
      )}

      {/* E. Toast Notifications */}
      {toast && (
        <div className="toast-container">
          <div className={`toast-box ${toast.type}`}>
            <div className={`toast-icon ${toast.type}`}>
              {toast.type === 'success' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => setToast(null)} aria-label="Close notification">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
 