// src/components/results/ExportOptions.jsx
import React, { useState } from 'react';
import './ExportOptions.css';

const ExportOptions = ({ data = [], filename = 'scraped-data' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportStatus, setExportStatus] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="export-options export-options-disabled">
        <p>No data available to export</p>
      </div>
    );
  }

  const handleExport = (format) => {
    setExportFormat(format);
    setIsExporting(true);
    
    try {
      switch (format) {
        case 'csv':
          exportCSV();
          break;
        case 'json':
          exportJSON();
          break;
        case 'excel':
          exportExcel();
          break;
        case 'xml':
          exportXML();
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      setExportStatus({ success: true, message: `Data exported as ${format.toUpperCase()} successfully` });
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({ success: false, message: `Failed to export data: ${error.message}` });
    } finally {
      setIsExporting(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setExportStatus(null);
      }, 3000);
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const csvRows = [];
    
    // Add headers row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + (value ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    // Combine rows into single string
    const csvString = csvRows.join('\n');
    
    // Create and download file
    downloadFile(csvString, `${filename}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    if (!data.length) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, `${filename}.json`, 'application/json');
  };

  const exportExcel = () => {
    // In a real application, you'd use a library like xlsx
    // For this example, we'll just export CSV and inform the user
    exportCSV();
    setExportStatus({ 
      success: true, 
      message: 'Data exported as CSV. For true Excel format, connect the backend service.' 
    });
  };

  const exportXML = () => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    
    // Create XML structure
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<data>\n';
    
    for (const row of data) {
      xmlContent += '  <item>\n';
      for (const header of headers) {
        const value = row[header] ?? '';
        // Escape XML special characters
        const escaped = ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        xmlContent += `    <${header}>${escaped}</${header}>\n`;
      }
      xmlContent += '  </item>\n';
    }
    
    xmlContent += '</data>';
    
    downloadFile(xmlContent, `${filename}.xml`, 'application/xml');
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-options">
      <div className="export-header">
        <h3>Export Data</h3>
        <p>Download your scraped data in multiple formats</p>
      </div>
      
      <div className="export-buttons">
        <button
          className={`export-button csv ${exportFormat === 'csv' ? 'selected' : ''}`}
          onClick={() => handleExport('csv')}
          disabled={isExporting}
        >
          <div className="button-icon">CSV</div>
          <span>Comma Separated</span>
        </button>
        
        <button
          className={`export-button json ${exportFormat === 'json' ? 'selected' : ''}`}
          onClick={() => handleExport('json')}
          disabled={isExporting}
        >
          <div className="button-icon">JSON</div>
          <span>JavaScript Object</span>
        </button>
        
        <button
          className={`export-button excel ${exportFormat === 'excel' ? 'selected' : ''}`}
          onClick={() => handleExport('excel')}
          disabled={isExporting}
        >
          <div className="button-icon">XLS</div>
          <span>Excel Spreadsheet</span>
        </button>
        
        <button
          className={`export-button xml ${exportFormat === 'xml' ? 'selected' : ''}`}
          onClick={() => handleExport('xml')}
          disabled={isExporting}
        >
          <div className="button-icon">XML</div>
          <span>Extensible Markup</span>
        </button>
      </div>
      
      {exportStatus && (
        <div className={`export-status ${exportStatus.success ? 'success' : 'error'}`}>
          {exportStatus.message}
        </div>
      )}
      
      {isExporting && (
        <div className="export-loading">
          <div className="loading-spinner small"></div>
          <span>Preparing export...</span>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;