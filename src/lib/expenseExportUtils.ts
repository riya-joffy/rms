'use client';

import { MarketReport } from '../types';

// XML helper to escape unsafe characters
const escapeXml = (unsafe: any): string => {
  if (unsafe === undefined || unsafe === null) return '';
  const str = String(unsafe);
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

// ==========================================
// 1. XML EXPORT
// ==========================================
export const exportToXML = (
  reports: MarketReport[],
  staffNameById: Record<string, string>,
  filters: { staff: string; month: string },
  totals: {
    totalSpent: number;
    averageCost: number;
    staffWithExpenses: number;
    topStaffSpender: { name: string; amount: number } | null;
  }
) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<StaffExpenseAnalytics>\n`;
  
  // Metadata Section
  xml += `  <Metadata>\n`;
  xml += `    <GeneratedAt>${escapeXml(new Date().toISOString())}</GeneratedAt>\n`;
  xml += `    <ActiveFilters>\n`;
  xml += `      <StaffFilter>${escapeXml(filters.staff)}</StaffFilter>\n`;
  xml += `      <MonthFilter>${escapeXml(filters.month)}</MonthFilter>\n`;
  xml += `    </ActiveFilters>\n`;
  xml += `  </Metadata>\n`;

  // Summary Metrics Section
  xml += `  <SummaryMetrics>\n`;
  xml += `    <TotalStaffSpending>${totals.totalSpent}</TotalStaffSpending>\n`;
  xml += `    <TotalStaffSpendingFormatted>${escapeXml(formatCurrency(totals.totalSpent))}</TotalStaffSpendingFormatted>\n`;
  xml += `    <AverageCostPerReport>${totals.averageCost}</AverageCostPerReport>\n`;
  xml += `    <AverageCostPerReportFormatted>${escapeXml(formatCurrency(totals.averageCost))}</AverageCostPerReportFormatted>\n`;
  xml += `    <StaffWithExpensesCount>${totals.staffWithExpenses}</StaffWithExpensesCount>\n`;
  if (totals.topStaffSpender) {
    xml += `    <TopSpender>\n`;
    xml += `      <StaffName>${escapeXml(totals.topStaffSpender.name)}</StaffName>\n`;
    xml += `      <Amount>${totals.topStaffSpender.amount}</Amount>\n`;
    xml += `      <AmountFormatted>${escapeXml(formatCurrency(totals.topStaffSpender.amount))}</AmountFormatted>\n`;
    xml += `    </TopSpender>\n`;
  } else {
    xml += `    <TopSpender>None</TopSpender>\n`;
  }
  xml += `  </SummaryMetrics>\n`;

  // Detailed Expense Reports
  xml += `  <StaffExpenseReports>\n`;
  reports.forEach((report) => {
    const staffName = staffNameById[report.staffId] || report.staffName;
    const institutionHospital = report.institutionName || report.hospitalName || report.conferenceName || 'N/A';
    
    xml += `    <Report>\n`;
    xml += `      <Id>${escapeXml(report.id)}</Id>\n`;
    xml += `      <StaffId>${escapeXml(report.staffId)}</StaffId>\n`;
    xml += `      <StaffName>${escapeXml(staffName)}</StaffName>\n`;
    xml += `      <ActivityType>${escapeXml(report.activityType)}</ActivityType>\n`;
    xml += `      <InstitutionHospital>${escapeXml(institutionHospital)}</InstitutionHospital>\n`;
    xml += `      <Location>${escapeXml(report.location || '—')}</Location>\n`;
    xml += `      <Date>${escapeXml(report.date)}</Date>\n`;
    xml += `      <Time>${escapeXml(report.time)}</Time>\n`;
    xml += `      <ApprovalStatus>${escapeXml(report.status)}</ApprovalStatus>\n`;
    xml += `      <ExpenseBreakdown>\n`;
    xml += `        <CostOfVisit>${report.costOfVisit ?? 0}</CostOfVisit>\n`;
    xml += `        <CostOfVisitFormatted>${escapeXml(formatCurrency(report.costOfVisit ?? 0))}</CostOfVisitFormatted>\n`;
    xml += `      </ExpenseBreakdown>\n`;
    xml += `      <TotalCost>${report.costOfVisit ?? 0}</TotalCost>\n`;
    xml += `      <MarketingObservation>${escapeXml(report.marketingObservation || '')}</MarketingObservation>\n`;
    xml += `      <Observations>${escapeXml(report.observations || '')}</Observations>\n`;
    xml += `    </Report>\n`;
  });
  xml += `  </StaffExpenseReports>\n`;
  
  xml += `</StaffExpenseAnalytics>\n`;

  // Trigger Download
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `staff-expenses-export_${new Date().toISOString().slice(0, 10)}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==========================================
// 2. JPG SNAPSHOT EXPORT
// ==========================================
export const exportToJPG = async (
  elementSelector: string,
  fileName = 'expense-analytics-snapshot.jpg'
) => {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.querySelector(elementSelector);
  if (!element) {
    throw new Error(`Target element '${elementSelector}' not found`);
  }

  // Optimize rendering options for clean image
  const canvas = await html2canvas(element as HTMLElement, {
    useCORS: true,
    scale: 2, // High DPI
    backgroundColor: '#030712', // Match SaaS HSL(224, 71%, 4%) / HSL(224, 71%, 2%)
    logging: false,
    onclone: (clonedDoc) => {
      // Clean up cloned element: remove filter selects or buttons if necessary
      const clonedEl = clonedDoc.querySelector(elementSelector) as HTMLElement;
      if (clonedEl) {
        // Ensure fonts load nicely
        clonedEl.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
      }
    }
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==========================================
// 3. PDF EXECUTIVE REPORT EXPORT
// ==========================================
export const exportToPDF = async (
  reports: MarketReport[],
  staffNameById: Record<string, string>,
  filters: { staff: string; month: string },
  totals: {
    totalSpent: number;
    averageCost: number;
    staffWithExpenses: number;
    topStaffSpender: { name: string; amount: number } | null;
  },
  chartsGridSelector: string
) => {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  // Initialize jsPDF document (A4 page format)
  // A4 size: 210mm x 297mm. Margins: 15mm. Printable width: 180mm.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Let's create a beautiful corporate dark-themed styled header & summaries
  // ----------------------------------------------------
  // Page 1: EXECUTIVE BRIEF & CHART SNAPSHOTS
  // ----------------------------------------------------
  
  // Brand Header Panel (drawn with vectors for maximum crispness)
  doc.setFillColor(3, 7, 18); // HSL(224, 71%, 4%) / HSL(224, 71%, 2%)
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top header accents
  doc.setFillColor(124, 58, 237); // Purple theme HSL(263, 90%, 65%)
  doc.rect(margin, margin, 4, 12, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MARKETPULSE RMS', margin + 8, margin + 8.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text('ENTERPRISE EXPENSE ANALYTICS & AUDIT REPORT', margin + 8, margin + 13.5);

  // Metadata block (right aligned)
  doc.setFontSize(8.5);
  doc.text(`DATE GENERATED: ${new Date().toLocaleString()}`, pageWidth - margin, margin + 6, { align: 'right' });
  doc.text(`STAFF SCOPE: ${filters.staff === 'All' ? 'All Staff Members' : staffNameById[filters.staff] || filters.staff}`, pageWidth - margin, margin + 10, { align: 'right' });
  doc.text(`MONTH SCOPE: ${filters.month === 'All' ? 'All Operational Months' : filters.month}`, pageWidth - margin, margin + 14, { align: 'right' });

  // Divider Line
  doc.setDrawColor(31, 41, 55); // border-muted HSL(217, 32%, 17%)
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

  // Executive Summary Card Panels
  // We'll draw 4 cards side-by-side or in a 2x2 grid. Let's do a 2x2 grid for better sizing.
  // Card layout:
  // Card 1: Total Spending | Card 2: Average / Report
  // Card 3: Staff with Expenses | Card 4: Peak Spender
  const cardW = (contentWidth - 8) / 2; // 86mm each
  const cardH = 26;
  const row1Y = margin + 24;
  const row2Y = row1Y + cardH + 8;

  const drawCard = (x: number, y: number, title: string, value: string, footer: string, accentColor: [number, number, number]) => {
    // Card Background
    doc.setFillColor(15, 23, 42); // HSLA(224, 40%, 8%, 0.65)
    doc.setDrawColor(31, 41, 55);
    doc.rect(x, y, cardW, cardH, 'FD');

    // Accent line at top
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(x, y, cardW, 2.5, 'F');

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(title.toUpperCase(), x + 6, y + 8.5);

    // Value
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(value, x + 6, y + 16.5);

    // Footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(footer, x + 6, y + 22.5);
  };

  // Draw the cards
  drawCard(margin, row1Y, 'Total Staff Spending', formatCurrency(totals.totalSpent), `${reports.length} expense reports in scope`, [168, 85, 247]);
  drawCard(margin + cardW + 8, row1Y, 'Average Expense / Report', formatCurrency(totals.averageCost), 'Mean visit cost in filters', [16, 185, 129]);
  drawCard(margin, row2Y, 'Staff With Expenses', String(totals.staffWithExpenses), 'Registered field representatives', [14, 165, 233]);
  
  const peakSpenderName = totals.topStaffSpender ? totals.topStaffSpender.name.split(' ')[0] : '—';
  const peakSpenderVal = totals.topStaffSpender ? formatCurrency(totals.topStaffSpender.amount) : 'No data';
  drawCard(margin + cardW + 8, row2Y, 'Top Spender', peakSpenderName, `Total spent: ${peakSpenderVal}`, [245, 158, 11]);

  // Section: Visual Analytics & Chart Trends
  const chartsTitleY = row2Y + cardH + 12;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('VISUAL ANALYTICS & TRENDS', margin, chartsTitleY);

  // Divider under section header
  doc.setDrawColor(31, 41, 55);
  doc.line(margin, chartsTitleY + 2, pageWidth - margin, chartsTitleY + 2);

  // Capture Recharts charts to embed
  const chartsEl = document.querySelector(chartsGridSelector);
  if (chartsEl) {
    try {
      const canvas = await html2canvas(chartsEl as HTMLElement, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#030712',
        logging: false,
      });
      const chartsImgData = canvas.toDataURL('image/jpeg', 0.90);
      
      // We want to fit the charts nicely in the remaining space of Page 1
      // Remaining page height = 297 - chartsTitleY - margin - 6
      const targetY = chartsTitleY + 6;
      const targetH = pageHeight - targetY - margin;
      
      // Calculate aspect ratio of captured canvas
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const aspect = canvasH / canvasW;

      // Draw image fitting contentWidth
      const imgH = contentWidth * aspect;
      const renderH = Math.min(imgH, targetH);
      const renderW = renderH / aspect;
      const renderX = margin + (contentWidth - renderH / aspect) / 2;

      doc.addImage(chartsImgData, 'JPEG', renderX, targetY, renderW, renderH);
    } catch (e) {
      console.error('Error capturing charts for PDF:', e);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('[Charts omitted due to render capture constraint]', margin, chartsTitleY + 12);
    }
  } else {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('[No visual charts found to capture]', margin, chartsTitleY + 12);
  }

  // Footer for page 1
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('MarketPulse RMS • Confidential Operational Ledger', margin, pageHeight - 8);
  doc.text('Page 1 of 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // ----------------------------------------------------
  // Page 2: DETAILED STAFF EXPENSE TABLE
  // ----------------------------------------------------
  doc.addPage();
  
  // Page 2 dark background
  doc.setFillColor(3, 7, 18);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top header for page 2
  doc.setFillColor(124, 58, 237);
  doc.rect(margin, margin, 4, 10, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('STAFF EXPENSE LEDGER', margin + 8, margin + 7.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`TOTAL AUDITED REPORTS: ${reports.length}`, pageWidth - margin, margin + 7.5, { align: 'right' });

  // Divider
  doc.setDrawColor(31, 41, 55);
  doc.line(margin, margin + 14, pageWidth - margin, margin + 14);

  // Draw detailed data table
  // Columns: ID (18), Staff (34), Activity (40), Location/Hosp (38), Date (20), Cost (16), Status (14) = 180 total
  const cols = [
    { name: 'ID', w: 18 },
    { name: 'Staff Name', w: 32 },
    { name: 'Activity Type', w: 36 },
    { name: 'Location / Hospital', w: 38 },
    { name: 'Date', w: 22 },
    { name: 'Cost', w: 18 },
    { name: 'Status', w: 16 }
  ];

  let currentY = margin + 22;
  const rowHeight = 8;
  const headerHeight = 9;

  // Draw Table Headers
  doc.setFillColor(15, 23, 42); // Header background
  doc.rect(margin, currentY, contentWidth, headerHeight, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);

  let headerX = margin;
  cols.forEach((col) => {
    // align Cost to the right
    const isCost = col.name === 'Cost';
    const alignX = isCost ? headerX + col.w - 2 : headerX + 2;
    doc.text(col.name, alignX, currentY + 6, { align: isCost ? 'right' : 'left' });
    headerX += col.w;
  });

  currentY += headerHeight;

  // Draw Rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);

  reports.forEach((report, index) => {
    // Check page boundaries (reserve space for page footer)
    if (currentY + rowHeight > pageHeight - margin - 10) {
      // Add Page Footer to old page before switching
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('MarketPulse RMS • Confidential Operational Ledger', margin, pageHeight - 8);
      doc.text(`Page 2`, pageWidth - margin, pageHeight - 8, { align: 'right' });

      doc.addPage();
      
      // Page background
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Table title continuing
      doc.setFillColor(124, 58, 237);
      doc.rect(margin, margin, 4, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('STAFF EXPENSE LEDGER (CONTINUED)', margin + 8, margin + 6);
      
      // Divider
      doc.setDrawColor(31, 41, 55);
      doc.line(margin, margin + 11, pageWidth - margin, margin + 11);

      currentY = margin + 16;

      // Draw Table Headers again
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, contentWidth, headerHeight, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(156, 163, 175);
      
      let nextHeaderX = margin;
      cols.forEach((col) => {
        const isCost = col.name === 'Cost';
        const alignX = isCost ? nextHeaderX + col.w - 2 : nextHeaderX + 2;
        doc.text(col.name, alignX, currentY + 6, { align: isCost ? 'right' : 'left' });
        nextHeaderX += col.w;
      });

      currentY += headerHeight;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Alternating rows bg color
    const isEven = index % 2 === 0;
    const r = isEven ? 9 : 15;
    const g = isEven ? 13 : 23;
    const b = isEven ? 26 : 42;
    doc.setFillColor(r, g, b);
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');

    // Bottom border for row
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    // Write row cell values
    const staffName = staffNameById[report.staffId] || report.staffName;
    const institutionHospital = report.institutionName || report.hospitalName || report.conferenceName || 'N/A';
    
    // Truncate text to avoid cell overflowing
    const truncate = (text: string, maxLen: number) => {
      if (text.length > maxLen) return text.slice(0, maxLen - 2) + '…';
      return text;
    };

    let cellX = margin;
    
    // REP ID
    doc.setTextColor(255, 255, 255);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(report.id.replace('REP-', ''), cellX + 2, currentY + 5);
    cellX += cols[0].w;
    
    // STAFF NAME
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(229, 231, 235);
    doc.text(truncate(staffName, 17), cellX + 2, currentY + 5);
    cellX += cols[1].w;

    // ACTIVITY TYPE
    doc.text(truncate(report.activityType, 20), cellX + 2, currentY + 5);
    cellX += cols[2].w;

    // LOCATION/HOSPITAL
    doc.text(truncate(institutionHospital, 20), cellX + 2, currentY + 5);
    cellX += cols[3].w;

    // DATE
    doc.text(report.date, cellX + 2, currentY + 5);
    cellX += cols[4].w;

    // COST (align right)
    const costText = report.costOfVisit !== undefined ? formatCurrency(report.costOfVisit) : '—';
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(168, 85, 247); // purple
    doc.text(costText, cellX + cols[5].w - 2, currentY + 5, { align: 'right' });
    cellX += cols[5].w;

    // STATUS badge color coding
    const statusVal = report.status;
    let statusColor: [number, number, number] = [156, 163, 175]; // default gray
    if (statusVal === 'Approved') {
      statusColor = [16, 185, 129]; // green
    } else if (statusVal === 'Rejected') {
      statusColor = [239, 68, 68]; // red
    } else if (statusVal === 'Pending') {
      statusColor = [245, 158, 11]; // orange
    }

    doc.setFillColor(statusColor[0] / 5, statusColor[1] / 5, statusColor[2] / 5); // very dark glow background
    doc.rect(cellX + 1, currentY + 2, cols[6].w - 2, 4, 'F');

    doc.setFontSize(6.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusVal.toUpperCase(), cellX + cols[6].w / 2, currentY + 4.8, { align: 'center' });

    currentY += rowHeight;
  });

  // Draw Ledger Total Footer Row
  const totalReportsCost = reports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0);
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, contentWidth, rowHeight + 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL EXPENSES SCOPE (${reports.length} REPORTS)`, margin + 2, currentY + 6.5);
  
  doc.setTextColor(168, 85, 247); // purple
  doc.setFontSize(9.5);
  doc.text(formatCurrency(totalReportsCost), pageWidth - margin - 2, currentY + 6.5, { align: 'right' });

  // Final Footer for page 2
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('MarketPulse RMS • Confidential Operational Ledger', margin, pageHeight - 8);
  doc.text(`Page 2`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Trigger download of PDF
  doc.save(`staff-expenses-report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
