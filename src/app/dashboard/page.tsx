'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/Navbar';
import { SVGCharts } from '../../components/SVGCharts';
import { ReportModal } from '../../components/ReportModal';
import { CreateReportForm } from '../../components/CreateReportForm';
import { MarketReport } from '../../types';

export default function DashboardPage() {
  const { user, users, toggleUserStatus, loading: authLoading } = useAuth();
  const { reports, logs, notifications, stats, loading: reportsLoading, markNotifAsRead, markAllNotifsAsRead } = useReports();
  const router = useRouter();

  // Tab State: 'dashboard' | 'reports' | 'staff' | 'notifications' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search & Filter States for Report Table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  // Modal States
  const [selectedReport, setSelectedReport] = useState<MarketReport | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);

  // Verification redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
      rep.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.observations.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'All' || rep.status === statusFilter;
    const matchCategory = categoryFilter === 'All' || rep.category === categoryFilter;
    const matchRegion = regionFilter === 'All' || rep.region === regionFilter;

    return matchSearch && matchStatus && matchCategory && matchRegion;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'badge approved';
      case 'Rejected': return 'badge rejected';
      default: return 'badge pending';
    }
  };

  const handleInspectReport = (report: MarketReport) => {
    setSelectedReport(report);
  };

  const handleInspectReportById = (id: string) => {
    const rep = reports.find(r => r.id === id);
    if (rep) {
      setSelectedReport(rep);
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
              {/* Telemetry Stats Cards Grid */}
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
                    <span className="stat-title">Average CSAT Rating</span>
                    <div className="stat-icon-box blue">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="stat-value">{stats.averageSatisfaction} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 5</span></div>
                  <div className="stat-footer">
                    <span>Customer experience index</span>
                  </div>
                </div>

              </section>

              {/* Vector SVG Charts */}
              <SVGCharts />

              {/* Dashboard Layout Row: Quick Staff Buttons (for staff) + System Audit Logs (both) */}
              <div className="analytics-section">
                
                {/* Left panel: Quick Actions or Short table */}
                <div className="chart-card" style={{ gap: '16px' }}>
                  <div className="chart-card-header" style={{ marginBottom: 0 }}>
                    <div className="chart-card-title">
                      <h3>Analyst Actions Quick Access</h3>
                      <p>Jump to core actions or pending submissions</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {user.role === 'staff' ? (
                      <>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setCreateFormOpen(true)}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Compile New Market Report
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => { setActiveTab('reports'); setStatusFilter('Pending'); }}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Review My Submitted Reports
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary"
                          onClick={() => { setActiveTab('reports'); setStatusFilter('Pending'); }}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Inspect Pending Audits ({stats.pendingReports})
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('staff')}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Configure Staff Permission Policies
                        </button>
                      </>
                    )}
                  </div>

                  {/* Short pending items list */}
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Recent Localized Activity Feed
                    </h4>
                    <div className="activity-list">
                      {reports.slice(0, 3).map(r => (
                        <div 
                          key={r.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            padding: '10px', 
                            backgroundColor: 'var(--bg-sidebar)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-muted)',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleInspectReport(r)}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{r.id}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {r.staffName} ({r.region})</span>
                          </div>
                          <span className={getStatusBadgeClass(r.status)} style={{ height: 'fit-content' }}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right panel: System Audit logs feed */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div className="chart-card-title">
                      <h3>System Audit & submissions log</h3>
                      <p>Immutable operational chronology tracker</p>
                    </div>
                  </div>

                  <div className="activity-list" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '8px' }}>
                    {logs.slice(0, 8).map(log => (
                      <div className="activity-item" key={log.id}>
                        <div className={`activity-dot ${
                          log.action.includes('Approved') || log.action.includes('Active') ? 'success' :
                          log.action.includes('Rejected') || log.action.includes('Suspended') ? 'error' : 
                          log.action.includes('Logged In') ? 'warning' : ''
                        }`} />
                        <div className="activity-details">
                          <span className="activity-text">
                            <strong>{log.userName}</strong> ({log.userRole}): {log.details}
                          </span>
                          <span className="activity-time">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ========================================================
              TAB B: REPORTS REGISTRY TABLE VIEW
              ======================================================== */}
          {activeTab === 'reports' && (
            <div className="table-card">
              
              {/* Search & Scoping bar */}
              <div className="table-header-bar">
                <div className="table-title">Intelligence Registry Matrices</div>
                
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

                  {/* Category Scope selector */}
                  <select 
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Competitor Intelligence">Competitor Intelligence</option>
                    <option value="Consumer Trends">Consumer Trends</option>
                    <option value="Pricing Analysis">Pricing Analysis</option>
                    <option value="Inventory & Supply">Inventory & Supply</option>
                    <option value="Promotional Tracking">Promotional Tracking</option>
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

                  {/* New Report Trigger (Staff Mode) */}
                  {user.role === 'staff' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => setCreateFormOpen(true)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Report
                    </button>
                  )}

                </div>
              </div>

              {/* Data Table */}
              <div className="data-table-container">
                {filteredReports.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Report ID</th>
                        <th>Region</th>
                        <th>Category</th>
                        <th>Submitting Analyst</th>
                        <th>Submitted Date</th>
                        <th>Est. Volume</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((rep) => (
                        <tr key={rep.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{rep.id}</td>
                          <td>{rep.region}</td>
                          <td>{rep.category}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>{rep.staffName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.department}</span>
                            </div>
                          </td>
                          <td>{rep.date} @ {rep.time}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            ${rep.metrics?.salesVolume?.toLocaleString() || '0'}
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(rep.status)}>{rep.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleInspectReport(rep)}
                            >
                              Inspect Details
                            </button>
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
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <h4>No reports matched your filters</h4>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try widening your text query or resetting search constraints.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              TAB C: STAFF & PERMISSIONS ACCESS BOARD (ADMIN ONLY)
              ======================================================== */}
          {activeTab === 'staff' && user.role === 'admin' && (
            <div className="table-card">
              
              <div className="table-header-bar">
                <div className="table-title">Analyst Personnel Access Control</div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total registered operational agents: {users.length}
                </span>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Assigned Department</th>
                      <th>Active Region Focus</th>
                      <th>Permission Status</th>
                      <th>Last Active Timestamp</th>
                      <th style={{ textAlign: 'right' }}>Security Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((staff) => (
                      <tr key={staff.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{staff.id}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={staff.avatar} alt={staff.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ fontWeight: '600' }}>{staff.name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{staff.email}</td>
                        <td>{staff.department}</td>
                        <td>{staff.region || 'All Markets'}</td>
                        <td>
                          <span className={`badge ${staff.status === 'active' ? 'active' : 'suspended'}`}>
                            {staff.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {staff.lastActive ? new Date(staff.lastActive).toLocaleString() : 'Never logged in'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {staff.role === 'admin' ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Immutable Admin</span>
                          ) : (
                            <button 
                              className={`btn btn-sm ${staff.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                              onClick={() => toggleUserStatus(staff.id)}
                            >
                              {staff.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB D: NOTIFICATIONS VIEWS
              ======================================================== */}
          {activeTab === 'notifications' && (
            <div className="table-card" style={{ padding: '32px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 className="table-title">Historical System & Review Notifications</h3>
                {notifications.filter(n => !n.read).length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={markAllNotifsAsRead}>
                    Mark all notifications as read
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notification-row ${notif.read ? '' : 'unread'}`}
                      style={{ cursor: notif.reportId ? 'pointer' : 'default' }}
                      onClick={() => notif.reportId && handleInspectReportById(notif.reportId)}
                    >
                      <div className={`notification-icon-box ${notif.type}`}>
                        {notif.type === 'success' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {notif.type === 'error' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        {notif.type === 'info' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                      </div>

                      <div className="notification-details">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="notification-title">{notif.title}</span>
                          {!notif.read && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                              onClick={(e) => { e.stopPropagation(); markNotifAsRead(notif.id); }}
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <p className="notification-msg">{notif.message}</p>
                        <span className="notification-time">{new Date(notif.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <h4>Your alerts inbox is clear</h4>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>We'll notify you here when reports get reviewed, compiled, or accounts change.</p>
                </div>
              )}

            </div>
          )}

          {/* ========================================================
              TAB E: SYSTEM & PREFERENCES SETTINGS
              ======================================================== */}
          {activeTab === 'settings' && (
            <div className="settings-container">
              
              <div className="settings-menu">
                <div className="settings-menu-item active">Account Profile</div>
                <div className="settings-menu-item">System Integrations</div>
                <div className="settings-menu-item">Email Notifications</div>
                <div className="settings-menu-item">Privacy & Audits</div>
              </div>

              <div className="settings-panel">
                <h3 className="settings-section-title">Public Analyst Profile</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <img src={user.avatar} alt={user.name} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--primary-glow)', objectFit: 'cover' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{user.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Role: {user.role} Analyst</span>
                    <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600' }}>Department: {user.department}</span>
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">System Account ID</label>
                    <input type="text" className="form-input" value={user.id} readOnly style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auth Email Address</label>
                    <input type="email" className="form-input" value={user.email} readOnly style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Region Focus</label>
                    <input type="text" className="form-input" value={user.region || 'All Markets Global'} readOnly style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Clearance Level</label>
                    <input type="text" className="form-input" value={user.role === 'admin' ? 'Level 5 (Admin Control)' : 'Level 2 (Analyst Write)'} readOnly style={{ opacity: 0.6 }} />
                  </div>
                </div>

                <h3 className="settings-section-title" style={{ marginTop: '24px' }}>Future Firebase backend integration</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '8px' }}>This front-end skeleton incorporates centralized React Context interfaces, pre-coded API wrappers inside <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>src/lib/firebase/*</code> and JSON schemas ready to integrate with Firestore collections and Firebase Authentication.</p>
                  <p>When ready to deploy, switch the Firestore driver config in the library subfolder and uncomment the authentication token check inside the middleware routes.</p>
                </div>
              </div>

            </div>
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

      {/* B. Report Compilation Form Modal */}
      {createFormOpen && (
        <div className="modal-backdrop" onClick={() => setCreateFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px' }}>
            <div className="modal-header">
              <span className="modal-title">Compile Market Intelligence Report</span>
              <button className="modal-close-btn" onClick={() => setCreateFormOpen(false)} aria-label="Cancel Compilation">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <CreateReportForm 
                onSuccess={() => { setCreateFormOpen(false); setActiveTab('reports'); }} 
                onCancel={() => setCreateFormOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
