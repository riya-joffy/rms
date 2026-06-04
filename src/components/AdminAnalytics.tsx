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
  AreaChart,
  Area,
} from 'recharts';
import { MarketReport } from '../types';

interface AdminAnalyticsProps {
  reports: MarketReport[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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
};

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ reports }) => {
  const [isMounted, setIsMounted] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (numSlides: number) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev === numSlides - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      setCurrentSlide(prev => (prev === 0 ? numSlides - 1 : prev - 1));
    }
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? 1 : 0));
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === 1 ? 0 : 1));
  };

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

  // 2. Monthly Expense Trend
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

      <div 
        className="analytics-charts-grid" 
        style={{ 
          display: 'block', 
          position: 'relative', 
          overflow: 'hidden', 
          padding: '0 48px'
        }}
      >
        <div 
          style={{ 
            overflow: 'hidden',
            width: '100%',
            position: 'relative'
          }}
        >
          <div 
            style={{ 
              display: 'flex', 
              transform: `translateX(-${currentSlide * 100}%)`, 
              transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              width: '100%'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(2)}
          >
            {/* Slide 1: Reports Activity Trend */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card" style={{ height: '100%' }}>
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
            </div>

            {/* Slide 2: Monthly Expense Trend */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card" style={{ height: '100%' }}>
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
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
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
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous chart"
          style={{
            position: 'absolute',
            left: '4px',
            top: 'calc(50% - 18px)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 0 12px var(--primary-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-muted)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next chart"
          style={{
            position: 'absolute',
            right: '4px',
            top: 'calc(50% - 18px)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 0 12px var(--primary-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-muted)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Pagination Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          {[0, 1].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                width: currentSlide === idx ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: currentSlide === idx ? 'var(--primary)' : 'var(--border-muted)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
