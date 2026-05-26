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
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { MarketReport } from '../types';
import { exportToXML, exportToJPG, exportToPDF } from '../lib/expenseExportUtils';

interface ExpenseTrackerProps {
  reports: MarketReport[];
  onInspectReport?: (report: MarketReport) => void;
}

type SortField = 'date' | 'cost';
type SortOrder = 'asc' | 'desc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CHART_COLORS = ['#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const getReportLabel = (report: MarketReport) =>
  report.institutionName || report.hospitalName || report.conferenceName || report.activityType;

const getMonthKey = (dateStr: string) => {
  const [year, month] = dateStr.split('-');
  if (!year || !month) return '';
  return `${year}-${month}`;
};

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx] ?? month} ${year}`;
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ reports, onInspectReport }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Export Panel UI State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'XML' | 'JPG' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

  // Date Range overrides Month Filter if active
  const filteredReports = useMemo(() => {
    let list = [...submittedReports];
    
    if (fromDate || toDate) {
      list = list.filter((r) => {
        const matchFrom = !fromDate || r.date >= fromDate;
        const matchTo = !toDate || r.date <= toDate;
        return matchFrom && matchTo;
      });
    } else if (monthFilter !== 'All') {
      list = list.filter((r) => getMonthKey(r.date) === monthFilter);
    }

    list.sort((a, b) => {
      if (sortField === 'cost') {
        const costA = a.costOfVisit ?? 0;
        const costB = b.costOfVisit ?? 0;
        return sortOrder === 'asc' ? costA - costB : costB - costA;
      }
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [submittedReports, monthFilter, fromDate, toDate, sortField, sortOrder]);

  const reportsWithCost = useMemo(
    () => filteredReports.filter((r) => r.costOfVisit !== undefined && r.costOfVisit > 0),
    [filteredReports]
  );

  // --- KPI summary metrics ---
  const totalSpent = useMemo(
    () => reportsWithCost.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0),
    [reportsWithCost]
  );

  const averageCost = useMemo(
    () => (reportsWithCost.length > 0 ? totalSpent / reportsWithCost.length : 0),
    [reportsWithCost, totalSpent]
  );

  const highestExpenseActivity = useMemo(() => {
    const totals: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      const cost = r.costOfVisit ?? 0;
      totals[r.activityType] = (totals[r.activityType] ?? 0) + cost;
    });
    let maxActivity = '—';
    let maxVal = 0;
    Object.entries(totals).forEach(([act, sum]) => {
      if (sum > maxVal) {
        maxVal = sum;
        maxActivity = act;
      }
    });
    return { activity: maxActivity, amount: maxVal };
  }, [reportsWithCost]);

  // --- Recharts Chart Computations ---
  // 1. Trend Line (AreaChart) over time
  const trendChartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      byDate[r.date] = (byDate[r.date] ?? 0) + (r.costOfVisit ?? 0);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        rawDate: date,
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
      }));
  }, [reportsWithCost]);

  // 2. Category Pie (Donut Chart) of spending categories
  const categoryChartData = useMemo(() => {
    const byCat: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      byCat[r.activityType] = (byCat[r.activityType] ?? 0) + (r.costOfVisit ?? 0);
    });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reportsWithCost]);

  // 3. Activity-wise Spending (Bar Chart)
  const activityChartData = useMemo(() => {
    const byAct: Record<string, { activity: string; amount: number }> = {};
    reportsWithCost.forEach((r) => {
      if (!byAct[r.activityType]) {
        byAct[r.activityType] = { activity: r.activityType, amount: 0 };
      }
      byAct[r.activityType].amount += r.costOfVisit ?? 0;
    });
    return Object.values(byAct).sort((a, b) => b.amount - a.amount);
  }, [reportsWithCost]);

  // 4. Top Visits by individual visit cost
  const topVisitsChartData = useMemo(() => {
    return reportsWithCost
      .sort((a, b) => (b.costOfVisit ?? 0) - (a.costOfVisit ?? 0))
      .slice(0, 5)
      .map((r) => ({
        name: getReportLabel(r).length > 20 ? `${getReportLabel(r).slice(0, 18)}…` : getReportLabel(r),
        fullName: getReportLabel(r),
        cost: r.costOfVisit ?? 0,
        id: r.id,
      }));
  }, [reportsWithCost]);

  // --- Export Handling ---
  const handleExportStart = async (format: 'PDF' | 'XML' | 'JPG') => {
    setIsExportDropdownOpen(false);
    setExportFormat(format);
    setExportStatus('loading');
    setExportError(null);

    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const staffNameById: Record<string, string> = {};
      filteredReports.forEach((r) => {
        staffNameById[r.staffId] = r.staffName;
      });

      const totals = {
        totalSpent,
        averageCost,
        staffWithExpenses: reportsWithCost.length > 0 ? 1 : 0,
        topStaffSpender: filteredReports.length > 0 ? { name: filteredReports[0].staffName, amount: totalSpent } : null,
      };

      if (format === 'XML') {
        exportToXML(filteredReports, staffNameById, { staff: 'Self', month: monthFilter, fromDate, toDate }, totals);
      } else if (format === 'JPG') {
        await exportToJPG('.expense-charts-grid', `my-expenses-analytics_${new Date().toISOString().slice(0, 10)}.jpg`);
      } else if (format === 'PDF') {
        await exportToPDF(filteredReports, staffNameById, { staff: 'Self', month: monthFilter, fromDate, toDate }, totals, '.expense-charts-grid');
      }
      setExportStatus('success');
    } catch (e: any) {
      console.error(e);
      setExportError(e?.message || 'Failed to compile and download export file.');
      setExportStatus('error');
    }
  };

  const handleClearDates = () => {
    setFromDate('');
    setToDate('');
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

      {/* Header and Premium Export Panel */}
      <div className="table-header-bar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-muted)', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>My Spending & Expenses</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Analyze your field expenses, visit costs, and retrieve custom metadata ledgers
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
            Export Ledger
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
                    {exportFormat === 'PDF' && 'Compiling individual charts, rendering expense breakdowns, and structuring standard executive report layout...'}
                    {exportFormat === 'XML' && 'Formatting expense nodes and writing readable client data structure...'}
                    {exportFormat === 'JPG' && 'Rendering high-resolution analytics snapshots and active chart widgets...'}
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
                    Your filtered {exportFormat} data has been compiled and downloaded.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setExportStatus('idle')}
                  style={{ width: '100%', marginTop: '8px', borderColor: 'var(--border-muted)' }}
                >
                  Dismiss Window
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

      {/* KPI Cards Grid */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Money Spent</span>
            <div className="stat-icon-box purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatCurrency(totalSpent)}</div>
          <div className="stat-footer">
            <span>Across {reportsWithCost.length} recorded report{reportsWithCost.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Reports Count</span>
            <div className="stat-icon-box blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{filteredReports.length}</div>
          <div className="stat-footer">
            <span>{reportsWithCost.length} include active visit costs</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Average Cost / Report</span>
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
            <span>Calculated per active visit cost</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Highest Expense Activity</span>
            <div className="stat-icon-box orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: highestExpenseActivity.activity !== '—' && highestExpenseActivity.activity.length > 18 ? '1.1rem' : '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {highestExpenseActivity.activity}
          </div>
          <div className="stat-footer">
            <span>Total spend: {formatCurrency(highestExpenseActivity.amount)}</span>
          </div>
        </div>
      </section>

      {/* Symmetrical 4-Chart Grid */}
      <div className="expense-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '24px', margin: '24px 0' }}>
        {/* Chart 1: Expense Trend (Cumulative Line/Area) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Expense Trend</h3>
              <p>Spending trajectory over chronological dates</p>
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendChartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Total Spent']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#trendGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No date records available for trends in selected filters.</p>
            </div>
          )}
        </div>

        {/* Chart 2: Category Pie (Donut Chart) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Expense Breakdown by Activity</h3>
              <p>Distribution of total costs across activities</p>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <div className="expense-chart-wrap" style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No categorised visits recorded.</p>
            </div>
          )}
        </div>

        {/* Chart 3: Activity-wise Spending (Bar Chart) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Activity-Wise Spending Graph</h3>
              <p>Comparison of aggregate visit expenses</p>
            </div>
          </div>
          {activityChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={activityChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="activity" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Total Spent']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {activityChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No activity totals available.</p>
            </div>
          )}
        </div>

        {/* Chart 4: Top Visits by Cost (Horizontal Bar) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Peak Visits Ledger</h3>
              <p>Top 5 highest individual report visits by cost</p>
            </div>
          </div>
          {topVisitsChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topVisitsChartData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Cost']}
                    labelFormatter={(_, payload) => (payload?.[0]?.payload?.fullName ? `Report: ${payload[0].payload.fullName}` : '')}
                  />
                  <Bar dataKey="cost" fill="var(--info)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No individual reports with recorded visit costs found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Scoping and Filtering Panel */}
      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-bar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="table-title">Operational Spending Ledger</div>
            
            {/* Sort Selection dropdown */}
            <div className="filters-row">
              <select
                className="filter-select"
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
                aria-label="Sort reports"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="cost-desc">Highest cost</option>
                <option value="cost-asc">Lowest cost</option>
              </select>
            </div>
          </div>

          {/* Date pickers & Range Scoping row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', background: 'HSLA(224, 40%, 6%, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scope Date Range:</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="fromDateInput" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From</label>
              <input
                id="fromDateInput"
                type="date"
                className="filter-select"
                style={{ padding: '8px 12px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="toDateInput" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To</label>
              <input
                id="toDateInput"
                type="date"
                className="filter-select"
                style={{ padding: '8px 12px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {(fromDate || toDate) ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearDates}
                style={{ padding: '8px 12px', fontSize: '0.8rem', borderColor: 'var(--border-muted)' }}
              >
                Clear Range
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>Or Quick Selector:</span>
                <select
                  className="filter-select"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  aria-label="Filter by month"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="All">All months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Report Cards display */}
        <div style={{ padding: '24px' }}>
          {filteredReports.length > 0 ? (
            <div className="report-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredReports.map((report) => {
                const orgName = report.institutionName || report.hospitalName || report.conferenceName || report.location || 'Unknown Location';
                const totalCost = report.costOfVisit ?? 0;
                const activitySummary = report.marketingObservation || report.observations || 'No observation notes logged.';

                return (
                  <div
                    key={report.id}
                    className="report-card"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      position: 'relative',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform var(--transition-normal), border var(--transition-normal)',
                    }}
                  >
                    {/* Header: Activity Type & Status badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {report.activityType}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={orgName}>
                          {orgName}
                        </div>
                      </div>
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
                    </div>

                    {/* Report Info Details */}
                    <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Staff Name:</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{report.staffName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Report Date:</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{report.date}</span>
                      </div>
                    </div>

                    {/* Compact Activity Summary / Marketing Observation Preview */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-muted)',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Activity Summary
                      </span>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-main)',
                          margin: 0,
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {activitySummary}
                      </p>
                    </div>

                    {/* Footer: Total Visited Cost & View Details button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Visit Cost</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: totalCost > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {formatCurrency(totalCost)}
                        </div>
                      </div>
                      
                      {onInspectReport && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onInspectReport(report)}
                          style={{ padding: '8px 16px', fontSize: '0.8rem', borderColor: 'var(--border-muted)', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h4>No matching submitted reports found</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Try adjusting your date range constraints or month filters.
              </p>
            </div>
          )}
        </div>

        {/* ledger footer */}
        {filteredReports.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-muted)', padding: '20px 24px', background: 'HSLA(224, 40%, 6%, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
              Filtered Ledger Total ({filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''})
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
              {formatCurrency(filteredReports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
