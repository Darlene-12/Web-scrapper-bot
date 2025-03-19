import React, { useState, useEffect } from 'react';
import { getScrapedData } from '../services/api';
import AnalyticsChart from '../components/Analytics/AnalyticsChart';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [scrapedData, setScrapedData] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchScrapedData();
  }, []);

  const fetchScrapedData = async () => {
    try {
      setLoading(true);
      const response = await getScrapedData();
      setScrapedData(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data for analysis');
      setLoading(false);
      console.error(err);
    }
  };

  const handleSelectData = (data) => {
    setSelectedData(data);
  };

  if (loading) {
    return <div className="loading">Loading data for analysis...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!scrapedData.length) {
    return <div className="no-data">No scraped data available for analysis. Run some scraping tasks first.</div>;
  }

  return (
    <div className="analytics-page">
      <h1>Analytics Dashboard</h1>
      
      <div className="analytics-layout">
        <div className="data-selector">
          <h3>Select Data to Analyze</h3>
          <div className="data-list">
            {scrapedData.map((item) => (
              <div 
                key={item.id} 
                className={`data-item ${selectedData === item ? 'selected' : ''}`}
                onClick={() => handleSelectData(item)}
              >
                <div className="data-item-title">
                  {item.content?.title || item.url.substring(0, 30) + '...'}
                </div>
                <div className="data-item-meta">
                  <span className="data-type">{item.data_type}</span>
                  <span className="data-date">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="data-visualization">
          {selectedData ? (
            <AnalyticsChart 
              data={selectedData.content} 
              dataType={selectedData.data_type} 
            />
          ) : (
            <div className="select-prompt">
              Select a dataset from the left panel to visualize it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;