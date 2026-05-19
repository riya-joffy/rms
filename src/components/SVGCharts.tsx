'use client';

import React, { useState } from 'react';

// Mock Data for Charts
const MONTHLY_SUBMISSIONS = [
  { month: 'Dec', count: 18, pending: 0, approved: 16, rejected: 2 },
  { month: 'Jan', count: 24, pending: 0, approved: 20, rejected: 4 },
  { month: 'Feb', count: 32, pending: 0, approved: 28, rejected: 4 },
  { month: 'Mar', count: 28, pending: 0, approved: 25, rejected: 3 },
  { month: 'Apr', count: 42, pending: 2, approved: 36, rejected: 4 },
  { month: 'May', count: 58, pending: 5, approved: 48, rejected: 5 },
];

const CATEGORY_DISTRIBUTION = [
  { name: 'Competitor Intel', count: 18, color: 'var(--primary)' },
  { name: 'Consumer Trends', count: 14, color: 'var(--info)' },
  { name: 'Pricing Analysis', count: 11, color: 'var(--success)' },
  { name: 'Inventory & Supply', count: 9, color: 'var(--warning)' },
  { name: 'Promo Tracking', count: 6, color: 'var(--error)' },
];

const REGIONAL_DISTRIBUTION = [
  { name: 'North America', count: 25, percentage: 43, color: '#a855f7' }, // purple
  { name: 'Europe', count: 16, percentage: 28, color: '#0ea5e9' }, // info
  { name: 'Asia Pacific', count: 10, percentage: 17, color: '#10b981' }, // success
  { name: 'Latin America', count: 7, percentage: 12, color: '#f59e0b' }, // warning
];

export const SVGCharts: React.FC = () => {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // SVG dimensions
  const lineWidth = 540;
  const lineHeight = 200;
  const padding = 30;

  // Max value calculation for scaling
  const maxCount = Math.max(...MONTHLY_SUBMISSIONS.map(d => d.count)) + 10;
  
  // Calculate Line coordinates
  const getLineCoordinates = () => {
    return MONTHLY_SUBMISSIONS.map((d, index) => {
      const x = padding + (index * (lineWidth - 2 * padding)) / (MONTHLY_SUBMISSIONS.length - 1);
      const y = lineHeight - padding - (d.count / maxCount) * (lineHeight - 2 * padding);
      return { x, y, data: d };
    });
  };

  const coords = getLineCoordinates();
  const pathString = coords.reduce((acc, c, i) => {
    return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  // Grid lines
  const gridLinesY = [4, 3, 2, 1, 0].map(multiplier => {
    const val = (maxCount / 4) * multiplier;
    const y = padding + ((4 - multiplier) * (lineHeight - 2 * padding)) / 4;
    return { val: Math.round(val), y };
  });

  return (
    <div className="analytics-section" style={{ marginBottom: '24px' }}>
      
      {/* 1. LINE CHART: Submissions Volume Trend */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <h3>Operational Report Velocity</h3>
            <p>Historical submissions trend over the last 6 calendar months</p>
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
            +38% Active Growth
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
            <h3>Report Categories Matrix</h3>
            <p>Intelligence volume categorized by business vertical</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
          {CATEGORY_DISTRIBUTION.map((cat, i) => {
            const percentage = (cat.count / 58) * 100; // max submissions total base
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
          })}
        </div>
      </div>
      
    </div>
  );
};
