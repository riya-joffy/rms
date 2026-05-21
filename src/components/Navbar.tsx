'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const { notifications } = useReports();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'reports':
        return 'Review Reports';
      case 'create-report':
        return 'Create Report';
      case 'staff':
        return 'Team Directory';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'Report Management System';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return `Welcome back, ${user?.name}! Here’s your operational dashboard.`;
      case 'reports':
        return 'Inspect and audit institutional submissions.';
      case 'create-report':
        return 'Compile and submit institutional activity reports.';
      case 'staff':
        return 'View and manage operational staff clearances.';
      case 'notifications':
        return 'See your latest alerts and review notifications.';
      case 'settings':
        return 'Update your analyst profile and system configurations.';
      default:
        return '';
    }
  };

  if (!user) return null;

  const displayName = user.name ? user.name.split(' ')[0] : 'User';

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Hamburger Menu on Mobile */}
        <button 
          className="mobile-nav-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Navigation Sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="nav-welcome">
          <h1>{getPageTitle()}</h1>
          <p>{getPageSubtitle()}</p>
        </div>
      </div>

      <div className="nav-actions">
        {/* Shortcut Notifications Button */}
        <button 
          className="nav-btn" 
          onClick={() => setActiveTab('notifications')}
          aria-label="View Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="nav-btn-badge">{unreadCount}</span>}
        </button>

        {/* Quick User Avatar Badge */}
        <div 
          onClick={() => setActiveTab('settings')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <img 
            src={user.avatar} 
            alt={user.name} 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--primary-glow)',
              objectFit: 'cover'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', lineHeight: '1.2' }} className="user-info">
            <span style={{ fontWeight: '700' }}>{displayName}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{user.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
