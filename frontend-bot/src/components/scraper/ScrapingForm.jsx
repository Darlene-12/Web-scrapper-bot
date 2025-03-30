// src/components/scraper/ScrapingForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedOptions from './AdvancedOptions';
import ProxySettings from './ProxySettings';
import PdfUploader from './PdfUploader';
import Collapsible from '../common/Collapsible';
import './ScrapingForm.css';

const ScrapingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataTypes, setDataTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    url: '',
    keywords: '',
    dataType: 'auto',
    scrapeMethod: 'selenium',
    advancedOptions: {
      requestInterval: 2000,
      timeout: 30000,
      userAgent: 'default',
      retryAttempts: 3,
      concurrency: 1,
      javascriptEnabled: true,
      followRedirects: true
    },
    proxySettings: {
      useProxy: false,
      proxyUrl: '',
      requiresAuth: false,
      username: '',
      password: '',
      rotateIp: false,
      rotationInterval: 5
    }
  });

  // Fetch available data types on component mount
  useEffect(() => {
    const fetchDataTypes = async () => {
      try {
        const response = await fetch('/api/scraper/data-types/');
        if (!response.ok) {
          throw new Error('Failed to fetch data types');
        }
        const data = await response.json();
        setDataTypes(data);
      } catch (err) {
        console.error('Error fetching data types:', err);
        // Set default data types if fetch fails
        setDataTypes([
          { id: 'auto', name: 'Auto Detect' },
          { id: 'text', name: 'Text Content' },
          { id: 'tables', name: 'Table Data' },
          { id: 'links', name: 'Links' },
          { id: 'images', name: 'Images' },
          { id: 'custom', name: 'Custom (CSS/XPath)' }
        ]);
      }
    };

    fetchDataTypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleScrapeMethodChange = (method) => {
    setFormData({
      ...formData,
      scrapeMethod: method
    });
  };

  const handleAdvancedOptionsChange = (advancedOptions) => {
    setFormData({
      ...formData,
      advancedOptions
    });
  };

  const handleProxySettingsChange = (proxySettings) => {
    setFormData({
      ...formData,
      proxySettings
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate URL
      if (!formData.url && document.getElementById('pdf-uploader').files.length === 0) {
        throw new Error('Please enter a URL or upload PDF files');
      }

      // Prepare the request data
      const requestData = {
        url: formData.url,
        keywords: formData.keywords,
        dataType: formData.dataType,
        scrapeMethod: formData.scrapeMethod,
        advancedOptions: formData.advancedOptions
      };

      // If using proxy, add proxy settings
      if (formData.proxySettings.useProxy) {
        requestData.proxySettings = formData.proxySettings;
      }

      // Send the request to start scraping
      const response = await fetch('/api/scraper/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') // Helper function to get CSRF token
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start scraping');
      }

      const data = await response.json();
      
      // Redirect to results page with the task ID
      navigate(`/results/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Helper function to get CSRF token
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleSaveConfig = () => {
    // Save the current configuration to localStorage
    const configName = prompt('Enter a name for this configuration:');
    if (configName) {
      const configs = JSON.parse(localStorage.getItem('scraperConfigs') || '[]');
      configs.push({
        id: Date.now(),
        name: configName,
        config: formData
      });
      localStorage.setItem('scraperConfigs', JSON.stringify(configs));
      alert('Configuration saved successfully!');
    }
  };

  const handleLoadConfig = () => {
    // Show a list of saved configurations
    const configs = JSON.parse(localStorage.getItem('scraperConfigs') || '[]');
    if (configs.length === 0) {
      alert('No saved configurations found');
      return;
    }

    const select = document.createElement('select');
    select.id = 'config-select';
    configs.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = config.name;
      select.appendChild(option);
    });

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('Select a configuration: '));
    container.appendChild(select);

    const loadDialog = document.createElement('div');
    loadDialog.innerHTML = container.outerHTML;
    
    const result = prompt(loadDialog.textContent, configs[0].id);
    if (result) {
      const selectedConfig = configs.find(c => c.id.toString() === result);
      if (selectedConfig) {
        setFormData(selectedConfig.config);
      }
    }
  };

  return (
    <div className="scraping-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="url">Website URL</label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleInputChange}
            placeholder="https://example.com/data-page"
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="keywords">Keywords (optional)</label>
          <input
            type="text"
            id="keywords"
            name="keywords"
            value={formData.keywords}
            onChange={handleInputChange}
            placeholder="Enter comma-separated keywords to target"
            className="form-control"
          />
          <small className="form-text">Separate multiple keywords with commas</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="dataType">Data Type</label>
          <select
            id="dataType"
            name="dataType"
            value={formData.dataType}
            onChange={handleInputChange}
            className="form-control"
          >
            {dataTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group scrape-method">
          <label>Scraping Method</label>
          <div className="method-options">
            <div className="method-option">
              <input
                type="radio"
                id="selenium"
                name="scrapeMethod"
                checked={formData.scrapeMethod === 'selenium'}
                onChange={() => handleScrapeMethodChange('selenium')}
              />
              <label htmlFor="selenium">
                <span className="method-name">Selenium</span>
                <span className="method-description">For JavaScript-heavy sites</span>
              </label>
            </div>
            
            <div className="method-option">
              <input
                type="radio"
                id="beautifulsoup"
                name="scrapeMethod"
                checked={formData.scrapeMethod === 'beautifulsoup'}
                onChange={() => handleScrapeMethodChange('beautifulsoup')}
              />
              <label htmlFor="beautifulsoup">
                <span className="method-name">BeautifulSoup</span>
                <span className="method-description">Fast HTML parsing</span>
              </label>
            </div>
            
            <div className="method-option">
              <input
                type="radio"
                id="both"
                name="scrapeMethod"
                checked={formData.scrapeMethod === 'both'}
                onChange={() => handleScrapeMethodChange('both')}
              />
              <label htmlFor="both">
                <span className="method-name">Both</span>
                <span className="method-description">Comprehensive scraping</span>
              </label>
            </div>
          </div>
        </div>

        <div className="collapsible-sections">
          <Collapsible title="Advanced Options">
            <AdvancedOptions 
              options={formData.advancedOptions} 
              onChange={handleAdvancedOptionsChange} 
            />
          </Collapsible>
          
          <Collapsible title="PDF Upload & Processing">
            <PdfUploader />
          </Collapsible>
          
          <Collapsible title="Proxy Settings">
            <ProxySettings 
              settings={formData.proxySettings} 
              onChange={handleProxySettingsChange} 
            />
          </Collapsible>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="submit"
            className="start-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Scraping...
              </>
            ) : 'Start Scraping'}
          </button>
          
          <div className="config-actions">
            <button
              type="button"
              className="save-button"
              onClick={handleSaveConfig}
              disabled={loading}
            >
              Save Configuration
            </button>
            
            <button
              type="button"
              className="load-button"
              onClick={handleLoadConfig}
              disabled={loading}
            >
              Load Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ScrapingForm;