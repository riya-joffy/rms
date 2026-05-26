'use client';
import React, { useState, useMemo } from 'react';
import { MarketReport } from '../types';

interface SVGChartsProps {
  reports: MarketReport[];
}

export const SVGCharts: React.FC<SVGChartsProps> = ({ reports }) => {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // SVG dimensions
  const lineWidth = 540;
  const lineHeight = 200;
  const padding = 30;

  // 1. Dynamic Monthly Submissions Calculation (Last 6 Months)
  const monthlySubmissions = useMemo(() => {
    const result: {
      month: string;
      yearMonth: string;
      count: number;
      pending: number;
      approved: number;
      rejected: number;
    }[] = [];
    const date = new Date();
    // Generate last 6 months starting from 5 months ago
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: label,
        yearMonth,
        count: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    }

    reports.forEach((report) => {
      if (!report.date) return;
      const [year, month] = report.date.split('-');
      if (!year || !month) return;
      const reportYM = `${year}-${month}`;

      const matchedMonth = result.find((m) => m.yearMonth === reportYM);
      if (matchedMonth) {
        matchedMonth.count += 1;
        if (report.status === 'Approved') matchedMonth.approved += 1;
        else if (report.status === 'Rejected') matchedMonth.rejected += 1;
        else matchedMonth.pending += 1;
      }
    });

    return result;
  }, [reports]);

  // Max value calculation for scaling
  const maxCount = useMemo(() => {
    const counts = monthlySubmissions.map((d) => d.count);
    const maxVal = Math.max(...counts);
    return maxVal > 0 ? maxVal + 5 : 10;
  }, [monthlySubmissions]);

  // Calculate Line coordinates
  const coords = useMemo(() => {
    return monthlySubmissions.map((d, index) => {
      const x = padding + (index * (lineWidth - 2 * padding)) / (monthlySubmissions.length - 1);
      const y = lineHeight - padding - (d.count / maxCount) * (lineHeight - 2 * padding);
      return { x, y, data: d };
    });
  }, [monthlySubmissions, maxCount]);

  const pathString = useMemo(() => {
    return coords.reduce((acc, c, i) => {
      return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, '');
  }, [coords]);

  // Grid lines
  const gridLinesY = useMemo(() => {
    return [4, 3, 2, 1, 0].map((multiplier) => {
      const val = (maxCount / 4) * multiplier;
      const y = padding + ((4 - multiplier) * (lineHeight - 2 * padding)) / 4;
      return { val: Math.round(val), y };
    });
  }, [maxCount]);

  // 2. Dynamic Category Distribution Calculation
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((report) => {
      const cat = report.activityType || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = ['var(--primary)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--error)', '#ec4899', '#6366f1'];

    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Limit to top 5 categories
  }, [reports]);

  const totalCategoryCount = useMemo(() => {
    return categoryDistribution.reduce((sum, item) => sum + item.count, 0) || 1;
  }, [categoryDistribution]);

  // Growth rate calculator helper
  const growthRateText = useMemo(() => {
    if (monthlySubmissions.length < 2) return 'Stable';
    const lastMonth = monthlySubmissions[5].count;
    const prevMonth = monthlySubmissions[4].count;
    if (prevMonth === 0) {
      return lastMonth > 0 ? `+${lastMonth} New Reports` : 'No Recent Activity';
    }
    const diff = lastMonth - prevMonth;
    const pct = Math.round((diff / prevMonth) * 100);
    return pct >= 0 ? `+${pct}% Growth` : `${pct}% Decreased`;
  }, [monthlySubmissions]);

  return (
    <div className="analytics-section" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      
      {/* 1. LINE CHART: Submissions Volume Trend */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <h3>Report activity</h3>
            <p>Submission trends for the last 6 months</p>
          </div>
          <span 
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary-glow)',
              color: 'var(--primary)',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            {growthRateText}
          </span>
        </div>

        {/* SVG Drawing */}
        <div style={{ position: 'relative', width: '100%', minHeight: '220px' }}>
          <svg viewBox={`0 0 ${lineWidth} ${lineHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              {/* Path glowing gradient */}
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            {gridLinesY.map((gl, i) => (
              <g key={i}>
                <line 
                  x1={padding} 
                  y1={gl.y} 
                  x2={lineWidth - padding} 
                  y2={gl.y} 
                  stroke="var(--border-muted)" 
                  strokeWidth="0.5" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={padding - 8} 
                  y={gl.y + 4} 
                  fill="var(--text-dark)" 
                  fontSize="8" 
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {gl.val}
                </text>
              </g>
            ))}

            {/* Glowing fill underneath path */}
            {coords.length > 0 && (
              <path
                d={`${pathString} L ${coords[coords.length - 1].x} ${lineHeight - padding} L ${coords[0].x} ${lineHeight - padding} Z`}
                fill="url(#chartGlow)"
              />
            )}

            {/* Main Path Line */}
            <path
              d={pathString}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0px 4px 8px rgba(168, 85, 247, 0.4))' }}
            />

            {/* Interactive Circles / Data Nodes */}
            {coords.map((c, index) => (
              <g key={index}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={hoveredLineIndex === index ? 7 : 4}
                  fill={hoveredLineIndex === index ? 'var(--primary-hover)' : 'var(--bg-main)'}
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setHoveredLineIndex(index)}
                  onMouseLeave={() => setHoveredLineIndex(null)}
                />
                <text
                  x={c.x}
                  y={lineHeight - 8}
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {c.data.month}
                </text>

                {/* Inline Hover Tooltip */}
                {hoveredLineIndex === index && (
                  <g>
                    <rect
                      x={c.x - 45}
                      y={c.y - 34}
                      width="90"
                      height="24"
                      rx="4"
                      fill="var(--bg-sidebar)"
                      stroke="var(--border-muted)"
                      strokeWidth="1"
                    />
                    <text
                      x={c.x}
                      y={c.y - 18}
                      fill="var(--text-main)"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                    >
                      {c.data.count} reports
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* 2. BAR CHART: Report Category Breakdown */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <h3>Report categories</h3>
            <p>Report counts by category</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
          {categoryDistribution.length > 0 ? (
            categoryDistribution.map((cat, i) => {
              const percentage = (cat.count / totalCategoryCount) * 100;
              return (
                <div 
                  key={i} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  onMouseEnter={() => setHoveredBarIndex(i)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{cat.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: cat.color, fontWeight: '700' }}>
                      {cat.count} submissions
                    </span>
                  </div>

                  <div 
                    style={{ 
                      height: '8px', 
                      backgroundColor: 'var(--bg-sidebar)', 
                      borderRadius: 'var(--radius-full)', 
                      overflow: 'hidden',
                      border: '1px solid var(--border-muted)'
                    }}
                  >
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${percentage}%`, 
                        backgroundColor: cat.color,
                        borderRadius: 'var(--radius-full)',
                        boxShadow: hoveredBarIndex === i ? `0 0 10px ${cat.color}` : 'none',
                        transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No categories to display. Create a report to see graph data.
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
