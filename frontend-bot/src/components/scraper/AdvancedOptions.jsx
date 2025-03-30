// src/components/scraper/AdvancedOptions.jsx
import React from 'react';
import './AdvancedOptions.css';

const AdvancedOptions = ({ options, onChange }) => {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : 
                    type === 'number' ? Number(value) : value;
    
    onChange({
      ...options,
      [name]: newValue
    });
  };

  return (
    <div className="advanced-options">
      <div className="options-grid">
        <div className="form-group">
          <label htmlFor="requestInterval">Request Interval (ms)</label>
          <input
            type="number"
            id="requestInterval"
            name="requestInterval"
            value={options.requestInterval}
            onChange={handleInputChange}
            min="0"
            className="form-control"
          />
          <small className="form-text">Delay between requests (milliseconds)</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="timeout">Timeout (ms)</label>
          <input
            type="number"
            id="timeout"
            name="timeout"
            value={options.timeout}
            onChange={handleInputChange}
            min="1000"
            className="form-control"
          />
          <small className="form-text">Max time for request completion</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="userAgent">User Agent</label>
          <select
            id="userAgent"
            name="userAgent"
            value={options.userAgent}
            onChange={handleInputChange}
            className="form-control"
          >
            <option value="default">Default Browser</option>
            <option value="chrome">Google Chrome</option>
            <option value="firefox">Mozilla Firefox</option>
            <option value="safari">Apple Safari</option>
            <option value="edge">Microsoft Edge</option>
            <option value="mobile">Mobile Device</option>
            <option value="custom">Custom</option>
          </select>
          {options.userAgent === 'custom' && (
            <input
              type="text"
              name="customUserAgent"
              value={options.customUserAgent || ''}
              onChange={handleInputChange}
              placeholder="Enter custom user agent string"
              className="form-control mt-2"
            />
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="retryAttempts">Retry Attempts</label>
          <input
            type="number"
            id="retryAttempts"
            name="retryAttempts"
            value={options.retryAttempts}
            onChange={handleInputChange}
            min="0"
            max="10"
            className="form-control"
          />
          <small className="form-text">How many times to retry failed requests</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="concurrency">Concurrency</label>
          <input
            type="number"
            id="concurrency"
            name="concurrency"
            value={options.concurrency}
            onChange={handleInputChange}
            min="1"
            max="10"
            className="form-control"
          />
          <small className="form-text">Number of parallel requests</small>
        </div>
      </div>
      
      <div className="checkbox-options">
        <div className="form-check">
          <input
            type="checkbox"
            id="javascriptEnabled"
            name="javascriptEnabled"
            checked={options.javascriptEnabled}
            onChange={handleInputChange}
            className="form-check-input"
          />
          <label htmlFor="javascriptEnabled" className="form-check-label">
            Enable JavaScript
          </label>
        </div>
        
        <div className="form-check">
          <input
            type="checkbox"
            id="followRedirects"
            name="followRedirects"
            checked={options.followRedirects}
            onChange={handleInputChange}
            className="form-check-input"
          />
          <label htmlFor="followRedirects" className="form-check-label">
            Follow Redirects
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptions;