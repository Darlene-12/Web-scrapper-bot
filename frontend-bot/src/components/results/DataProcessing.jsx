// src/components/results/DataProcessing.jsx
import React, { useState } from 'react';
import './DataProcessing.css';

const DataProcessing = ({ data = [], onProcessData = () => {} }) => {
  const [processing, setProcessing] = useState(false);
  const [processingOptions, setProcessingOptions] = useState({
    removeDuplicates: true,
    convertNumeric: false,
    removeEmpty: true,
    trimWhitespace: true,
    toLowerCase: false,
    toUpperCase: false,
    formatDates: false,
    customReplacement: false,
    findText: '',
    replaceText: ''
  });

  const handleOptionChange = (option) => {
    setProcessingOptions({
      ...processingOptions,
      [option]: !processingOptions[option]
    });
  };

  const handleInputChange = (field, value) => {
    setProcessingOptions({
      ...processingOptions,
      [field]: value
    });
  };

  const processData = () => {
    if (!data || data.length === 0) return;
    
    setProcessing(true);
    
    setTimeout(() => {
      let processedData = [...data];
      
      // Apply processing options
      if (processingOptions.removeDuplicates) {
        const seen = new Set();
        processedData = processedData.filter(item => {
          const stringified = JSON.stringify(item);
          if (seen.has(stringified)) return false;
          seen.add(stringified);
          return true;
        });
      }
      
      if (processingOptions.removeEmpty) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (newItem[key] === '' || newItem[key] === null || newItem[key] === undefined) {
              newItem[key] = null;
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.trimWhitespace) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (typeof newItem[key] === 'string') {
              newItem[key] = newItem[key].trim();
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.convertNumeric) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (typeof newItem[key] === 'string' && !isNaN(newItem[key]) && newItem[key].trim() !== '') {
              newItem[key] = Number(newItem[key]);
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.toLowerCase) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (typeof newItem[key] === 'string') {
              newItem[key] = newItem[key].toLowerCase();
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.toUpperCase) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (typeof newItem[key] === 'string') {
              newItem[key] = newItem[key].toUpperCase();
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.formatDates) {
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            // Simple date detection - can be improved for production
            if (typeof newItem[key] === 'string' && 
                (newItem[key].match(/^\d{4}-\d{2}-\d{2}/) || 
                 newItem[key].match(/^\d{2}\/\d{2}\/\d{4}/))) {
              try {
                const date = new Date(newItem[key]);
                if (!isNaN(date.getTime())) {
                  newItem[key] = date.toISOString().split('T')[0];
                }
              } catch (e) {
                // Not a valid date, keep as is
              }
            }
          });
          return newItem;
        });
      }
      
      if (processingOptions.customReplacement && 
          processingOptions.findText.trim() !== '') {
        const findRegex = new RegExp(processingOptions.findText, 'g');
        processedData = processedData.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            if (typeof newItem[key] === 'string') {
              newItem[key] = newItem[key].replace(findRegex, processingOptions.replaceText);
            }
          });
          return newItem;
        });
      }
      
      // Send processed data to parent
      onProcessData(processedData);
      setProcessing(false);
    }, 1000); // Simulate processing time
  };

  const resetOptions = () => {
    setProcessingOptions({
      removeDuplicates: true,
      convertNumeric: false,
      removeEmpty: true,
      trimWhitespace: true,
      toLowerCase: false,
      toUpperCase: false,
      formatDates: false,
      customReplacement: false,
      findText: '',
      replaceText: ''
    });
  };

  return (
    <div className="data-processing">
      <h3>Data Processing Options</h3>
      
      <div className="processing-options">
        <div className="option-group">
          <h4>Clean Data</h4>
          
          <div className="option">
            <input
              type="checkbox"
              id="removeDuplicates"
              checked={processingOptions.removeDuplicates}
              onChange={() => handleOptionChange('removeDuplicates')}
            />
            <label htmlFor="removeDuplicates">Remove duplicate rows</label>
          </div>
          
          <div className="option">
            <input
              type="checkbox"
              id="removeEmpty"
              checked={processingOptions.removeEmpty}
              onChange={() => handleOptionChange('removeEmpty')}
            />
            <label htmlFor="removeEmpty">Replace empty values with null</label>
          </div>
          
          <div className="option">
            <input
              type="checkbox"
              id="trimWhitespace"
              checked={processingOptions.trimWhitespace}
              onChange={() => handleOptionChange('trimWhitespace')}
            />
            <label htmlFor="trimWhitespace">Trim whitespace</label>
          </div>
        </div>
        
        <div className="option-group">
          <h4>Transform Data</h4>
          
          <div className="option">
            <input
              type="checkbox"
              id="convertNumeric"
              checked={processingOptions.convertNumeric}
              onChange={() => handleOptionChange('convertNumeric')}
            />
            <label htmlFor="convertNumeric">Convert numeric strings to numbers</label>
          </div>
          
          <div className="option">
            <input
              type="checkbox"
              id="formatDates"
              checked={processingOptions.formatDates}
              onChange={() => handleOptionChange('formatDates')}
            />
            <label htmlFor="formatDates">Standardize date formats</label>
          </div>
          
          <div className="text-transform-options">
            <div className="option">
              <input
                type="checkbox"
                id="toLowerCase"
                checked={processingOptions.toLowerCase}
                onChange={() => handleOptionChange('toLowerCase')}
                disabled={processingOptions.toUpperCase}
              />
              <label htmlFor="toLowerCase">Convert text to lowercase</label>
            </div>
            
            <div className="option">
              <input
                type="checkbox"
                id="toUpperCase"
                checked={processingOptions.toUpperCase}
                onChange={() => handleOptionChange('toUpperCase')}
                disabled={processingOptions.toLowerCase}
              />
              <label htmlFor="toUpperCase">Convert text to UPPERCASE</label>
            </div>
          </div>
        </div>
        
        <div className="option-group">
          <h4>Custom Replacements</h4>
          
          <div className="option">
            <input
              type="checkbox"
              id="customReplacement"
              checked={processingOptions.customReplacement}
              onChange={() => handleOptionChange('customReplacement')}
            />
            <label htmlFor="customReplacement">Find and replace text</label>
          </div>
          
          {processingOptions.customReplacement && (
            <div className="replacement-inputs">
              <div className="input-group">
                <label htmlFor="findText">Find:</label>
                <input
                  type="text"
                  id="findText"
                  value={processingOptions.findText}
                  onChange={(e) => handleInputChange('findText', e.target.value)}
                  placeholder="Text to find"
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="replaceText">Replace with:</label>
                <input
                  type="text"
                  id="replaceText"
                  value={processingOptions.replaceText}
                  onChange={(e) => handleInputChange('replaceText', e.target.value)}
                  placeholder="Replacement text"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="processing-buttons">
        <button 
          className="reset-button" 
          onClick={resetOptions}
          disabled={processing}
        >
          Reset Options
        </button>
        <button 
          className="process-button" 
          onClick={processData}
          disabled={processing || data.length === 0}
        >
          {processing ? (
            <>
              <span className="spinner"></span> Processing...
            </>
          ) : 'Apply Processing'}
        </button>
      </div>
      
      {data.length === 0 && (
        <div className="no-data-message">
          No data available to process
        </div>
      )}
    </div>
  );
};

export default DataProcessing;