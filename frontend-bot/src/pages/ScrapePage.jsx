// src/pages/ScrapePage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Collapsible from '../components/common/Collapsible';
import './ScrapePage.css';

const ScrapePage = () => {
  const [scrapeConfig, setScrapeConfig] = useState({
    url: '',
    keywords: '',
    dataType: 'auto',
    scrapeMethod: {
      selenium: true,
      bs4: false,
      both: false
    },
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
  
  const [pdfUpload, setPdfUpload] = useState({
    files: [],
    ocrEnabled: true,
    language: 'english',
    extractText: true,
    extractTables: true,
    extractForms: false,
    extractImages: false,
    extractMetadata: true
  });
  
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState([
    { id: 1, name: 'Healthcare Data Config', url: 'https://healthcare-example.com' },
    { id: 2, name: 'Tech News Config', url: 'https://technews-example.com' }
  ]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setScrapeConfig({
      ...scrapeConfig,
      [name]: value
    });
  };
  
  const handleScrapeMethodChange = (method) => {
    const updatedMethods = {
      selenium: false,
      bs4: false,
      both: false
    };
    updatedMethods[method] = true;
    
    setScrapeConfig({
      ...scrapeConfig,
      scrapeMethod: updatedMethods
    });
  };
  
  const handleAdvancedOptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScrapeConfig({
      ...scrapeConfig,
      advancedOptions: {
        ...scrapeConfig.advancedOptions,
        [name]: type === 'checkbox' ? checked : value
      }
    });
  };
  
  const handleProxySettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScrapeConfig({
      ...scrapeConfig,
      proxySettings: {
        ...scrapeConfig.proxySettings,
        [name]: type === 'checkbox' ? checked : value
      }
    });
  };
  
  const handlePdfOptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPdfUpload({
      ...pdfUpload,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleFileUpload = (e) => {
    const fileList = Array.from(e.target.files);
    setPdfUpload({
      ...pdfUpload,
      files: [...pdfUpload.files, ...fileList]
    });
  };
  
  const removeFile = (index) => {
    const updatedFiles = [...pdfUpload.files];
    updatedFiles.splice(index, 1);
    setPdfUpload({
      ...pdfUpload,
      files: updatedFiles
    });
  };
  
  const startScraping = () => {
    // Validate inputs
    if (!scrapeConfig.url && pdfUpload.files.length === 0) {
      setError('Please enter a URL or upload PDF files to scrape');
      return;
    }
    
    setError(null);
    setIsScraping(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsScraping(false);
      // Redirect to results page would happen here
      window.location.href = '/results';
    }, 3000);
  };
  
  const saveConfiguration = () => {
    const configName = prompt('Enter a name for this configuration:');
    if (configName) {
      const newConfig = {
        id: Date.now(),
        name: configName,
        url: scrapeConfig.url
      };
      
      setSavedConfigs([...savedConfigs, newConfig]);
      alert('Configuration saved successfully!');
    }
  };
  
  const loadConfiguration = (configId) => {
    const config = savedConfigs.find(config => config.id === configId);
    if (config) {
      setScrapeConfig({
        ...scrapeConfig,
        url: config.url
      });
    }
  };

  return (
    <div className="scrape-page">
      <Navbar />
      
      <main className="scrape-content">
        <div className="container">
          <header className="scrape-header">
            <h1>Configure Scraping Task</h1>
            <p>Enter a URL to scrape or upload PDF files for processing</p>
          </header>
          
          <div className="scrape-form">
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="url">Website URL</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={scrapeConfig.url}
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
                  value={scrapeConfig.keywords}
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
                  value={scrapeConfig.dataType}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="text">Text Content</option>
                  <option value="tables">Table Data</option>
                  <option value="links">Links</option>
                  <option value="images">Images</option>
                  <option value="custom">Custom (CSS/XPath)</option>
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
                      checked={scrapeConfig.scrapeMethod.selenium}
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
                      id="bs4"
                      name="scrapeMethod"
                      checked={scrapeConfig.scrapeMethod.bs4}
                      onChange={() => handleScrapeMethodChange('bs4')}
                    />
                    <label htmlFor="bs4">
                      <span className="method-name">BeautifulSoup</span>
                      <span className="method-description">Fast HTML parsing</span>
                    </label>
                  </div>
                  
                  <div className="method-option">
                    <input
                      type="radio"
                      id="both"
                      name="scrapeMethod"
                      checked={scrapeConfig.scrapeMethod.both}
                      onChange={() => handleScrapeMethodChange('both')}
                    />
                    <label htmlFor="both">
                      <span className="method-name">Both</span>
                      <span className="method-description">Comprehensive scraping</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="collapsible-sections">
              <Collapsible title="Advanced Options">
                <div className="advanced-options-grid">
                  <div className="form-group">
                    <label htmlFor="requestInterval">Request Interval (ms)</label>
                    <input
                      type="number"
                      id="requestInterval"
                      name="requestInterval"
                      value={scrapeConfig.advancedOptions.requestInterval}
                      onChange={handleAdvancedOptionChange}
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
                      value={scrapeConfig.advancedOptions.timeout}
                      onChange={handleAdvancedOptionChange}
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
                      value={scrapeConfig.advancedOptions.userAgent}
                      onChange={handleAdvancedOptionChange}
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
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="retryAttempts">Retry Attempts</label>
                    <input
                      type="number"
                      id="retryAttempts"
                      name="retryAttempts"
                      value={scrapeConfig.advancedOptions.retryAttempts}
                      onChange={handleAdvancedOptionChange}
                      min="0"
                      max="10"
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="concurrency">Concurrency</label>
                    <input
                      type="number"
                      id="concurrency"
                      name="concurrency"
                      value={scrapeConfig.advancedOptions.concurrency}
                      onChange={handleAdvancedOptionChange}
                      min="1"
                      max="10"
                      className="form-control"
                    />
                    <small className="form-text">Number of parallel requests</small>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="javascriptEnabled"
                        name="javascriptEnabled"
                        checked={scrapeConfig.advancedOptions.javascriptEnabled}
                        onChange={handleAdvancedOptionChange}
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
                        checked={scrapeConfig.advancedOptions.followRedirects}
                        onChange={handleAdvancedOptionChange}
                        className="form-check-input"
                      />
                      <label htmlFor="followRedirects" className="form-check-label">
                        Follow Redirects
                      </label>
                    </div>
                  </div>
                </div>
              </Collapsible>
              
              <Collapsible title="PDF Upload & Processing">
                <div className="pdf-upload-section">
                  <div className="drop-area">
                    <input
                      type="file"
                      id="pdfFiles"
                      accept=".pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                    <label htmlFor="pdfFiles" className="drop-label">
                      <span className="drop-icon">📄</span>
                      <span className="drop-text">Drag PDFs here or click to browse</span>
                    </label>
                  </div>
                  
                  {pdfUpload.files.length > 0 && (
                    <div className="file-list">
                      <h4>Uploaded Files</h4>
                      <ul>
                        {pdfUpload.files.map((file, index) => (
                          <li key={index} className="file-item">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              type="button"
                              className="remove-file"
                              onClick={() => removeFile(index)}
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pdf-options-grid">
                    <div className="form-group">
                      <label htmlFor="language">OCR Language</label>
                      <select
                        id="language"
                        name="language"
                        value={pdfUpload.language}
                        onChange={handlePdfOptionChange}
                        className="form-control"
                        disabled={!pdfUpload.ocrEnabled}
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                        <option value="chinese">Chinese</option>
                        <option value="japanese">Japanese</option>
                        <option value="russian">Russian</option>
                      </select>
                    </div>
                    
                    <div className="form-group checkbox-group">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="ocrEnabled"
                          name="ocrEnabled"
                          checked={pdfUpload.ocrEnabled}
                          onChange={handlePdfOptionChange}
                          className="form-check-input"
                        />
                        <label htmlFor="ocrEnabled" className="form-check-label">
                          Enable OCR
                        </label>
                      </div>
                    </div>
                    
                    <div className="extraction-options">
                      <h4>Extraction Options</h4>
                      <div className="extraction-checkbox-group">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="extractText"
                            name="extractText"
                            checked={pdfUpload.extractText}
                            onChange={handlePdfOptionChange}
                            className="form-check-input"
                          />
                          <label htmlFor="extractText" className="form-check-label">
                            Extract Text
                          </label>
                        </div>
                        
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="extractTables"
                            name="extractTables"
                            checked={pdfUpload.extractTables}
                            onChange={handlePdfOptionChange}
                            className="form-check-input"
                          />
                          <label htmlFor="extractTables" className="form-check-label">
                            Extract Tables
                          </label>
                        </div>
                        
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="extractForms"
                            name="extractForms"
                            checked={pdfUpload.extractForms}
                            onChange={handlePdfOptionChange}
                            className="form-check-input"
                          />
                          <label htmlFor="extractForms" className="form-check-label">
                            Extract Forms
                          </label>
                        </div>
                        
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="extractImages"
                            name="extractImages"
                            checked={pdfUpload.extractImages}
                            onChange={handlePdfOptionChange}
                            className="form-check-input"
                          />
                          <label htmlFor="extractImages" className="form-check-label">
                            Extract Images
                          </label>
                        </div>
                        
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="extractMetadata"
                            name="extractMetadata"
                            checked={pdfUpload.extractMetadata}
                            onChange={handlePdfOptionChange}
                            className="form-check-input"
                          />
                          <label htmlFor="extractMetadata" className="form-check-label">
                            Extract Metadata
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Collapsible>
              
              <Collapsible title="Proxy Settings">
                <div className="proxy-settings-section">
                  <div className="form-group checkbox-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="useProxy"
                        name="useProxy"
                        checked={scrapeConfig.proxySettings.useProxy}
                        onChange={handleProxySettingChange}
                        className="form-check-input"
                      />
                      <label htmlFor="useProxy" className="form-check-label">
                        Use Proxy Server
                      </label>
                    </div>
                  </div>
                  
                  {scrapeConfig.proxySettings.useProxy && (
                    <>
                      <div className="form-group">
                        <label htmlFor="proxyUrl">Proxy URL</label>
                        <input
                          type="text"
                          id="proxyUrl"
                          name="proxyUrl"
                          value={scrapeConfig.proxySettings.proxyUrl}
                          onChange={handleProxySettingChange}
                          placeholder="http://proxy.example.com:8080"
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="requiresAuth"
                            name="requiresAuth"
                            checked={scrapeConfig.proxySettings.requiresAuth}
                            onChange={handleProxySettingChange}
                            className="form-check-input"
                          />
                          <label htmlFor="requiresAuth" className="form-check-label">
                            Requires Authentication
                          </label>
                        </div>
                      </div>
                      
                      {scrapeConfig.proxySettings.requiresAuth && (
                        <div className="auth-fields">
                          <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                              type="text"
                              id="username"
                              name="username"
                              value={scrapeConfig.proxySettings.username}
                              onChange={handleProxySettingChange}
                              className="form-control"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                              type="password"
                              id="password"
                              name="password"
                              value={scrapeConfig.proxySettings.password}
                              onChange={handleProxySettingChange}
                              className="form-control"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="form-group checkbox-group">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            id="rotateIp"
                            name="rotateIp"
                            checked={scrapeConfig.proxySettings.rotateIp}
                            onChange={handleProxySettingChange}
                            className="form-check-input"
                          />
                          <label htmlFor="rotateIp" className="form-check-label">
                            Rotate IP Addresses
                          </label>
                        </div>
                      </div>
                      
                      {scrapeConfig.proxySettings.rotateIp && (
                        <div className="form-group">
                          <label htmlFor="rotationInterval">Rotation Interval (minutes)</label>
                          <input
                            type="number"
                            id="rotationInterval"
                            name="rotationInterval"
                            value={scrapeConfig.proxySettings.rotationInterval}
                            onChange={handleProxySettingChange}
                            min="1"
                            className="form-control"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Collapsible>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="form-actions">
              <button
                type="button"
                className="start-button"
                onClick={startScraping}
                disabled={isScraping}
              >
                {isScraping ? (
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
                  onClick={saveConfiguration}
                  disabled={isScraping}
                >
                  Save Configuration
                </button>
                
                <div className="load-config-dropdown">
                  <button type="button" className="load-button" disabled={isScraping}>
                    Load Configuration
                  </button>
                  <div className="dropdown-content">
                    {savedConfigs.map(config => (
                      <button
                        key={config.id}
                        type="button"
                        onClick={() => loadConfiguration(config.id)}
                      >
                        {config.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ScrapePage;