'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MarketReport, ActivityLog, Notification, DashboardStats, Attachment } from '../types';
import { dbService } from '../lib/firebase/db';
import { useAuth } from './AuthContext';

interface ReportContextType {
  reports: MarketReport[];
  logs: ActivityLog[];
  notifications: Notification[];
  stats: DashboardStats;
  loading: boolean;
  createReport: (reportData: Omit<MarketReport, 'id' | 'history' | 'feedback' | 'staffId' | 'staffName' | 'department'> & { id?: string; status?: 'Pending' | 'Draft' }) => void;
  reviewReport: (reportId: string, status: 'Approved' | 'Rejected', feedback: string) => void;
  markNotifAsRead: (id: string) => void;
  markAllNotifsAsRead: () => void;
  refreshAllData: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<MarketReport[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    activeStaffCount: 0,
    monthlyGrowthRate: 0,
    averageSatisfaction: 0
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const allReports = dbService.getReports();
      const visibleReports = user?.role === 'admin'
        ? allReports
        : allReports.filter(report => report.staffId === user?.id);
      const allLogs = dbService.getLogs();
      const userNotifs = dbService.getNotifications(user?.id || undefined);
      const computedStats = dbService.getDashboardStats();

      setReports(visibleReports);
      setLogs(allLogs);
      setNotifications(userNotifs);
      setStats(computedStats);
    } catch (err) {
      console.error("Error loading mock database content:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data initially and whenever the active user session changes
  useEffect(() => {
    loadData();
  }, [user, loadData]);

  const createReport = (
    reportData: Omit<MarketReport, 'id' | 'history' | 'feedback' | 'staffId' | 'staffName' | 'department'> & { id?: string; status?: 'Pending' | 'Draft' }
  ) => {
    if (!user) return;

    // Extend report data with current logged in staff credentials
    const submissionData = {
      ...reportData,
      staffId: user.id,
      staffName: user.name,
      department: user.department,
    };

    dbService.addReport(submissionData, user.name);
    loadData(); // Re-trigger local storage synchronizer
  };

  const reviewReport = (reportId: string, status: 'Approved' | 'Rejected', feedback: string) => {
    if (!user || user.role !== 'admin') return;

    dbService.updateReportStatus(reportId, status, feedback, user.id, user.name);
    loadData(); // Sync states
  };

  const markNotifAsRead = (id: string) => {
    dbService.markNotificationAsRead(id);
    loadData(); // Sync states
  };

  const markAllNotifsAsRead = () => {
    if (!user) return;
    dbService.markAllNotificationsAsRead(user.id);
    loadData(); // Sync states
  };

  const refreshAllData = () => {
    loadData();
  };

  return (
    <ReportContext.Provider
      value={{
        reports,
        logs,
        notifications,
        stats,
        loading,
        createReport,
        reviewReport,
        markNotifAsRead,
        markAllNotifsAsRead,
        refreshAllData
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

export const useReports = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
};
