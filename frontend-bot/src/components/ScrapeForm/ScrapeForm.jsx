import React, { useState, useEffect } from 'react';
import './ScrapeForm.css';

const ScrapeForm = ({ onScrapingComplete, onNavigate }) => {
  // Basic form state
  const [formData, setFormData] = useState({
    url: '',
    keywords: '',
    dataType: 'auto',
    useSelenium: false,
    useBs4: false,
    timeout: 30,
  });
  
  // Advanced options state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState('auto');
  const [customSelectors, setCustomSelectors] = useState([
    { fieldName: 'title', selectorType: 'css', selector: '', valid: false }
  ]);
  const [outputOptions, setOutputOptions] = useState({
    format: 'json',
    structure: 'nested',
    cleanData: true,
    convertNumbers: true,
    parseDates: true,
    followPagination: false,
    maxPages: 1
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [detectedPatterns, setDetectedPatterns] = useState(null);
  const [availableProxies, setAvailableProxies] = useState([]);
  const [selectedProxy, setSelectedProxy] = useState('');

  // Fetch available proxies on component mount
  useEffect(() => {
    const fetchProxies = async () => {
      try {
        const response = await fetch('/api/proxies/?is_active=true');
        const data = await response.json();
        setAvailableProxies(data);
      } catch (error) {
        console.error('Error fetching proxies:', error);
      }
    };
    
    fetchProxies();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSelectorChange = (index, field, value) => {
    const updatedSelectors = [...customSelectors];
    updatedSelectors[index] = {
      ...updatedSelectors[index],
      [field]: value
    };
    setCustomSelectors(updatedSelectors);
  };

  const addSelector = () => {
    setCustomSelectors([
      ...customSelectors,
      { fieldName: '', selectorType: 'css', selector: '', valid: false }
    ]);
  };

  const removeSelector = (index) => {
    const updatedSelectors = customSelectors.filter((_, i) => i !== index);
    setCustomSelectors(updatedSelectors);
  };

  const handleOutputOptionsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOutputOptions({
      ...outputOptions,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const testSelector = async (index) => {
    const selector = customSelectors[index];
    if (!formData.url || !selector.selector) return;

    try {
      // This would be an API call to test the selector against the URL
      const response = await fetch('/api/scraping/test-selector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.url,
          selector_type: selector.selectorType,
          selector: selector.selector
        })
      });
      
      const data = await response.json();
      
      // Update the selector's validity and show preview
      const updatedSelectors = [...customSelectors];
      updatedSelectors[index].valid = data.success;
      setCustomSelectors(updatedSelectors);
      
      // Show preview data
      if (data.success) {
        setPreviewData({
          ...previewData,
          [selector.fieldName]: data.preview
        });
      }
    } catch (error) {
      console.error('Error testing selector:', error);
    }
  };

  const detectPatterns = async () => {
    if (!formData.url) return;
    
    setLoading(true);
    try {
      // API call to detect patterns on the page
      const response = await fetch('/api/scraping/detect-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url })
      });
      
      const data = await response.json();
      setDetectedPatterns(data.patterns);
    } catch (error) {
      console.error('Error detecting patterns:', error);
      setError('Failed to detect patterns on the page');
    } finally {
      setLoading(false);
    }
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

      // Prepare scraping options based on selected extraction method
      const scrapingOptions = {
        url: formData.url,
        keywords: formData.keywords,
        data_type: formData.dataType,
        use_selenium: formData.useSelenium,
        timeout: parseInt(formData.timeout),
        proxy_id: selectedProxy || null
      };
      
      // Add extraction method specific options
      if (extractionMethod === 'custom' && customSelectors.length > 0) {
        // Convert selectors array to object mapping fieldName -> selector
        const selectorsMap = {};
        customSelectors.forEach(sel => {
          if (sel.fieldName && sel.selector) {
            selectorsMap[sel.fieldName] = {
              type: sel.selectorType,
              selector: sel.selector
            };
          }
        });
        scrapingOptions.selectors = selectorsMap;
      } else if (extractionMethod === 'pattern' && detectedPatterns) {
        // Add selected pattern extraction options
        scrapingOptions.patterns = detectedPatterns
          .filter(pattern => pattern.selected)
          .map(pattern => pattern.type);
      }
      
      // Add output options
      scrapingOptions.output_options = outputOptions;
      
      // Call API to scrape with the provided options
      const response = await fetch('/api/scraping/scrape-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapingOptions)
      });
      
      const data = await response.json();
      
      setLoading(false);
      
      // Call the callback function with the results
      if (onScrapingComplete) {
        onScrapingComplete(data);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'An error occurred');
    }
  };

  // Toggle pattern selection
  const togglePatternSelection = (index) => {
    const updatedPatterns = [...detectedPatterns];
    updatedPatterns[index].selected = !updatedPatterns[index].selected;
    setDetectedPatterns(updatedPatterns);
  };

  return (
    <div className="scrape-form-container">
      <div className="scrape-header">
        <h2>Multi-Functional Web Scraping Bot</h2>
      </div>
    
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
            onClick={() => onNavigate && onNavigate('schedule')}
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
          <div className="url-input-group">
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
            {formData.url && (
              <button 
                type="button" 
                className="detect-patterns-btn"
                onClick={detectPatterns}
                disabled={loading}
              >
                Analyze Page
              </button>
            )}
          </div>
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
            <option value="auto">Auto-detect</option>
            <option value="full_page">Full Page</option>
            <option value="structured">Structured Data</option>
            <option value="text_only">Text Only</option>
            <option value="links">Links</option>
            <option value="images">Images</option>
            <option value="tables">Tables</option>
            <option value="custom">Custom</option>
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
                  checked={formData.useSelenium}
                  onChange={handleChange}
                />
                <label htmlFor="useSelenium">Use Selenium</label>
              </div>
              
              <div className="option-item">
                <label htmlFor="timeout">Timeout:</label>
                <input 
                  type="number" 
                  id="timeout" 
                  name="timeout"
                  min="1"
                  max="300"
                  value={formData.timeout}
                  onChange={handleChange}
                />
                <span className="unit">seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="advanced-toggle">
          <button 
            type="button"
            className="toggle-btn"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
        </div>
        
        {/* Advanced Options Section */}
        {showAdvancedOptions && (
          <div className="advanced-options"
          style={{
            backgroundColor: '#212121',
            color: '#f0f0f0',
             border: '1px solid #333'
          }}>
            {/* Extraction Method Selection */}
            <div className="extraction-method">
              <h3>Extraction Method:</h3>
              <div className="radio-group">
                <div className="radio-item">
                  <input 
                    type="radio" 
                    id="auto-extract" 
                    name="extractionMethod"
                    value="auto"
                    checked={extractionMethod === 'auto'} 
                    onChange={() => setExtractionMethod('auto')}
                  />
                  <label htmlFor="auto-extract">Auto-detect</label>
                </div>
                <div className="radio-item">
                  <input 
                    type="radio" 
                    id="pattern-extract" 
                    name="extractionMethod"
                    value="pattern"
                    checked={extractionMethod === 'pattern'} 
                    onChange={() => setExtractionMethod('pattern')}
                  />
                  <label htmlFor="pattern-extract">Use pattern recognition</label>
                </div>
                <div className="radio-item">
                  <input 
                    type="radio" 
                    id="custom-extract" 
                    name="extractionMethod"
                    value="custom"
                    checked={extractionMethod === 'custom'} 
                    onChange={() => setExtractionMethod('custom')}
                  />
                  <label htmlFor="custom-extract">Use custom selectors</label>
                </div>
              </div>
            </div>
            
            {/* Pattern Recognition Section */}
            {extractionMethod === 'pattern' && detectedPatterns && (
              <div className="pattern-recognition">
                <h3>Detected Patterns:</h3>
                <div className="detected-patterns">
                  {detectedPatterns.map((pattern, index) => (
                    <div key={index} className="pattern-item">
                      <input 
                        type="checkbox"
                        id={`pattern-${index}`}
                        checked={pattern.selected || false}
                        onChange={() => togglePatternSelection(index)}
                      />
                      <label htmlFor={`pattern-${index}`}>
                        <strong>{pattern.type}</strong> ({pattern.count} found)
                        <span className="pattern-description">{pattern.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Custom Selectors Section */}
            {extractionMethod === 'custom' && (
              <div className="custom-selectors">
                <h3>Custom Selectors:</h3>
                <div className="selectors-table">
                  <div className="selectors-header">
                    <div className="field-name-col">Field Name</div>
                    <div className="selector-type-col">Type</div>
                    <div className="selector-col">Selector</div>
                    <div className="actions-col">Actions</div>
                  </div>
                  
                  {customSelectors.map((selector, index) => (
                    <div key={index} className="selector-row">
                      <div className="field-name-col">
                        <input 
                          type="text"
                          value={selector.fieldName}
                          onChange={(e) => handleSelectorChange(index, 'fieldName', e.target.value)}
                          placeholder="Field name"
                        />
                      </div>
                      <div className="selector-type-col">
                        <select
                          value={selector.selectorType}
                          onChange={(e) => handleSelectorChange(index, 'selectorType', e.target.value)}
                        >
                          <option value="css">CSS</option>
                          <option value="xpath">XPath</option>
                          <option value="jsonpath">JSONPath</option>
                        </select>
                      </div>
                      <div className="selector-col">
                        <input 
                          type="text"
                          value={selector.selector}
                          onChange={(e) => handleSelectorChange(index, 'selector', e.target.value)}
                          placeholder={selector.selectorType === 'css' ? ".product-title" : 
                            selector.selectorType === 'xpath' ? "//h1[@class='title']" : "$.product.title"}
                          className={selector.valid ? 'valid-selector' : ''}
                        />
                      </div>
                      <div className="actions-col">
                        <button 
                          type="button" 
                          className="test-selector-btn"
                          onClick={() => testSelector(index)}
                          disabled={!formData.url || !selector.selector}
                        >
                          Test
                        </button>
                        <button 
                          type="button" 
                          className="remove-selector-btn"
                          onClick={() => removeSelector(index)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
                    className="add-selector-btn"
                    onClick={addSelector}
                  >
                    + Add Field
                  </button>
                </div>
                
                {/* Selector Preview */}
                {previewData && Object.keys(previewData).length > 0 && (
                  <div className="selector-preview">
                    <h4>Preview:</h4>
                    <div className="preview-content">
                      {Object.entries(previewData).map(([field, value]) => (
                        <div key={field} className="preview-item">
                          <span className="preview-field">{field}:</span>
                          <span className="preview-value">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Output Options */}
            <div className="output-options">
              <h3>Output Options:</h3>
              <div className="output-form-group">
                <label htmlFor="format">Format:</label>
                <select
                  id="format"
                  name="format"
                  value={outputOptions.format}
                  onChange={handleOutputOptionsChange}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                  <option value="text">Text</option>
                </select>
              </div>
              
              <div className="output-form-group">
                <label htmlFor="structure">Structure:</label>
                <select
                  id="structure"
                  name="structure"
                  value={outputOptions.structure}
                  onChange={handleOutputOptionsChange}
                >
                  <option value="nested">Nested</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              
              <div className="output-checkboxes">
                <div className="output-checkbox-item">
                  <input 
                    type="checkbox" 
                    id="cleanData" 
                    name="cleanData"
                    checked={outputOptions.cleanData}
                    onChange={handleOutputOptionsChange}
                  />
                  <label htmlFor="cleanData">Clean data</label>
                </div>
                <div className="output-checkbox-item">
                  <input 
                    type="checkbox" 
                    id="convertNumbers" 
                    name="convertNumbers"
                    checked={outputOptions.convertNumbers}
                    onChange={handleOutputOptionsChange}
                  />
                  <label htmlFor="convertNumbers">Convert numbers</label>
                </div>
                <div className="output-checkbox-item">
                  <input 
                    type="checkbox" 
                    id="parseDates" 
                    name="parseDates"
                    checked={outputOptions.parseDates}
                    onChange={handleOutputOptionsChange}
                  />
                  <label htmlFor="parseDates">Parse dates</label>
                </div>
                <div className="output-checkbox-item">
                  <input 
                    type="checkbox" 
                    id="followPagination" 
                    name="followPagination"
                    checked={outputOptions.followPagination}
                    onChange={handleOutputOptionsChange}
                  />
                  <label htmlFor="followPagination">Follow pagination</label>
                </div>
              </div>
              
              {outputOptions.followPagination && (
                <div className="output-form-group">
                  <label htmlFor="maxPages">Max Pages:</label>
                  <input 
                    type="number" 
                    id="maxPages" 
                    name="maxPages"
                    min="1"
                    max="100"
                    value={outputOptions.maxPages}
                    onChange={handleOutputOptionsChange}
                  />
                </div>
              )}
            </div>
            
            {/* Proxy Selection */}
            <div className="proxy-selection">
              <h3>Proxy:</h3>
              <select
                id="selectedProxy"
                value={selectedProxy}
                onChange={(e) => setSelectedProxy(e.target.value)}
              >
                <option value="">No Proxy</option>
                {availableProxies.map(proxy => (
                  <option key={proxy.id} value={proxy.id}>
                    {proxy.address}:{proxy.port} ({proxy.proxy_type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        <button type="submit" className="scrape-button" disabled={loading}>
          {loading ? 'Scraping...' : 'Scrape Now'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default ScrapeForm;