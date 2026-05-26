'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MarketReport, ActivityLog, DashboardStats, Organization } from '../types';
import { dbService, isFirebaseActive } from '../lib/firebase/db';
import { useAuth } from './AuthContext';
import { isAdminRole } from '../lib/roles';

interface ReportContextType {
  reports: MarketReport[];
  logs: ActivityLog[];
  stats: DashboardStats;
  organizations: Organization[];
  loading: boolean;
  createReport: (
    reportData: Omit<MarketReport, 'id' | 'history' | 'feedback' | 'staffId' | 'staffName' | 'department'> & {
      id?: string;
      status?: 'Pending' | 'Draft';
    }
  ) => Promise<void>;
  reviewReport: (reportId: string, status: 'Approved' | 'Rejected', feedback: string) => void;
  refreshAllData: () => void;
  addOrganization: (orgData: Omit<Organization, 'id'>) => Promise<Organization | void>;
  updateOrganization: (orgId: string, orgData: Partial<Organization>) => Promise<void>;
  deleteOrganization: (orgId: string) => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<MarketReport[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    activeStaffCount: 0,
    monthlyGrowthRate: 0,
    averageSatisfaction: 0,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const applyVisibleReports = useCallback(
    (allReports: MarketReport[]) => {
      const visibleReports = isAdminRole(user?.role)
        ? allReports
        : allReports.filter((report) => report.staffId === user?.id);
      setReports(visibleReports);
      setStats(dbService.getDashboardStats());
    },
    [user]
  );

  const loadLocalData = useCallback(() => {
    try {
      applyVisibleReports(dbService.getReports());
      setLogs(dbService.getLogs());
      setOrganizations(dbService.getOrganizations());
    } catch (err) {
      console.error('Error loading local database content:', err);
    } finally {
      setLoading(false);
    }
  }, [applyVisibleReports]);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseActive()) {
      loadLocalData();
      return;
    }

    setLoading(true);

    const unsubscribe = dbService.syncLiveCollections(
      (allReports) => {
        applyVisibleReports(allReports);
        setLoading(false);
      },
      () => {
        setStats(dbService.getDashboardStats());
      },
      (allLogs) => {
        setLogs(allLogs);
      },
      (allOrgs) => {
        setOrganizations(allOrgs);
      }
    );

    return unsubscribe;
  }, [user, loadLocalData, applyVisibleReports]);

  const createReport = async (
    reportData: Omit<MarketReport, 'id' | 'history' | 'feedback' | 'staffId' | 'staffName' | 'department'> & {
      id?: string;
      status?: 'Pending' | 'Draft';
    }
  ) => {
    if (!user) return;

    const submissionData = {
      ...reportData,
      staffId: user.id,
      staffName: user.name,
      department: user.department,
    };

    await dbService.addReport(submissionData, user.name);

    if (!isFirebaseActive()) {
      loadLocalData();
    }
  };

  const reviewReport = (reportId: string, status: 'Approved' | 'Rejected', feedback: string) => {
    if (!user || !isAdminRole(user.role)) return;

    dbService.updateReportStatus(reportId, status, feedback, user.id, user.name);

    if (!isFirebaseActive()) {
      loadLocalData();
    }
  };

  const refreshAllData = () => {
    loadLocalData();
  };

  const addOrganization = async (orgData: Omit<Organization, 'id'>) => {
    try {
      const newOrg = await dbService.addOrganization(orgData);
      if (!isFirebaseActive()) {
        loadLocalData();
      }
      return newOrg;
    } catch (e) {
      console.error('Error adding organization:', e);
    }
  };

  const updateOrganization = async (orgId: string, orgData: Partial<Organization>) => {
    try {
      await dbService.updateOrganization(orgId, orgData);
      if (!isFirebaseActive()) {
        loadLocalData();
      }
    } catch (e) {
      console.error('Error updating organization:', e);
    }
  };

  const deleteOrganization = async (orgId: string) => {
    try {
      await dbService.deleteOrganization(orgId);
      if (!isFirebaseActive()) {
        loadLocalData();
      }
    } catch (e) {
      console.error('Error deleting organization:', e);
    }
  };

  return (
    <ReportContext.Provider
      value={{
        reports,
        logs,
        stats,
        organizations,
        loading,
        createReport,
        reviewReport,
        refreshAllData,
        addOrganization,
        updateOrganization,
        deleteOrganization,
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
