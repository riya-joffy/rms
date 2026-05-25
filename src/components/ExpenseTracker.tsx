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
import { MarketReport } from '../types';

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

const CHART_COLORS = ['#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ reports, onInspectReport }) => {
  const [monthFilter, setMonthFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
    if (monthFilter !== 'All') {
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
  }, [submittedReports, monthFilter, sortField, sortOrder]);

  const reportsWithCost = submittedReports.filter(
    (r) => r.costOfVisit !== undefined && r.costOfVisit > 0
  );

  const totalSpent = reportsWithCost.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0);
  const averageCost =
    reportsWithCost.length > 0 ? totalSpent / reportsWithCost.length : 0;

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
        monthKey: month,
        total,
      }));
  }, [reportsWithCost]);

  const perReportChartData = useMemo(() => {
    return filteredReports
      .filter((r) => (r.costOfVisit ?? 0) > 0)
      .slice(0, 8)
      .map((r) => ({
        name: r.id.replace('REP-', ''),
        cost: r.costOfVisit ?? 0,
        fullId: r.id,
      }));
  }, [filteredReports]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'cost' ? 'desc' : 'desc');
    }
  };

  return (
    <div className="expense-tracker">
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
            <span>Across {reportsWithCost.length} report{reportsWithCost.length !== 1 ? 's' : ''} with expenses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Reports Submitted</span>
            <div className="stat-icon-box blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{submittedReports.length}</div>
          <div className="stat-footer">
            <span>{reportsWithCost.length} include visit costs</span>
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
            <span>Per report with recorded expense</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Highest Single Visit</span>
            <div className="stat-icon-box orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
          <div className="stat-value">
            {reportsWithCost.length > 0
              ? formatCurrency(Math.max(...reportsWithCost.map((r) => r.costOfVisit ?? 0)))
              : '$0'}
          </div>
          <div className="stat-footer">
            <span>Peak visit expense recorded</span>
          </div>
        </div>
      </section>

      <div className="expense-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Monthly spending</h3>
              <p>Total visit costs grouped by month</p>
            </div>
          </div>
          {monthlyChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-muted)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
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
              <p>Add visit costs to your reports to see monthly trends.</p>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Cost per report</h3>
              <p>Top visits by expense {monthFilter !== 'All' ? `(${formatMonthLabel(monthFilter)})` : ''}</p>
            </div>
          </div>
          {perReportChartData.length > 0 ? (
            <div className="expense-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={perReportChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Visit cost']}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullId ? `Report ${payload[0].payload.fullId}` : ''
                    }
                  />
                  <Bar dataKey="cost" fill="var(--primary)" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="expense-empty-chart">
              <p>No expense data for the selected filters.</p>
            </div>
          )}
        </div>
      </div>

      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-bar">
          <div className="table-title">Report expenses</div>
          <div className="filters-row">
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
              aria-label="Sort reports"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="cost-desc">Highest cost</option>
              <option value="cost-asc">Lowest cost</option>
            </select>
          </div>
        </div>

        <div className="data-table-container">
          {filteredReports.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Activity</th>
                  <th>Location</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSort('date')}
                    title="Click to toggle date sort"
                  >
                    Date {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th>Status</th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => toggleSort('cost')}
                    title="Click to toggle cost sort"
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
                  <td colSpan={5} style={{ fontWeight: '700', padding: '16px 24px' }}>
                    Filtered total ({filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''})
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--primary)', padding: '16px 24px' }}>
                    {formatCurrency(
                      filteredReports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0)
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h4>No submitted reports yet</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Submit reports with a visit cost to track your spending here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
