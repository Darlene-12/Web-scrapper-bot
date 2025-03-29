// src/components/results/ResultsTable.jsx
import React, { useState } from 'react';
import './ResultsTable.css';

const ResultsTable = ({ data = [], loading = false }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // If no data is provided, return placeholder
  if (data.length === 0) {
    return loading ? (
      <div className="results-loading">
        <div className="loading-spinner"></div>
        <p>Fetching data...</p>
      </div>
    ) : (
      <div className="results-empty">
        <p>No data available. Start a scraping task to see results here.</p>
      </div>
    );
  }

  // Get table headers from the first data object
  const headers = Object.keys(data[0]);

  // Handle sorting logic
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;

    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    if (typeof valueA === 'string') {
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    } else {
      if (sortDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    }
  });

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="results-table-container">
      <div className="table-controls">
        <div className="table-info">
          Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, data.length)} of {data.length} results
        </div>
        <div className="rows-per-page">
          <label htmlFor="rows-select">Rows per page:</label>
          <select 
            id="rows-select"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th 
                  key={header} 
                  onClick={() => handleSort(header)}
                  className={sortColumn === header ? `sorted-${sortDirection}` : ''}
                >
                  {header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')}
                  {sortColumn === header && (
                    <span className="sort-icon">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`}>
                    {typeof row[header] === 'boolean' 
                      ? row[header] ? 'Yes' : 'No'
                      : row[header] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => paginate(1)} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            &laquo;
          </button>
          <button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            &lsaquo;
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageToShow;
            if (totalPages <= 5) {
              pageToShow = i + 1;
            } else if (currentPage <= 3) {
              pageToShow = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageToShow = totalPages - 4 + i;
            } else {
              pageToShow = currentPage - 2 + i;
            }
            
            return (
              <button
                key={i}
                onClick={() => paginate(pageToShow)}
                className={`pagination-button ${currentPage === pageToShow ? 'active' : ''}`}
              >
                {pageToShow}
              </button>
            );
          })}
          
          <button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            &rsaquo;
          </button>
          <button 
            onClick={() => paginate(totalPages)} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;