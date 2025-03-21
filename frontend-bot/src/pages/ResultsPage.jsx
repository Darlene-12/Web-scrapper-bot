import React, { useState, useEffect } from 'react';
import { getScrapedHistory, deleteScrapedData } from '../api/api'; // Import API methods
import './ResultsPage.css';

const ResultsPage = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([
    { id: 1, url: 'example.com', keywords: 'excellent', date: '2023-10-01' },
    { id: 2, url: 'example2.com', keywords: 'poor', date: '2023-10-02' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Add useEffect to fetch real data
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await getScrapedHistory();
        if (response && response.data) {
          setResults(response.data);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Filter results based on search term
  const filteredResults = results.filter(item => 
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDownload = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to download');
      return;
    }
    
    console.log('Downloading selected items:', selectedItems);
    // Actual download logic would go here
    alert('Download started for selected items');
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete selected items through the API
      for (const id of selectedItems) {
        await deleteScrapedData(id);
      }
      
      // Update local state
      const updatedResults = results.filter(item => !selectedItems.includes(item.id));
      setResults(updatedResults);
      setSelectedItems([]);
      
      alert('Selected items deleted successfully');
    } catch (err) {
      console.error('Error deleting items:', err);
      setError('Failed to delete selected items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="results-page-container">
      <h2>View Scraped Results</h2>

      {/* Navigation Buttons */}
      <div className="nav-container">
        <div className="nav-buttons">
          <button 
            className="nav-button"
            onClick={() => onNavigate && onNavigate('scrape')}
          >
            Scrape Data
          </button>
          <button 
            className="nav-button active"
            onClick={() => onNavigate && onNavigate('results')}
          >
            View Results
          </button>
          <button 
            className="nav-button"
            onClick={() => onNavigate && onNavigate('schedule')}
          >
            Schedule
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      {/* Results table */}
      <div className="results-table-container">
        <h3>Results:</h3>
        {loading ? (
          <div className="loading-message">Loading results...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredResults.map(item => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    checked={selectedItems.length === filteredResults.length && filteredResults.length > 0}
                  />
                </th>
                <th>URL</th>
                <th>Keywords</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.length > 0 ? (
                filteredResults.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </td>
                    <td>{item.url}</td>
                    <td>{item.keywords}</td>
                    <td>{item.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-results">No results found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button 
          className="download-button"
          onClick={handleDownload}
          disabled={selectedItems.length === 0 || loading}
        >
          Download
        </button>
        <button 
          className="delete-button"
          onClick={handleDelete}
          disabled={selectedItems.length === 0 || loading}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;