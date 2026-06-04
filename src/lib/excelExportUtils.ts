'use client';

import * as XLSX from 'xlsx';
import { MarketReport } from '../types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const autoSizeColumns = (ws: XLSX.WorkSheet, data: any[][]) => {
  if (!data || data.length === 0) return;
  const colWidths = data[0].map((_, colIndex) => {
    let maxLen = 0;
    data.forEach(row => {
      if (row[colIndex] !== undefined && row[colIndex] !== null) {
        const strLen = String(row[colIndex]).length;
        if (strLen > maxLen) {
          maxLen = strLen;
        }
      }
    });
    return { wch: Math.max(maxLen + 3, 10) };
  });
  ws['!cols'] = colWidths;
};

export const exportExpensesToExcel = (
  reports: MarketReport[],
  staffNameById: Record<string, string>,
  filters: {
    staff: string;
    month: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
    category?: string;
    hospital?: string;
    status?: string;
  }
) => {
  const totalAmount = reports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0);

  const headers = [
    'Expense Title',
    'Amount',
    'Category',
    'Organisation/Hospital',
    'Submitted By',
    'Status',
    'Created Date'
  ];

  const rows = reports.map((report) => {
    const staffName = staffNameById[report.staffId] || report.staffName;
    const institutionHospital = report.institutionName || report.hospitalName || report.conferenceName || 'N/A';
    return [
      `${report.activityType} - ${institutionHospital}`,
      report.costOfVisit !== undefined ? formatCurrency(report.costOfVisit) : '₹0',
      report.activityType,
      institutionHospital,
      staffName,
      report.status,
      report.date
    ];
  });

  const totalsRow = [
    'TOTAL EXPENSES',
    formatCurrency(totalAmount),
    '', // Category
    '', // Organisation/Hospital
    '', // Submitted By
    '', // Status
    ''  // Created Date
  ];

  const metadataRows = [
    ['MRMW EXPENSE TRACKER REPORT'],
    [`Generated At: ${new Date().toLocaleString()}`],
    [`Total Records Count: ${reports.length}`],
    [] // spacing row
  ];

  const wsData = [...metadataRows, headers, ...rows, totalsRow];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  autoSizeColumns(ws, wsData);

  XLSX.utils.book_append_sheet(wb, ws, 'Expenses Ledger');
  XLSX.writeFile(wb, `mrmw-expenses-report_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
