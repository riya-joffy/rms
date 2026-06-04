'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { isAdminRole } from '../lib/roles';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'create-report':
        return 'Create Report';
      case 'staff':
        return 'Team Directory';
      case 'staff-expenses':
        return 'Staff Expenses';
      case 'expense-tracker':
        return 'Expense Tracker';
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
      case 'create-report':
        return 'Compile and submit institutional activity reports.';
      case 'staff':
        return 'View and manage operational staff clearances.';
      case 'staff-expenses':
        return 'Track visit costs and spending trends across all staff members.';
      case 'expense-tracker':
        return 'Track visit costs, spending trends, and report expenses.';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={user.avatar}
            alt={user.name}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--primary-glow)',
              objectFit: 'cover',
            }}
          />
          <div
            style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', lineHeight: '1.2' }}
            className="user-info"
          >
            <span style={{ fontWeight: '700' }}>{displayName}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{user.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
