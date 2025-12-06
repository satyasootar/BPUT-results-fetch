// src/utils/pdf.js
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exportToPDF = (data, filename = "results.pdf", title = "Results Report") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 15, { align: "center" });

  // Timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 25, {
    align: "center",
  });

  // Table
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => row[h]));

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 35,
    margin: { top: 35, right: 10, bottom: 10, left: 10 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
  });

  // Footer with page numbers
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(filename);
};

export const generatePDFReport = (jobData, resultsData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 10;

  // Header
  doc.setFontSize(18);
  doc.text("BPUT Results Report", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Job Info
  doc.setFontSize(12);
  doc.text("Job Information", 10, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.text(`Job ID: ${jobData.id}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Status: ${jobData.status}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Created: ${new Date(jobData.createdAt).toLocaleString()}`, 15, yPosition);
  yPosition += 5;
  doc.text(
    `Total Results: ${jobData.progress.total}`,
    15,
    yPosition
  );
  yPosition += 10;

  // Results Table
  if (resultsData && resultsData.length > 0) {
    doc.setFontSize(12);
    doc.text("Results Summary", 10, yPosition);
    yPosition += 7;

    const headers = Object.keys(resultsData[0]);
    const rows = resultsData.map((row) => headers.map((h) => row[h]));

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
      },
    });
  }

  return doc;
};
