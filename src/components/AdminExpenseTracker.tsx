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
import { MarketReport, User } from '../types';
import { isAdminRole } from '../lib/roles';
import { exportToPDF } from '../lib/expenseExportUtils';
import { exportExpensesToExcel } from '../lib/excelExportUtils';
import { toast } from 'react-toastify';

interface AdminExpenseTrackerProps {
  reports: MarketReport[];
  users: User[];
  onInspectReport?: (report: MarketReport) => void;
}

type SortField = 'date' | 'cost' | 'staff';
type SortOrder = 'asc' | 'desc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CHART_COLORS = ['#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

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

export const AdminExpenseTracker: React.FC<AdminExpenseTrackerProps> = ({
  reports,
  users,
  onInspectReport,
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [staffFilter, setStaffFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // New Filters UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'EXCEL' | 'PDF' | null>(null);

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
    setCurrentSlide(prev => (prev === 0 ? 3 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === 3 ? 0 : prev + 1));
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

  const staffAvatarById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.avatar;
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

  // Compute unique categories and hospitals/organisations
  const categories = useMemo(() => {
    const keys = new Set<string>();
    submittedReports.forEach((r) => {
      if (r.activityType) keys.add(r.activityType);
    });
    return Array.from(keys).sort();
  }, [submittedReports]);

  const hospitals = useMemo(() => {
    const keys = new Set<string>();
    submittedReports.forEach((r) => {
      const name = r.institutionName || r.hospitalName || r.conferenceName;
      if (name) keys.add(name);
    });
    return Array.from(keys).sort();
  }, [submittedReports]);

  // Date Range overrides Month Filter if active, respects all UI filters
  const filteredReports = useMemo(() => {
    let list = [...submittedReports];

    // 1. Staff Filter
    if (staffFilter !== 'All') {
      list = list.filter((r) => r.staffId === staffFilter);
    }

    // 2. Keyword Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((r) => {
        const staffName = staffNameById[r.staffId] || r.staffName || '';
        const instHosp = r.institutionName || r.hospitalName || r.conferenceName || '';
        const title = `${r.activityType} - ${instHosp}`;
        const obs = r.observations || r.marketingObservation || '';
        return title.toLowerCase().includes(lower) || 
               obs.toLowerCase().includes(lower) || 
               staffName.toLowerCase().includes(lower);
      });
    }

    // 3. Category
    if (categoryFilter !== 'All') {
      list = list.filter((r) => r.activityType === categoryFilter);
    }

    // 4. Hospital/Organisation
    if (hospitalFilter !== 'All') {
      list = list.filter((r) => {
        const name = r.institutionName || r.hospitalName || r.conferenceName || '';
        return name === hospitalFilter;
      });
    }

    // 5. Status
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }
    
    // 6. Date / Month quick selector
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
  }, [submittedReports, staffFilter, searchTerm, categoryFilter, hospitalFilter, statusFilter, monthFilter, fromDate, toDate, sortField, sortOrder, staffNameById]);

  const reportsWithCost = useMemo(
    () => filteredReports.filter((r) => (r.costOfVisit ?? 0) > 0),
    [filteredReports]
  );

  // --- KPI Card Calculations ---
  const totalSpent = useMemo(
    () => reportsWithCost.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0),
    [reportsWithCost]
  );

  const averageCost = useMemo(
    () => (reportsWithCost.length > 0 ? totalSpent / reportsWithCost.length : 0),
    [reportsWithCost, totalSpent]
  );

  const staffWithExpenses = useMemo(() => {
    const ids = new Set(reportsWithCost.map((r) => r.staffId));
    return ids.size;
  }, [reportsWithCost]);

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

  // --- Recharts Analytics Data ---
  // 1. Expense Trend Cumulative Team spend over dates
  const trendChartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    reportsWithCost.forEach((r) => {
      byDate[r.date] = (byDate[r.date] ?? 0) + (r.costOfVisit ?? 0);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
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

  // 3. Staff comparison bar graph
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
      .slice(0, 8)
      .map((s) => ({
        name: s.name.length > 12 ? `${s.name.slice(0, 10)}…` : s.name,
        fullName: s.name,
        total: s.total,
      }));
  }, [reportsWithCost, staffNameById]);

  // 4. Activity-wise spending graph
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

  // Staff summary tiles
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

  // --- Export Handling ---
  const handleExportStart = async (type: 'EXCEL' | 'PDF') => {
    setIsExporting(true);
    setExportType(type);

    const toastId = toast.loading(type === 'EXCEL' ? "Generating Excel..." : "Generating PDF...");

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const totals = {
        totalSpent,
        averageCost,
        staffWithExpenses,
        topStaffSpender,
      };

      const filterMeta = {
        staff: staffFilter === 'All' ? 'All Staff' : (staffNameById[staffFilter] || staffFilter),
        month: monthFilter,
        fromDate,
        toDate,
        searchTerm,
        category: categoryFilter,
        hospital: hospitalFilter,
        status: statusFilter
      };

      if (type === 'PDF') {
        await exportToPDF(filteredReports, staffNameById, filterMeta, totals, '.expense-charts-grid');
        toast.update(toastId, {
          render: "PDF exported successfully",
          type: "success",
          isLoading: false,
          autoClose: 3000
        });
      } else if (type === 'EXCEL') {
        exportExpensesToExcel(filteredReports, staffNameById, filterMeta);
        toast.update(toastId, {
          render: "Excel exported successfully",
          type: "success",
          isLoading: false,
          autoClose: 3000
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.update(toastId, {
        render: "Export failed",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleClearDates = () => {
    setFromDate('');
    setToDate('');
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) : 'ST';
  };

  return (
    <div className="expense-tracker">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header and Premium Export Panel */}
      <div className="table-header-bar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-muted)', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Staff Expense Analytics</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Monitor and audit organizational visit costs, marketing expenses, and spending summaries
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isExporting}
            onClick={() => handleExportStart('EXCEL')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              minWidth: '160px',
              justifyContent: 'center',
              borderColor: 'var(--border-muted)',
              opacity: isExporting ? 0.6 : 1,
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting && exportType === 'EXCEL' ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                </svg>
                Generating Excel...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
                Export to Excel
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={isExporting}
            onClick={() => handleExportStart('PDF')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              minWidth: '150px',
              justifyContent: 'center',
              opacity: isExporting ? 0.6 : 1,
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting && exportType === 'PDF' ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Export to PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar and Filter Controls */}
      <div className="table-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="table-title" style={{ margin: 0 }}>Filter & Sort Controls</div>
            
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

          {/* New row of inputs: Search keyword, Category, Hospital, Status */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="adminSearchBar" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Search Keyword</label>
              <input
                id="adminSearchBar"
                type="text"
                placeholder="Search title, observations, staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  width: '100%'
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="adminCategorySelector" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Category</label>
              <select
                id="adminCategorySelector"
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Hospital/Organisation Filter */}
            <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="adminHospitalSelector" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Hospital / Org</label>
              <select
                id="adminHospitalSelector"
                className="filter-select"
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              >
                <option value="All">All Organisations</option>
                {hospitals.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="adminStatusSelector" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Status</label>
              <select
                id="adminStatusSelector"
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', background: 'HSLA(224, 40%, 6%, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scope Date Range:</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="adminFromDateInput" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From</label>
              <input
                id="adminFromDateInput"
                type="date"
                className="filter-select"
                style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="adminToDateInput" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To</label>
              <input
                id="adminToDateInput"
                type="date"
                className="filter-select"
                style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
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
      </div>

      {/* KPI Cards Grid */}
      <section className="stats-grid" style={{ marginBottom: '24px' }}>
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
            <span className="stat-title">Staff Count (Expenses)</span>
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
            <span>Mean visit cost in filter</span>
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
            <span>Total Team Spend: {formatCurrency(highestExpenseActivity.amount)}</span>
          </div>
        </div>
      </section>

      {/* Staff members comparative summaries (interactive selector) */}
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

      {/* Symmetrical 4-Chart Grid */}
      <div 
        className="expense-charts-grid" 
        style={{ 
          display: 'block', 
          position: 'relative', 
          overflow: 'hidden', 
          padding: '0 48px',
          margin: '24px 0'
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
            onTouchEnd={() => handleTouchEnd(4)}
          >
            {/* Slide 1: Team Spending Trend */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">
                    <h3>Monthly team spending</h3>
                    <p>Cumulative visit costs across all staff over dates</p>
                  </div>
                </div>
                {trendChartData.length > 0 ? (
                  <div className="expense-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={trendChartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminTrendGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
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
                        <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#adminTrendGlow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="expense-empty-chart">
                    <p>No expense data in the selected filters.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Slide 2: Category Pie (Donut Chart) */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">
                    <h3>Expense Categories</h3>
                    <p>Total spend grouped by institutional activity type</p>
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
                        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="expense-empty-chart">
                    <p>No activity expenses reported.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Slide 3: Staff comparison bar graph */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">
                    <h3>Spending by staff</h3>
                    <p>Total visit costs per team member (top 8 Spenders)</p>
                  </div>
                </div>
                {staffChartData.length > 0 ? (
                  <div className="expense-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={staffChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-sidebar)',
                            border: '1px solid var(--border-muted)',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            fontSize: '11px',
                          }}
                          formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Total spent']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                          {staffChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="expense-empty-chart">
                    <p>No staff expense records found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Slide 4: Activity-wise spending graph */}
            <div style={{ width: '100%', flexShrink: 0, padding: '0 8px', boxSizing: 'border-box' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">
                    <h3>Activity Spending Comparison</h3>
                    <p>Total cumulative costs compared across activity types</p>
                  </div>
                </div>
                {activityChartData.length > 0 ? (
                  <div className="expense-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={activityChartData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border-muted)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <YAxis type="category" dataKey="activity" width={110} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} />
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
                        <Bar dataKey="amount" fill="var(--info)" radius={[0, 4, 4, 0]} maxBarSize={20} />
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
          {[0, 1, 2, 3].map((idx) => (
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

      {/* Operational Spending Ledger */}
      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-header-bar" style={{ padding: '24px 24px 0 24px' }}>
          <div className="table-title">Operational Spending Ledger</div>
        </div>

        {/* Responsive Report Cards display */}
        <div style={{ padding: '24px' }}>
          {filteredReports.length > 0 ? (
            <div className="report-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredReports.map((report) => {
                const orgName = report.institutionName || report.hospitalName || report.conferenceName || report.location || 'Unknown Location';
                const totalCost = report.costOfVisit ?? 0;
                const staffName = staffNameById[report.staffId] || report.staffName;
                const staffAvatar = staffAvatarById[report.staffId] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80';
                
                // Deterministic client breakdown percentages based on activity type
                const isHospital = report.activityType.toLowerCase().includes('hospital') || report.meetingType === 'Hospital' || !!report.hospitalName;
                const isConference = report.activityType.toLowerCase().includes('conference') || report.meetingType === 'Conference' || !!report.conferenceName;
                
                let pTravel = 45;
                let pLodging = 35;
                let pMisc = 20;
                
                if (isHospital) {
                  pTravel = 35;
                  pLodging = 40;
                  pMisc = 25;
                } else if (isConference) {
                  pTravel = 30;
                  pLodging = 50;
                  pMisc = 20;
                }
                
                const cTravel = Math.round(totalCost * (pTravel / 100));
                const cLodging = Math.round(totalCost * (pLodging / 100));
                const cMisc = totalCost - cTravel - cLodging;

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
                    {/* Admin Specific Card Header with Staff Avatar and Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
                      {staffAvatar ? (
                        <img
                          src={staffAvatar}
                          alt={staffName}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-muted)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--info))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.85rem'
                          }}
                        >
                          {getInitials(staffName)}
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {staffName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {report.department}
                        </div>
                      </div>
                    </div>

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
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{staffName}</span>
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
                        {report.marketingObservation || report.observations || 'No observation notes logged.'}
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
                Try adjusting your date range constraints, staff selection or month filters.
              </p>
            </div>
          )}
        </div>

        {/* Ledger total footer */}
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
