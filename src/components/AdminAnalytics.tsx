'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { MarketReport } from '../types';

interface AdminAnalyticsProps {
  reports: MarketReport[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

// Custom tooltip matching the premium dark theme
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-muted)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'var(--glass-filter)',
        }}
      >
        {label && (
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '6px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {label}
          </p>
        )}
        {payload.map((item: any, idx: number) => (
          <p
            key={idx}
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: item.color || 'var(--text-main)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.color,
              }}
            />
            {item.name}: {formatter ? formatter(item.value) : item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ reports }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [rankingMetric, setRankingMetric] = useState<'reports' | 'approved' | 'expenses'>('reports');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Reports Activity Trend
  const activityTrendData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      if (!r.date) return;
      const parts = r.date.split('-');
      if (parts.length < 2) return;
      const key = `${parts[0]}-${parts[1]}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const sortedKeys = Object.keys(counts).sort();
    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      return {
        month: monthLabel,
        count: counts[key],
      };
    });
  }, [reports]);

  // 2. Expense Analysis (Compare total expenses by category)
  const expenseAnalysisData = useMemo(() => {
    let institutionExpenses = 0;
    let hospitalExpenses = 0;
    let campaignExpenses = 0;
    let conferenceExpenses = 0;

    reports.forEach((r) => {
      const cost = r.costOfVisit ?? 0;
      if (r.activityType === 'Meeting with Organisation') {
        if (r.meetingType === 'Hospital') {
          hospitalExpenses += cost;
        } else {
          institutionExpenses += cost;
        }
      } else if (r.activityType === 'Campaigns Conducted') {
        campaignExpenses += cost;
      } else if (r.activityType === 'Participation in Conferences') {
        conferenceExpenses += cost;
      }
    });

    return [
      { name: 'Institution Mtgs', amount: institutionExpenses, fill: 'var(--primary)' },
      { name: 'Hospital Mtgs', amount: hospitalExpenses, fill: 'var(--info)' },
      { name: 'Campaigns', amount: campaignExpenses, fill: 'var(--success)' },
      { name: 'Conferences', amount: conferenceExpenses, fill: 'var(--warning)' },
    ];
  }, [reports]);

  // 3. Report Status Distribution
  const statusDistributionData = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    reports.forEach((r) => {
      if (r.status === 'Pending') pending++;
      else if (r.status === 'Approved') approved++;
      else if (r.status === 'Rejected') rejected++;
    });

    return [
      { name: 'Pending', value: pending, fill: 'var(--warning)' },
      { name: 'Approved', value: approved, fill: 'var(--success)' },
      { name: 'Rejected', value: rejected, fill: 'var(--error)' },
    ];
  }, [reports]);

  // 4. Staff Performance Ranking
  const staffRankingData = useMemo(() => {
    const staffStats: Record<
      string,
      { name: string; reports: number; approved: number; expenses: number }
    > = {};

    reports.forEach((r) => {
      const staffId = r.staffId;
      const staffName = r.staffName || 'Unknown Staff';
      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          name: staffName,
          reports: 0,
          approved: 0,
          expenses: 0,
        };
      }
      staffStats[staffId].reports += 1;
      if (r.status === 'Approved') {
        staffStats[staffId].approved += 1;
      }
      staffStats[staffId].expenses += r.costOfVisit ?? 0;
    });

    // Convert to array and sort descending by selected metric
    const arr = Object.values(staffStats);
    arr.sort((a, b) => b[rankingMetric] - a[rankingMetric]);
    
    // Take top 5
    return arr.slice(0, 5);
  }, [reports, rankingMetric]);

  // 5. Monthly Expense Trend
  const monthlyExpenseTrendData = useMemo(() => {
    const expenseByMonth: Record<string, number> = {};
    reports.forEach((r) => {
      if (!r.date) return;
      const parts = r.date.split('-');
      if (parts.length < 2) return;
      const key = `${parts[0]}-${parts[1]}`;
      const cost = r.costOfVisit ?? 0;
      expenseByMonth[key] = (expenseByMonth[key] || 0) + cost;
    });

    const sortedKeys = Object.keys(expenseByMonth).sort();
    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      return {
        month: monthLabel,
        amount: expenseByMonth[key],
      };
    });
  }, [reports]);

  // 6. Activity Type Distribution
  const activityDistributionData = useMemo(() => {
    let meetingsCount = 0;
    let campaignsCount = 0;
    let conferencesCount = 0;

    reports.forEach((r) => {
      if (r.activityType === 'Meeting with Organisation') {
        meetingsCount += 1;
      } else if (r.activityType === 'Campaigns Conducted') {
        campaignsCount += 1;
      } else if (r.activityType === 'Participation in Conferences') {
        conferencesCount += 1;
      }
    });

    const total = meetingsCount + campaignsCount + conferencesCount || 1;

    return [
      { name: 'Meetings', value: meetingsCount, percentage: Math.round((meetingsCount / total) * 100), fill: 'var(--primary)' },
      { name: 'Campaigns', value: campaignsCount, percentage: Math.round((campaignsCount / total) * 100), fill: 'var(--success)' },
      { name: 'Conferences', value: conferencesCount, percentage: Math.round((conferencesCount / total) * 100), fill: 'var(--warning)' },
    ].filter(item => item.value > 0);
  }, [reports]);

  if (!isMounted) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading analytics data visualizations...</div>
      </div>
    );
  }

  return (
    <div className="analytics-section" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* SECTION HEADER */}
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ filter: 'drop-shadow(0px 0px 8px var(--primary-glow))' }}>
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          Executive Analytics Insights
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Dynamic real-time statistical visualization of marketing audits, operations, and budgets.</p>
      </div>

      <div className="analytics-charts-grid">
        
        {/* CHART 1: Reports Activity Trend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Reports Activity Trend</h3>
              <p>Total submissions tracked over time</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 240, marginTop: '8px' }}>
            {activityTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrendData} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Reports Filed"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    activeDot={{ r: 6, stroke: 'var(--bg-main)', strokeWidth: 2 }}
                    dot={{ r: 3, fill: 'var(--bg-main)', stroke: 'var(--primary)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No activity data available
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Expense Analysis */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Expense Analysis</h3>
              <p>Compare total expenses accrued across categories</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 240, marginTop: '8px' }}>
            {expenseAnalysisData.some(d => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseAnalysisData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="amount" name="Total Expense" radius={[4, 4, 0, 0]}>
                    {expenseAnalysisData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No expense data recorded yet
              </div>
            )}
          </div>
        </div>

        {/* CHART 3: Report Status Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Report Status Distribution</h3>
              <p>Breakdown of audited vs pending reports</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 240, paddingRight: '20px' }}>
            {reports.length > 0 ? (
              <>
                <div style={{ width: '60%', height: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-main)" style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {reports.filter(r => r.status !== 'Draft').length}
                      </text>
                      <text x="50%" y="59%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Audited
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Status Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '35%' }}>
                  {statusDistributionData.map((status, index) => {
                    const totalAudited = reports.filter(r => r.status !== 'Draft').length || 1;
                    const pct = Math.round((status.value / totalAudited) * 100);
                    return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.fill }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{status.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '14px', fontFamily: 'var(--font-mono)' }}>
                          {status.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No status distribution data available
              </div>
            )}
          </div>
        </div>

        {/* CHART 4: Staff Performance Ranking */}
        <div className="chart-card">
          <div className="chart-card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="chart-card-title">
              <h3>Staff Performance Ranking</h3>
              <p>Top staff ranked by dynamic activity metrics</p>
            </div>
            
            {/* Metric Pills */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-sidebar)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)' }}>
              {(['reports', 'approved', 'expenses'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setRankingMetric(m)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: rankingMetric === m ? 'var(--primary)' : 'transparent',
                    color: rankingMetric === m ? 'var(--text-main)' : 'var(--text-muted)',
                    transition: 'all 0.20s ease',
                  }}
                >
                  {m === 'reports' ? 'Filed' : m === 'approved' ? 'Approved' : 'Expenses'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 240, marginTop: '8px' }}>
            {staffRankingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={staffRankingData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-main)', fontSize: 10, fontWeight: 600 }} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => rankingMetric === 'expenses' ? formatCurrency(v) : v} />} />
                  <Bar
                    dataKey={rankingMetric}
                    name={rankingMetric === 'reports' ? 'Reports Filed' : rankingMetric === 'approved' ? 'Approved Reports' : 'Expenses ($)'}
                    fill="var(--primary)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  >
                    {staffRankingData.map((entry, index) => {
                      const colors = ['#a855f7', '#a855f7', '#a855f7', '#a855f7', '#a855f7']; // Single primary tone with decreasing brightness if needed, or constant
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No performance data available
              </div>
            )}
          </div>
        </div>

        {/* CHART 5: Monthly Expense Trend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Monthly Expense Trend</h3>
              <p>Timeline of total money spent per month</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 240, marginTop: '8px' }}>
            {monthlyExpenseTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyExpenseTrendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseTrendGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Spent Amount"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#expenseTrendGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No monthly expense trends available
              </div>
            )}
          </div>
        </div>

        {/* CHART 6: Activity Type Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h3>Activity Type Distribution</h3>
              <p>Proportion of different activities conducted</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 240, paddingRight: '20px' }}>
            {activityDistributionData.length > 0 ? (
              <>
                <div style={{ width: '60%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                      >
                        {activityDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip formatter={(v: number) => `${v} reports`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Activity Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '35%' }}>
                  {activityDistributionData.map((activity, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activity.fill }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{activity.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '14px', fontFamily: 'var(--font-mono)' }}>
                        {activity.value} reports ({activity.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No activity type data available
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
