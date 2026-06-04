'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { dbService, isFirebaseActive } from '../lib/firebase/db';
import { MonthlyTargetItem, MarketReport } from '../types';
import { isAdminRole } from '../lib/roles';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/firebase';

export const MonthlyTargetDashboard: React.FC = () => {
  const { user } = useAuth();
  const { reports: contextReports } = useReports();
  const isAdmin = isAdminRole(user?.role);

  // Target States
  const [hospitalTargets, setHospitalTargets] = useState<MonthlyTargetItem[]>([]);
  const [instituteTargets, setInstituteTargets] = useState<MonthlyTargetItem[]>([]);
  const [allReports, setAllReports] = useState<MarketReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingMonth, setIsCreatingMonth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Value Buffers (tracks local changes before save)
  const [hospitalEdits, setHospitalEdits] = useState<Record<string, Partial<MonthlyTargetItem>>>({});
  const [instituteEdits, setInstituteEdits] = useState<Record<string, Partial<MonthlyTargetItem>>>({});

  // Async indicators
  const [savingId, setSavingId] = useState<string | null>(null);

  // Alerts & Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to format date into "Jun 2026"
  const getCurrentMonthStr = () => {
    const date = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const isHospitalReport = (report: MarketReport) => {
    const activityTypeLower = (report.activityType || '').toLowerCase();
    return activityTypeLower.includes('hospital') || 
           report.meetingType === 'Hospital' || 
           !!report.hospitalName;
  };

  const matchMonthYear = (reportDate: string, targetMonthStr: string) => {
    if (!reportDate || !targetMonthStr) return false;
    const parts = reportDate.split('-');
    if (parts.length < 2) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = months[month - 1];
    const targetParts = targetMonthStr.trim().split(/\s+/);
    if (targetParts.length !== 2) return false;
    return monthLabel === targetParts[0] && year === parseInt(targetParts[1], 10);
  };

  const countAchieved = (reportsList: MarketReport[], monthStr: string, isHospital: boolean) => {
    return reportsList.filter(report => {
      if (report.status === 'Draft') return false;
      if (!matchMonthYear(report.date, monthStr)) return false;
      const isHosp = isHospitalReport(report);
      return isHospital ? isHosp : !isHosp;
    }).length;
  };

  // Real-time listener for reports
  useEffect(() => {
    if (!isFirebaseActive()) {
      setAllReports(dbService.getReports());
      return;
    }

    const unsub = onSnapshot(collection(db, 'reports'), (snap) => {
      const items = snap.docs.map(doc => {
        const data = doc.data() as MarketReport;
        return {
          ...data,
          id: doc.id
        };
      });
      setAllReports(items);
    }, (err) => {
      console.error('Failed to sync live reports for targets:', err);
    });

    return unsub;
  }, []);

  // Sync reports from context when Firebase is not active
  useEffect(() => {
    if (!isFirebaseActive()) {
      setAllReports(dbService.getReports());
    }
  }, [contextReports]);

  // Subscribe to both target lists in real time
  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubHospital = dbService.subscribeHospitalTargets((allHospTargets) => {
        setHospitalTargets(allHospTargets);
      });

      const unsubInstitute = dbService.subscribeInstituteTargets((allInstTargets) => {
        setInstituteTargets(allInstTargets);
        setLoading(false);
      });

      return () => {
        unsubHospital();
        unsubInstitute();
      };
    } catch (err: any) {
      console.error('Failed to load monthly targets subscription:', err);
      setError('Failed to configure targets data sync.');
      setLoading(false);
    }
  }, []);

  // Auto-create current month target documents if they do not exist
  useEffect(() => {
    if (loading || isCreatingMonth) return;

    const currentMonth = getCurrentMonthStr();
    const hasHospitalMonth = hospitalTargets.some(t => t.month === currentMonth);
    const hasInstituteMonth = instituteTargets.some(t => t.month === currentMonth);

    if (!hasHospitalMonth || !hasInstituteMonth) {
      const createCurrentMonthDocs = async () => {
        setIsCreatingMonth(true);
        try {
          const currentHospAchieved = countAchieved(allReports, currentMonth, true);
          const currentInstAchieved = countAchieved(allReports, currentMonth, false);

          if (!hasHospitalMonth) {
            await dbService.addHospitalTarget({
              month: currentMonth,
              target: 0,
              achievedPersons: currentHospAchieved
            });
          }
          if (!hasInstituteMonth) {
            await dbService.addInstituteTarget({
              month: currentMonth,
              target: 0,
              achievedPersons: currentInstAchieved
            });
          }

          if (!isFirebaseActive()) {
            setHospitalTargets(dbService.getHospitalTargets());
            setInstituteTargets(dbService.getInstituteTargets());
          }
        } catch (err) {
          console.error("Failed to auto-create current month targets:", err);
        } finally {
          setIsCreatingMonth(false);
        }
      };
      createCurrentMonthDocs();
    }
  }, [loading, hospitalTargets, instituteTargets, allReports, isCreatingMonth]);

  // Self-stabilizing synchronization of calculated achieved count with Firestore documents
  useEffect(() => {
    if (loading || isCreatingMonth) return;

    const syncAchievedCounts = async () => {
      // Check hospital targets
      for (const target of hospitalTargets) {
        const computed = countAchieved(allReports, target.month, true);
        if (target.achievedPersons !== computed) {
          try {
            await dbService.updateHospitalTarget(target.id, {
              achievedPersons: computed
            });
          } catch (err) {
            console.error(`Failed to sync achieved count for hospital target ${target.month}:`, err);
          }
        }
      }

      // Check institute targets
      for (const target of instituteTargets) {
        const computed = countAchieved(allReports, target.month, false);
        if (target.achievedPersons !== computed) {
          try {
            await dbService.updateInstituteTarget(target.id, {
              achievedPersons: computed
            });
          } catch (err) {
            console.error(`Failed to sync achieved count for institute target ${target.month}:`, err);
          }
        }
      }

      if (!isFirebaseActive()) {
        setHospitalTargets(dbService.getHospitalTargets());
        setInstituteTargets(dbService.getInstituteTargets());
      }
    };

    syncAchievedCounts();
  }, [hospitalTargets, instituteTargets, allReports, loading, isCreatingMonth]);

  // Sort Months Descending Helper ("May 2026" > "Apr 2026")
  const parseMonthYear = (monthStr: string) => {
    if (!monthStr) return 0;
    const parts = monthStr.trim().split(/\s+/);
    if (parts.length !== 2) return 0;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.findIndex(m => parts[0].toLowerCase().startsWith(m));
    const year = parseInt(parts[1], 10) || 0;
    return year * 12 + (mIdx >= 0 ? mIdx : 0);
  };

  const sortedHospitalTargets = useMemo(() => {
    return [...hospitalTargets].sort((a, b) => parseMonthYear(b.month) - parseMonthYear(a.month));
  }, [hospitalTargets]);

  const sortedInstituteTargets = useMemo(() => {
    return [...instituteTargets].sort((a, b) => parseMonthYear(b.month) - parseMonthYear(a.month));
  }, [instituteTargets]);

  // Input Field Change Handlers
  const handleHospFieldChange = (id: string, val: string) => {
    const num = val === '' ? 0 : Number(val);
    setHospitalEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        target: num
      }
    }));
  };

  const handleInstFieldChange = (id: string, val: string) => {
    const num = val === '' ? 0 : Number(val);
    setInstituteEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        target: num
      }
    }));
  };

  // Target Row Save Handlers
  const handleSaveHospitalTarget = async (id: string, original: MonthlyTargetItem) => {
    const edits = hospitalEdits[id];
    if (!edits || edits.target === undefined) return;

    const targetVal = edits.target;

    if (targetVal < 0) {
      setToast({ message: 'Target values cannot be negative.', type: 'error' });
      return;
    }

    setSavingId(id);
    try {
      await dbService.updateHospitalTarget(id, {
        target: targetVal
      });

      setHospitalEdits(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setToast({ message: 'Hospital monthly target updated.', type: 'success' });
      if (!isFirebaseActive()) {
        setHospitalTargets(dbService.getHospitalTargets());
      }
    } catch (e: any) {
      setToast({ message: e.message || 'Save failed.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveInstituteTarget = async (id: string, original: MonthlyTargetItem) => {
    const edits = instituteEdits[id];
    if (!edits || edits.target === undefined) return;

    const targetVal = edits.target;

    if (targetVal < 0) {
      setToast({ message: 'Target values cannot be negative.', type: 'error' });
      return;
    }

    setSavingId(id);
    try {
      await dbService.updateInstituteTarget(id, {
        target: targetVal
      });

      setInstituteEdits(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setToast({ message: 'Institute monthly target updated.', type: 'success' });
      if (!isFirebaseActive()) {
        setInstituteTargets(dbService.getInstituteTargets());
      }
    } catch (e: any) {
      setToast({ message: e.message || 'Save failed.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
    type: 'hospital' | 'institute',
    original: MonthlyTargetItem
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'hospital') {
        handleSaveHospitalTarget(id, original);
      } else {
        handleSaveInstituteTarget(id, original);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', gap: '12px' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Synchronizing monthly metrics...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', marginTop: '8px' }}>
      
      {error && (
        <div style={{ color: 'var(--error-text)', backgroundColor: 'var(--error-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Table A: Hospital Monthly Target */}
        <div className="table-card">
          <div className="table-header-bar" style={{ padding: '18px 24px' }}>
            <div>
              <div className="table-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgb(6, 182, 212)' }} />
                Hospital Monthly Targets
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Manage monthly target ratios (Press Enter to Save).' : 'View monthly goals and achieve rates.'}
              </span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>Month</th>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>Monthly Target</th>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>No. of Persons Achieved</th>
                </tr>
              </thead>
              <tbody>
                {sortedHospitalTargets.map((row) => {
                  const edits = hospitalEdits[row.id] || {};
                  const targetVal = edits.target !== undefined ? edits.target : row.target;
                  const achievedVal = row.achievedPersons;

                  return (
                    <tr key={row.id}>
                      <td style={{ padding: '12px 20px', fontWeight: '600' }}>{row.month}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {isAdmin ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              value={targetVal}
                              onChange={(e) => handleHospFieldChange(row.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, row.id, 'hospital', row)}
                              disabled={savingId === row.id}
                              style={{ width: '90px', padding: '6px 10px', fontSize: '0.85rem' }}
                            />
                            {savingId === row.id && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
                                <path d="M12 2a10 10 0 0 1 10 10" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontWeight: '500' }}>{row.target}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={achievedVal}
                          readOnly
                          disabled
                          style={{
                            width: '90px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-muted)',
                            cursor: 'not-allowed',
                            opacity: 0.7
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table B: Institute Monthly Target */}
        <div className="table-card">
          <div className="table-header-bar" style={{ padding: '18px 24px' }}>
            <div>
              <div className="table-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Institute Monthly Targets
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Manage monthly target ratios (Press Enter to Save).' : 'View monthly goals and achieve rates.'}
              </span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>Month</th>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>Monthly Target</th>
                  <th style={{ padding: '12px 20px', fontSize: '0.75rem' }}>No. of Persons Achieved</th>
                </tr>
              </thead>
              <tbody>
                {sortedInstituteTargets.map((row) => {
                  const edits = instituteEdits[row.id] || {};
                  const targetVal = edits.target !== undefined ? edits.target : row.target;
                  const achievedVal = row.achievedPersons;

                  return (
                    <tr key={row.id}>
                      <td style={{ padding: '12px 20px', fontWeight: '600' }}>{row.month}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {isAdmin ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              value={targetVal}
                              onChange={(e) => handleInstFieldChange(row.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, row.id, 'institute', row)}
                              disabled={savingId === row.id}
                              style={{ width: '90px', padding: '6px 10px', fontSize: '0.85rem' }}
                            />
                            {savingId === row.id && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
                                <path d="M12 2a10 10 0 0 1 10 10" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontWeight: '500' }}>{row.target}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={achievedVal}
                          readOnly
                          disabled
                          style={{
                            width: '90px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-muted)',
                            cursor: 'not-allowed',
                            opacity: 0.7
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Local Toast Notification Portal */}
      {toast && (
        <div className="toast-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
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
};
