'use client';

import { MarketReport } from '../types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const exportToPDF = async (
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
  },
  totals: {
    totalSpent: number;
    averageCost: number;
    staffWithExpenses: number;
    topStaffSpender: { name: string; amount: number } | null;
  },
  chartsGridSelector?: string
) => {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Compute status totals
  let totalCount = reports.length;
  let totalAmount = reports.reduce((sum, r) => sum + (r.costOfVisit ?? 0), 0);

  let approvedCount = 0;
  let approvedAmount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  let rejectedCount = 0;
  let rejectedAmount = 0;

  reports.forEach((r) => {
    const cost = r.costOfVisit ?? 0;
    if (r.status === 'Approved') {
      approvedCount++;
      approvedAmount += cost;
    } else if (r.status === 'Pending') {
      pendingCount++;
      pendingAmount += cost;
    } else if (r.status === 'Rejected') {
      rejectedCount++;
      rejectedAmount += cost;
    }
  });

  // Page 1 Header & Layout Setup
  const drawPageHeader = (pageNumber: number) => {
    if (pageNumber === 1) {
      // Branding Accent Line
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.rect(margin, margin, 5, 12, 'F');

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39); // Gray-900
      doc.text('MRMW Expense Report', margin + 8, margin + 8);

      // Generated Date Info
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, margin + 7, { align: 'right' });

      // Divider
      doc.setDrawColor(229, 231, 235); // Gray-200
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 16, pageWidth - margin, margin + 16);

      // Summary Cards Section
      const cardY = margin + 20;
      const cardW = (contentWidth - 9) / 4; // ~42.75mm each
      const cardH = 18;

      const drawCard = (x: number, title: string, count: number, amount: number, colors: { bg: [number, number, number], border: [number, number, number], text: [number, number, number] }) => {
        doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.rect(x, cardY, cardW, cardH, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(title.toUpperCase(), x + 4, cardY + 5.5);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(formatCurrency(amount), x + 4, cardY + 11.5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(`${count} record${count !== 1 ? 's' : ''}`, x + 4, cardY + 15.5);
      };

      // Card 1: Total
      drawCard(margin, 'Total Expenses', totalCount, totalAmount, {
        bg: [243, 244, 246], // Slate 100
        border: [209, 213, 219], // Slate 300
        text: [31, 41, 55] // Slate 800
      });

      // Card 2: Approved
      drawCard(margin + cardW + 3, 'Approved', approvedCount, approvedAmount, {
        bg: [240, 253, 244], // Green 50
        border: [187, 247, 208], // Green 200
        text: [22, 101, 52] // Green 800
      });

      // Card 3: Pending
      drawCard(margin + (cardW + 3) * 2, 'Pending', pendingCount, pendingAmount, {
        bg: [254, 252, 232], // Yellow 50
        border: [254, 240, 138], // Yellow 200
        text: [133, 77, 14] // Yellow 800
      });

      // Card 4: Rejected
      drawCard(margin + (cardW + 3) * 3, 'Rejected', rejectedCount, rejectedAmount, {
        bg: [254, 242, 242], // Red 50
        border: [254, 202, 202], // Red 200
        text: [153, 27, 27] // Red 800
      });
    }
  };

  // Setup Table Header Drawing Function
  const drawTableHeader = (y: number) => {
    doc.setFillColor(31, 41, 55); // Gray-800
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let headerX = margin;
    cols.forEach((col) => {
      const alignText = col.name === 'Amount' ? 'right' : 'left';
      const textX = col.name === 'Amount' ? headerX + col.w - 2 : headerX + 2;
      doc.text(col.name, textX, y + 5.5, { align: alignText });
      headerX += col.w;
    });
  };

  // Define Columns configuration (Widths sum to exact contentWidth = 180mm)
  const cols = [
    { name: 'Expense Title', w: 45 },
    { name: 'Amount', w: 20 },
    { name: 'Category', w: 24 },
    { name: 'Organisation/Hospital', w: 30 },
    { name: 'Submitted By', w: 27 },
    { name: 'Status', w: 17 },
    { name: 'Created Date', w: 17 }
  ];

  const rowHeight = 7.5;
  let currentY = margin + 43; // Table starts at 58mm on Page 1
  let pageNumber = 1;

  drawPageHeader(1);
  drawTableHeader(currentY);
  currentY += 8;

  reports.forEach((report, index) => {
    // Page overflow safety checks
    if (currentY + rowHeight > pageHeight - margin - 15) {
      doc.addPage();
      pageNumber++;
      currentY = margin + 10;
      drawPageHeader(pageNumber);
      drawTableHeader(currentY);
      currentY += 8;
    }

    // Alternating rows background color
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 249, isEven ? 255 : 250, isEven ? 255 : 251); // Alternate with Gray 50
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');

    // Horizontal bottom grid line
    doc.setDrawColor(243, 244, 246); // Gray-100
    doc.setLineWidth(0.25);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    const staffName = staffNameById[report.staffId] || report.staffName;
    const institutionHospital = report.institutionName || report.hospitalName || report.conferenceName || 'N/A';
    const expenseTitle = `${report.activityType} - ${institutionHospital}`;

    // Text Truncation helper to prevent cell overflow
    const truncate = (text: string, maxLen: number) => {
      if (text.length > maxLen) return text.slice(0, maxLen - 2) + '…';
      return text;
    };

    let cellX = margin;

    // Col 1: Expense Title
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text(truncate(expenseTitle, 28), cellX + 2, currentY + 4.8);
    cellX += cols[0].w;

    // Col 2: Amount
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo
    const amountVal = report.costOfVisit !== undefined ? formatCurrency(report.costOfVisit) : '₹0';
    doc.text(amountVal, cellX + cols[1].w - 2, currentY + 4.8, { align: 'right' });
    cellX += cols[1].w;

    // Col 3: Category
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(truncate(report.activityType, 16), cellX + 2, currentY + 4.8);
    cellX += cols[2].w;

    // Col 4: Organisation/Hospital
    doc.text(truncate(institutionHospital, 20), cellX + 2, currentY + 4.8);
    cellX += cols[3].w;

    // Col 5: Submitted By
    doc.text(truncate(staffName, 17), cellX + 2, currentY + 4.8);
    cellX += cols[4].w;

    // Col 6: Status
    const statusVal = report.status;
    let statusTextColor = [107, 114, 128]; // Default Gray
    if (statusVal === 'Approved') statusTextColor = [22, 101, 52];
    else if (statusVal === 'Pending') statusTextColor = [180, 83, 9];
    else if (statusVal === 'Rejected') statusTextColor = [153, 27, 27];

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(statusTextColor[0], statusTextColor[1], statusTextColor[2]);
    doc.text(statusVal, cellX + 2, currentY + 4.8);
    cellX += cols[5].w;

    // Col 7: Created Date
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(report.date, cellX + 2, currentY + 4.8);

    currentY += rowHeight;
  });

  // Totals Row at the bottom of the table
  if (currentY + rowHeight > pageHeight - margin - 15) {
    doc.addPage();
    pageNumber++;
    currentY = margin + 10;
    drawPageHeader(pageNumber);
    drawTableHeader(currentY);
    currentY += 8;
  }

  // Draw Bottom Totals Box
  doc.setFillColor(243, 244, 246); // Gray-100
  doc.rect(margin, currentY, contentWidth, rowHeight + 1, 'F');
  
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.line(margin, currentY + rowHeight + 1, pageWidth - margin, currentY + rowHeight + 1);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text('TOTAL CUMULATIVE EXPENSES', margin + 2, currentY + 5.5);

  doc.setTextColor(79, 70, 229);
  doc.text(formatCurrency(totalAmount), margin + cols[0].w + cols[1].w - 2, currentY + 5.5, { align: 'right' });

  // Two-pass execution for page footer numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Page bottom accent line
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    
    doc.text('MRMW Expense Report • System Ledger Export', margin, pageHeight - 9);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  doc.save(`mrmw-expenses-report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
