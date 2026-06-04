import { MarketReport } from '../types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CHART_COLORS = ['#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const getReportLabel = (report: MarketReport) =>
  report.institutionName || report.hospitalName || report.conferenceName || report.activityType;

export const getMonthKey = (dateStr: string) => {
  const [year, month] = dateStr.split('-');
  if (!year || !month) return '';
  return `${year}-${month}`;
};

export const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx] ?? month} ${year}`;
};
