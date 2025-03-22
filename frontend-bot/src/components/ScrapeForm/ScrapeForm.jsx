import React, { useState } from 'react';
import './ScrapeForm.css';

const ScrapeForm = ({ onScrapingComplete, onNavigate }) => {
  const [formData, setFormData] = useState({
    url: '',
    keywords: '',
    dataType: 'general',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate URL
      if (!formData.url) {
        throw new Error('URL is required');
      }

      const response = await scrapeData(
        formData.url,
        formData.keywords,
        formData.dataType
      );

      setLoading(false);
      
      // Call the callback function with the results
      if (onScrapingComplete) {
        onScrapingComplete(response.data);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'An error occurred');
    }
  };


  return (
    <div className="scrape-form-container">
      <h2>Multi-Functional Web Scraping Bot</h2>


      {/* Navigation Buttons */}
      <div className="nav-container">
        <div className="nav-buttons">
          <button 
            className="nav-button active"
            onClick={() => onNavigate && onNavigate('scrape')}
          >
            Scrape Data
          </button>
          <button 
            className="nav-button"
            onClick={() => onNavigate && onNavigate('results')}
          >
            View Results
          </button>

          <button 
            className="nav-button"
            onClick={() => {
              console.log('Schedule button clicked');
              if (onNavigate) onNavigate('schedule');
            }}
          >
            Schedule
          </button>

          <button 
            className="nav-button"
            onClick={() => onNavigate && onNavigate('proxies')}
          >
            Proxies
          </button>

        </div>
      </div>

      {/* Scrape form */}
      <form onSubmit={handleSubmit} className="scrape-form">
        <div className="form-group">
          <label htmlFor="url">Enter URL:</label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com"
            className="form-control"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="keywords">Keywords:</label>
          <input
            type="text"
            id="keywords"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            placeholder="Enter keywords (optional)"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dataType">Data Type:</label>
          <select
            id="dataType"
            name="dataType"
            value={formData.dataType}
            onChange={handleChange}
            className="form-control"
          >
            <option value="general">General</option>
            <option value="custom">Custom</option>
            <option value="structured">Structured</option>
            <option value="text">Text</option>
          </select>
        </div>

        <div className="options-group">
          <div className="options-row">
            <label className="options-label">Options:</label>
            <div className="options-controls">
              <div className="option-item">
                <input 
                  type="checkbox" 
                  id="useSelenium" 
                  name="useSelenium"
                  onChange={(e) => setUseSelenium(e.target.checked)}
                />
                <label htmlFor="useSelenium">Use Selenium</label>
              </div>

              <div className="option-item">
                <input 
                  type="checkbox" 
                  id="Bs4" 
                  name="UseBeautifulSoup"
                  onChange={(e) => setUseBs4(e.target.checked)}
                />
                <label htmlFor="useProxy">Use Beautiful Soup</label>
              </div>
              
              <div className="option-item">
                <label htmlFor="timeout">Timeout:</label>
                <input 
                  type="number" 
                  id="timeout" 
                  name="timeout"
                  min="1"
                  max="300"
                  defaultValue="30"
                  onChange={(e) => setTimeout(parseInt(e.target.value, 10))}
                />
                <span className="unit">seconds</span>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" className="scrape-button" disabled={loading}>
          {loading ? 'Scraping...' : 'Scrape'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default ScrapeForm;