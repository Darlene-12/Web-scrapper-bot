import React, { useState } from 'react';
import { scrapeData } from '../../services/api';
import './ScrapeForm.css';

const ScrapeForm = ({ onScrapingComplete }) => {
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
            <option value="general">General Content</option>
            <option value="product">Product</option>
            <option value="review">Reviews</option>
            <option value="price">Prices</option>
            <option value="article">Article</option>
          </select>
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