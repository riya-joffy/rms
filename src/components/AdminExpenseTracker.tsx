'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MarketReport, User } from '../types';
import {
  CHART_COLORS,
  formatCurrency,
  formatMonthLabel,
  getMonthKey,
  getReportLabel,
} from '../lib/expenseUtils';
import { isAdminRole } from '../lib/roles';
import { exportToXML, exportToJPG, exportToPDF } from '../lib/expenseExportUtils';

interface AdminExpenseTrackerProps {
  reports: MarketReport[];
  users: User[];
  onInspectReport?: (report: MarketReport) => void;
}

type SortField = 'date' | 'cost' | 'staff';
type SortOrder = 'asc' | 'desc';

export const AdminExpenseTracker: React.FC<AdminExpenseTrackerProps> = ({
  reports,
  users,
  onInspectReport,
}) => {
  const [staffFilter, setStaffFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'XML' | 'JPG' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportStart = async (format: 'PDF' | 'XML' | 'JPG') => {
    setIsExportDropdownOpen(false);
    setExportFormat(format);
    setExportStatus('loading');
    setExportError(null);

    // Artificial premium transition delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      if (format === 'XML') {
        const totals = {
          totalSpent,
          averageCost,
          staffWithExpenses,
          topStaffSpender,
        };
        exportToXML(filteredReports, staffNameById, { staff: staffFilter, month: monthFilter }, totals);
      } else if (format === 'JPG') {
        await exportToJPG('.expense-charts-grid', `staff-expenses-analytics_${new Date().toISOString().slice(0, 10)}.jpg`);
      } else if (format === 'PDF') {
        const totals = {
          totalSpent,
          averageCost,
          staffWithExpenses,
          topStaffSpender,
        };
        await exportToPDF(filteredReports, staffNameById, { staff: staffFilter, month: monthFilter }, totals, '.expense-charts-grid');
      }
      setExportStatus('success');
    } catch (e: any) {
      console.error(e);
      setExportError(e?.message || 'Failed to compile and download export file.');
      setExportStatus('error');
    }
  };

  const staffUsers = useMemo(
    () => users.filter((u) => !isAdminRole(u.role)),
    [users]
  );

  const staffNameById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.name;
    });
    return map;
  }, [users]);

  const submittedReports = useMemo(
    () => reports.filter((r) => r.status !== 'Draft'),
    [reports]
  );

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    submittedReports.forEach((r) => {
      const key = getMonthKey(r.date);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [submittedReports]);

  const filteredReports = useMemo(() => {
    let list = [...submittedReports];

    if (staffFilter !== 'All') {
      list = list.filter((r) => r.staffId === staffFilter);
    }
    if (monthFilter !== 'All') {
      list = list.filter((r) => getMonthKey(r.date) === monthFilter);
    }

    list.sort((a, b) => {
      if (sortField === 'cost') {
        const costA = a.costOfVisit ?? 0;
        const costB = b.costOfVisit ?? 0;
        return sortOrder === 'asc' ? costA - costB : costB - costA;
      }
      if (sortField === 'staff') {
        const nameA = (staffNameById[a.staffId] || a.staffName).toLowerCase();
        const nameB = (staffNameById[b.staffId] || b.staffName).toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [submittedReports, staffFilter, monthFilter, sortField, sortOrder, staffNameById]);

  const reportsWithCost = filteredReports.filter((r) => (r.costOfVisit ?? 0) > 0);
  const totalSpent = reportsWithCost.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0);
  const averageCost = reportsWithCost.length > 0 ? totalSpent / reportsWithCost.length : 0;

  const staffWithExpenses = useMemo(() => {
    const ids = new Set(reportsWithCost.map((r) => r.staffId));
    return ids.size;
  }, [reportsWithCost]);

  const topStaffSpender = useMemo(() => {
    const byStaff: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      byStaff[r.staffId] = (byStaff[r.staffId] ?? 0) + (r.costOfVisit ?? 0);
    });
    const entries = Object.entries(byStaff).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) return null;
    const [staffId, amount] = entries[0];
    return {
      name: staffNameById[staffId] || 'Unknown',
      amount,
    };
  }, [reportsWithCost, staffNameById]);

  const monthlyChartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      const key = getMonthKey(r.date);
      if (!key) return;
      byMonth[key] = (byMonth[key] ?? 0) + (r.costOfVisit ?? 0);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: formatMonthLabel(month),
        total,
      }));
  }, [reportsWithCost]);

  const staffChartData = useMemo(() => {
    const byStaff: Record<string, { name: string; total: number }> = {};
    reportsWithCost.forEach((r) => {
      const name = staffNameById[r.staffId] || r.staffName || 'Unknown';
      if (!byStaff[r.staffId]) {
        byStaff[r.staffId] = { name, total: 0 };
      }
      byStaff[r.staffId].total += r.costOfVisit ?? 0;
    });
    return Object.values(byStaff)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((s) => ({
        name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
        fullName: s.name,
        total: s.total,
      }));
  }, [reportsWithCost, staffNameById]);

  const staffSummary = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    reportsWithCost.forEach((r) => {
      const name = staffNameById[r.staffId] || r.staffName || 'Unknown';
      if (!map[r.staffId]) {
        map[r.staffId] = { name, total: 0, count: 0 };
      }
      map[r.staffId].total += r.costOfVisit ?? 0;
      map[r.staffId].count += 1;
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [reportsWithCost, staffNameById]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'staff' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="expense-tracker">
      <style>{`
        .dropdown-item:hover {
          background-color: HSLA(224, 40%, 12%, 0.8) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Elegant Header and Export Panel */}
      <div className="table-header-bar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-muted)', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Staff Expense Analytics</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Monitor and audit organizational visit costs, marketing expenses, and spending summaries
          </span>
        </div>
        <div className="filters-row" style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            style={{ minWidth: '140px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Data
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                marginLeft: '4px',
                transform: isExportDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition-fast)',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isExportDropdownOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setIsExportDropdownOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
                  zIndex: 100,
                  minWidth: '180px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'background var(--transition-fast)',
                  }}
                  className="dropdown-item"
                  onClick={() => handleExportStart('PDF')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Export as PDF
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    borderTop: '1px solid var(--border-muted)',
                    transition: 'background var(--transition-fast)',
                  }}
                  className="dropdown-item"
                  onClick={() => handleExportStart('XML')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2.5">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Export as XML
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    borderTop: '1px solid var(--border-muted)',
                    transition: 'background var(--transition-fast)',
                  }}
                  className="dropdown-item"
                  onClick={() => handleExportStart('JPG')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Export as JPG
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export Interactive Modal */}
      {exportStatus !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, HSLA(224, 40%, 10%, 0.85), HSLA(224, 40%, 6%, 0.95))',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px',
              maxWidth: '460px',
              width: '90%',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
              animation: 'modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {exportStatus === 'loading' && (
              <>
                <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    style={{ animation: 'spin 1.2s linear infinite' }}
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px' }}>
                    Compiling {exportFormat} Export
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {exportFormat === 'PDF' && 'Rendering charts, compiling ledger tables and structuring executive formatting...'}
                    {exportFormat === 'XML' && 'Parsing expense fields and generating standard readable data structures...'}
                    {exportFormat === 'JPG' && 'Capturing analytics visualizations and rendering high-resolution snapshot...'}
                  </p>
                </div>
              </>
            )}

            {exportStatus === 'success' && (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--success-glow)',
                    border: '2px solid var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px var(--success-glow)',
                    color: 'var(--success)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px', color: 'var(--success-text)' }}>
                    Export Successful!
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Your high-quality {exportFormat} file was generated and downloaded automatically.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setExportStatus('idle')}
                  style={{ width: '100%', marginTop: '8px', borderColor: 'var(--border-muted)' }}
                >
                  Close Window
                </button>
              </>
            )}

            {exportStatus === 'error' && (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--error-glow)',
                    border: '2px solid var(--error)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px var(--error-glow)',
                    color: 'var(--error)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px', color: 'var(--error-text)' }}>
                    Export Failed
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {exportError || 'An error occurred during export compiling.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setExportStatus('idle')}
                    style={{ flex: 1, borderColor: 'var(--border-muted)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => exportFormat && handleExportStart(exportFormat)}
                    style={{ flex: 1 }}
                  >
                    Retry Export
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Staff Spending</span>
            <div className="stat-icon-box purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatCurrency(totalSpent)}</div>
          <div className="stat-footer">
            <span>{reportsWithCost.length} expense report{reportsWithCost.length !== 1 ? 's' : ''} in view</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Staff With Expenses</span>
            <div className="stat-icon-box blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{staffWithExpenses}</div>
          <div className="stat-footer">
            <span>Of {staffUsers.length} registered staff</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Average / Report</span>
            <div className="stat-icon-box green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatCurrency(averageCost)}</div>
          <div className="stat-footer">
            <span>Mean visit cost in filter</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Top Spender</span>
            <div className="stat-icon-box orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {topStaffSpender ? topStaffSpender.name.split(' ')[0] : '—'}
          </div>
          <div className="stat-footer">
            <span>{topStaffSpender ? formatCurrency(topStaffSpender.amount) : 'No data yet'}</span>
          </div>
        </div>
      </section>

      {staffSummary.length > 0 && (
        <div className="table-card" style={{ marginBottom: '24px' }}>
          <div className="table-header-bar">
            <div className="table-title">Spending by staff member</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '24px' }}>
            {staffSummary.map((staff, i) => (
              <button
                key={staff.id}
                type="button"
                className="stat-card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: staffFilter === staff.id ? 'var(--primary)' : undefined,
                }}
                onClick={() => setStaffFilter(staffFilter === staff.id ? 'All' : staff.id)}
              >
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>{staff.name}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                  {formatCurrency(staff.total)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {staff.count} report{staff.count !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="expense-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Monthly team spending</h3>
              <p>Combined visit costs across all staff</p>
            </div>
          </div>
          {monthlyChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {monthlyChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No expense data for the selected filters.</p>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Spending by staff</h3>
              <p>Total visit costs per team member</p>
            </div>
          </div>
          {staffChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={staffChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Total spent']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="total" fill="var(--info)" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No staff expense data for the selected filters.</p>
            </div>
          )}
        </div>
      </div>

      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-bar">
          <div className="table-title">All staff report expenses</div>
          <div className="filters-row">
            <select
              className="filter-select"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              aria-label="Filter by staff"
            >
              <option value="All">All staff</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter by month"
            >
              <option value="All">All months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
              aria-label="Sort expenses"
            >
              <option value="cost-desc">Highest cost</option>
              <option value="cost-asc">Lowest cost</option>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="staff-asc">Staff A–Z</option>
              <option value="staff-desc">Staff Z–A</option>
            </select>
          </div>
        </div>

        <div className="data-table-container">
          {filteredReports.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSort('staff')}
                    title="Sort by staff"
                  >
                    Staff {sortField === 'staff' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th>Activity</th>
                  <th>Location</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSort('date')}
                    title="Sort by date"
                  >
                    Date {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th>Status</th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => toggleSort('cost')}
                    title="Sort by cost"
                  >
                    Cost {sortField === 'cost' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{report.id}</td>
                    <td style={{ fontWeight: '600' }}>
                      {staffNameById[report.staffId] || report.staffName}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{getReportLabel(report)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{report.activityType}</div>
                    </td>
                    <td>{report.location || '—'}</td>
                    <td>{report.date}</td>
                    <td>
                      <span
                        className={
                          report.status === 'Approved'
                            ? 'badge approved'
                            : report.status === 'Rejected'
                              ? 'badge rejected'
                              : 'badge pending'
                        }
                      >
                        {report.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                      {(report.costOfVisit ?? 0) > 0 ? (
                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(report.costOfVisit!)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {onInspectReport && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onInspectReport(report)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ fontWeight: '700', padding: '16px 24px' }}>
                    Filtered total ({filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''})
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '800',
                      color: 'var(--primary)',
                      padding: '16px 24px',
                    }}
                  >
                    {formatCurrency(filteredReports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h4>No staff expenses found</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Expenses appear when staff submit reports with a visit cost.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
