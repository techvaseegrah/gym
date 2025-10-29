import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Utility function to export data to Excel
export const exportToExcel = (data, fileName, sheetName = 'Sheet1') => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Export the workbook
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// Utility function to export data to PDF
export const exportToPDF = (data, columns, fileName, title = 'Attendance Report') => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Add table using autotable
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => {
      // Handle nested properties
      if (col.key.includes('.')) {
        return col.key.split('.').reduce((obj, key) => obj && obj[key], row) || '';
      }
      return row[col.key] || '';
    })),
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });
  
  // Save the PDF
  doc.save(`${fileName}.pdf`);
};

// Utility function to format attendance data for export
export const formatAttendanceDataForExport = (attendanceData) => {
  return attendanceData.map(day => {
    // Format check-ins
    const checkIns = day.checkIns
      .filter(p => !p.late)
      .map(p => new Date(p.time).toLocaleTimeString())
      .join(', ');
    
    // Format check-outs (including late ones)
    const checkOuts = [
      ...day.checkIns.filter(p => p.late),
      ...day.checkOuts
    ]
    .map(p => new Date(p.time).toLocaleTimeString())
    .join(', ');
    
    // Format date
    const date = new Date(day.date);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    
    return {
      date: formattedDate,
      checkIns: checkIns || '-',
      checkOuts: checkOuts || '-',
      duration: day.duration || '00:00:00'
    };
  });
};

// Utility function to format admin attendance data for export
export const formatAdminAttendanceDataForExport = (attendanceData) => {
  return attendanceData.map(record => {
    // Format check-ins
    const checkIns = record.checkIns
      .map(p => {
        const time = new Date(p.time).toLocaleTimeString();
        return p.missed ? `${time} (Missed)` : time;
      })
      .join(', ');
    
    // Format check-outs
    const checkOuts = record.checkOuts
      .map(p => {
        const time = new Date(p.time).toLocaleTimeString();
        return p.late ? `${time} (Late)` : time;
      })
      .join(', ');
    
    // Format date
    const date = new Date(record.date);
    const formattedDate = `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear().toString().slice(-2)}`;
    
    return {
      fighterName: record.fighterName,
      rfid: record.rfid,
      date: formattedDate,
      checkIns: checkIns || '-',
      checkOuts: checkOuts || '-',
      duration: record.duration || '00:00:00'
    };
  });
};