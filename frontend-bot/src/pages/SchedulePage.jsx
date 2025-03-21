import React, { useState } from 'react';
import { scheduleScrapingTask } from '../api/api'; // Import API method
import './SchedulePage.css';

const SchedulePage = ({ onNavigate }) => {
  const [scheduleData, setScheduleData] = useState({
    url: '',
    keywords: '',
    dataType: 'prices',
    frequency: 'daily' // default value
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData({
      ...scheduleData,
      [name]: value
    });
  };

  const handleFrequencyChange = (frequency) => {
    setScheduleData({
      ...scheduleData,
      frequency
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate URL
      if (!scheduleData.url) {
        throw new Error('URL is required');
      }
      
      // Call the API to schedule the task
      await scheduleScrapingTask(scheduleData);
      
      console.log('Scheduled task:', scheduleData);
      alert('Task scheduled successfully!');
      
      // Reset form after successful submission
      setScheduleData({
        url: '',
        keywords: '',
        dataType: 'prices',
        frequency: 'daily'
      });
    } catch (err) {
      console.error('Scheduling error:', err);
      setError(err.response?.data?.error || err.message || 'An error occurred while scheduling');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="schedule-container">
      <h2>Schedule Scraping Tasks</h2>
      
      {/* Navigation Buttons - same as your other pages */}
      <div className="nav-container">
        <div className="nav-buttons">
          <button 
            className="nav-button"
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
            className="nav-button active"
            onClick={() => onNavigate && onNavigate('schedule')}
          >
            Schedule
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="schedule-form">
        <div className="form-group">
          <label htmlFor="url">Enter URL:</label>
          <input
            type="url"
            id="url"
            name="url"
            value={scheduleData.url}
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
            value={scheduleData.keywords}
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
            value={scheduleData.dataType}
            onChange={handleChange}
            className="form-control"
          >
            <option value="prices">Prices</option>
            <option value="reviews">Reviews</option>
          </select>
        </div>
        
        <div className="frequency-options">
          <button 
            type="button"
            className={`frequency-btn ${scheduleData.frequency === 'daily' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('daily')}
          >
            Daily
          </button>
          <button 
            type="button"
            className={`frequency-btn ${scheduleData.frequency === 'weekly' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('weekly')}
          >
            Weekly
          </button>
          <button 
            type="button"
            className={`frequency-btn ${scheduleData.frequency === 'custom' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('custom')}
          >
            Custom
          </button>
        </div>
        
        <button type="submit" className="schedule-button" disabled={loading}>
          {loading ? 'Scheduling...' : 'Schedule'}
        </button>
        
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default SchedulePage;