import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FSReviewOutput } from "@/types/fs/fs";

export const generateFinancialStatusPDF = (data: FSReviewOutput) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let finalY = 0;

  // Helper to remove emojis
  const cleanText = (text: string) => {
    // Remove emojis, variation selectors, and other non-standard symbols
    // Keep ASCII, Latin-1, and specific symbols like Euro (€)
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2B50}\u{231A}-\u{231B}\u{23E9}-\u{23EC}\u{23F0}\u{23F3}\u{25FD}\u{25FE}\uFE0F]/gu, '').trim();
  };

  // Add header with colored top bar
  const addPageHeader = (pageNum: number) => {
    doc.setFillColor(41, 98, 255); // Professional blue
    doc.rect(0, 0, pageWidth, 8, "F");
    
    if (pageNum > 1) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Financial Status Report", 14, pageHeight - 10);
      doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    }
  };

  // Page 1 Header
  addPageHeader(1);

  // Title with modern styling
  doc.setFontSize(26);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Status Report", 14, 22);

  // Subtitle line
  doc.setFillColor(220, 220, 220);
  doc.rect(14, 26, 60, 0.5, "F");

  // Date with icon-like styling
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })}`, 14, 32);

  // Verdict Banner with shadow effect
  doc.setFontSize(15);
  const isFail = data.E.verdict.includes("NOT FIT") || data.E.verdict.includes("ERRORS");
  
  // Shadow
  doc.setFillColor(0, 0, 0);
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  doc.roundedRect(14.5, 40.5, pageWidth - 28, 14, 2, 2, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  // Main banner
  doc.setFillColor(isFail ? 220 : 34, isFail ? 38 : 197, isFail ? 38 : 94);
  doc.roundedRect(14, 40, pageWidth - 28, 14, 2, 2, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(cleanText(data.E.verdict), pageWidth / 2, 49, { align: "center" });

  finalY = 62;

  // Count totals
  const confirmedCount = data.A.items.length;
  const criticalCount = data.B.items.length;
  const disclosureCount = data.C.items.length;

  // Section A: Confirmed Correct Items
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text(`${cleanText(data.A.title)} (${confirmedCount})`, 14, finalY);
  
  // Section decorative line
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 2, 50, finalY + 2);

  if (data.A.items.length > 0) {
    autoTable(doc, {
      startY: finalY + 6,
      head: [["Test ID", "Area", "Details"]],
      body: data.A.items.map((item) => [item.test_id, item.area, item.details]),
      theme: "striped",
      headStyles: { 
        fillColor: [22, 163, 74],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50 }
      }
    });
    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No tests confirmed in this section.", 14, finalY + 8);
    finalY += 18;
  }

  // Section B: Critical Errors
  if (finalY > pageHeight - 40) { 
    doc.addPage(); 
    addPageHeader(2);
    finalY = 20; 
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text(`${cleanText(data.B.title)} (${criticalCount})`, 14, finalY);
  
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 2, 50, finalY + 2);

  if (data.B.items.length > 0) {
    const bRows = data.B.items.map((item) => [
      item.test_id,
      item.description,
      `Reported: ${item.reported_value ?? 'N/A'}\nExpected: ${item.expected_value ?? 'N/A'}`,
      item.financial_impact
    ]);

    autoTable(doc, {
      startY: finalY + 6,
      head: [["ID", "Description", "Discrepancy", "Impact"]],
      body: bRows,
      theme: "grid",
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: 'bold', halign: 'center', fillColor: [254, 242, 242] },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 }
      }
    });
    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No critical errors detected.", 14, finalY + 8);
    finalY += 18;
  }

  // Section C: Disclosure Breaches
  if (finalY > pageHeight - 40) { 
    doc.addPage(); 
    addPageHeader(3);
    finalY = 20; 
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8);
  doc.text(`${cleanText(data.C.title)} (${disclosureCount})`, 14, finalY);
  
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 2, 60, finalY + 2);

  if (data.C.items.length > 0) {
    const cRows = data.C.items.map((item) => [
      item.test_id,
      item.severity.toUpperCase(),
      item.description,
      item.suggested_fix
    ]);

    autoTable(doc, {
      startY: finalY + 6,
      head: [["ID", "Severity", "Description", "Suggested Fix"]],
      body: cRows,
      theme: "striped",
      headStyles: { 
        fillColor: [234, 179, 8],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      alternateRowStyles: { fillColor: [254, 252, 232] },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 50 }
      }
    });
    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No disclosure breaches found.", 14, finalY + 8);
    finalY += 18;
  }

  // Section D: Reconciliation Tables
  if (finalY > pageHeight - 40) { 
    doc.addPage(); 
    addPageHeader(4);
    finalY = 20; 
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text(cleanText(data.D.title), 14, finalY);
  
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 2, 60, finalY + 2);
  
  finalY += 10;

  // Render reconciliation tables
  const tables = [
    { key: 'retained_earnings', label: 'Retained Earnings' },
    { key: 'borrowings', label: 'Borrowings' },
    { key: 'deferred_tax', label: 'Deferred Tax' },
    { key: 'equity', label: 'Equity' }
  ];

  for (const table of tables) {
    if (data.D.tables[table.key]) {
      if (finalY > pageHeight - 40) { 
        doc.addPage(); 
        addPageHeader(5);
        finalY = 20; 
      }
      renderMiniTable(doc, table.label, data.D.tables[table.key], finalY);
      // @ts-ignore
      finalY = doc.lastAutoTable.finalY + 10;
    }
  }

  // Summary Footer
  if (finalY > pageHeight - 60) { 
    doc.addPage(); 
    addPageHeader(6);
    finalY = 20; 
  }

  finalY += 5;
  
  // Summary box with shadow
  doc.setFillColor(0, 0, 0);
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.roundedRect(14.5, finalY + 0.5, pageWidth - 28, 35, 2, 2, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, finalY, pageWidth - 28, 35, 2, 2, "F");
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, finalY, pageWidth - 28, 35, 2, 2, "S");

  // Summary title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("SUMMARY", 20, finalY + 8);

  const boxWidth = (pageWidth - 40) / 3;
  const boxStartY = finalY + 14;

  // Confirmed box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(18, boxStartY, boxWidth - 4, 16, 1, 1, "F");
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, boxStartY, boxWidth - 4, 16, 1, 1, "S");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74);
  doc.text(String(confirmedCount), 18 + (boxWidth - 4) / 2, boxStartY + 8, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Confirmed", 18 + (boxWidth - 4) / 2, boxStartY + 13, { align: 'center' });

  // Critical box
  const criticalX = 18 + boxWidth;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(criticalX, boxStartY, boxWidth - 4, 16, 1, 1, "F");
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.3);
  doc.roundedRect(criticalX, boxStartY, boxWidth - 4, 16, 1, 1, "S");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.text(String(criticalCount), criticalX + (boxWidth - 4) / 2, boxStartY + 8, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Critical Errors", criticalX + (boxWidth - 4) / 2, boxStartY + 13, { align: 'center' });

  // Disclosure box
  const disclosureX = 18 + boxWidth * 2;
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(disclosureX, boxStartY, boxWidth - 4, 16, 1, 1, "F");
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.3);
  doc.roundedRect(disclosureX, boxStartY, boxWidth - 4, 16, 1, 1, "S");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(234, 179, 8);
  doc.text(String(disclosureCount), disclosureX + (boxWidth - 4) / 2, boxStartY + 8, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Disclosures", disclosureX + (boxWidth - 4) / 2, boxStartY + 13, { align: 'center' });

  // Save
  doc.save("financial-audit-report.pdf");
};

const renderMiniTable = (doc: jsPDF, title: string, tableData: any, startY: number) => {
  if (!tableData) return;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(title, 14, startY);

  const head = [["Description", ...tableData.columns]];
  const body = tableData.rows.map((row: any) => [row.description, ...row.values]);

  autoTable(doc, {
    startY: startY + 3,
    head: head,
    body: body,
    theme: "plain",
    headStyles: { 
      fillColor: [241, 245, 249],
      textColor: 40,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 2.5
    },
    styles: { 
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    columnStyles: { 
      0: { fontStyle: 'bold', textColor: 60 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
};