import React, { useState } from 'react';
import { downloadCSV, downloadJSON } from '../../services/api';
import './ResultsTable.css';

const ResultsTable = ({ data }) => {
    const [viewMode, setViewMode] = useState('structured');
    const [expandedNodes, setExpandedNodes] = useState({});
    
    const handleDownloadCSV = async () => {
        try {
            const response = await downloadCSV();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch(error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to Download CSV');
        }
    };

    const handleDownloadJSON = async () => {
        try {
            const response = await downloadJSON();
            const url = window.URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch(error) {
            console.error('Error downloading JSON:', error);
            alert('Failed to Download JSON');
        }
    };
    
    const handleViewRawHTML = () => {
        if (data && data.raw_html) {
            const url = window.URL.createObjectURL(new Blob([data.raw_html], { type: 'text/html' }));
            window.open(url, '_blank');
        } else {
            alert('Raw HTML not available');
        }
    };

    // Generic function to render any data structure
    const renderDataNode = (key, value, path = '', level = 0) => {
        const nodeId = path + '.' + key;
        const isExpanded = expandedNodes[nodeId] !== false;
        
        const toggleExpand = () => {
            setExpandedNodes(prev => ({
                ...prev,
                [nodeId]: !isExpanded
            }));
        };
        
        // Determine the type of value
        const valueType = typeof value;
        const isNull = value === null;
        const isArray = Array.isArray(value);
        const isObject = valueType === 'object' && !isNull && !isArray;
        const isPrimitive = !isObject && !isArray && !isNull;
        
        // For objects and arrays, count children
        const childCount = isObject || isArray ? Object.keys(value).length : 0;
        
        return (
            <div key={nodeId} className="data-node" style={{ marginLeft: `${level * 20}px` }}>
                <div className="node-header">
                    {(isObject || isArray) && childCount > 0 ? (
                        <span 
                            className={`toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}`}
                            onClick={toggleExpand}
                        >
                            {isExpanded ? '▼' : '►'}
                        </span>
                    ) : (
                        <span className="toggle-icon placeholder"></span>
                    )}
                    
                    <span className="node-key">{key}:</span>
                    
                    {isPrimitive ? (
                        <span className={`node-value ${valueType}`}>
                            {valueType === 'string' ? `"${value}"` : String(value)}
                        </span>
                    ) : isNull ? (
                        <span className="node-value null">null</span>
                    ) : (
                        <span className="node-type">
                            {isArray ? `Array(${childCount})` : `Object{${childCount}}`}
                        </span>
                    )}
                </div>
                
                {(isObject || isArray) && isExpanded && childCount > 0 && (
                    <div className="node-children">
                        {Object.entries(value).map(([childKey, childValue]) => 
                            renderDataNode(childKey, childValue, nodeId, level + 1)
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Generic function to detect and render URLs and images
    const renderEnhancedContent = (data) => {
        // Scan for common structures in the data
        const urlsAndImages = findUrlsAndImages(data);
        
        return (
            <div className="enhanced-content">
                {urlsAndImages.images.length > 0 && (
                    <div className="detected-images">
                        <h4>Detected Images ({urlsAndImages.images.length})</h4>
                        <div className="images-grid">
                            {urlsAndImages.images.slice(0, 6).map((imgUrl, index) => (
                                <div key={index} className="image-item">
                                    <img src={imgUrl} alt={`Detected image ${index + 1}`} />
                                </div>
                            ))}
                            {urlsAndImages.images.length > 6 && (
                                <div className="more-images">
                                    +{urlsAndImages.images.length - 6} more images
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {urlsAndImages.urls.length > 0 && (
                    <div className="detected-urls">
                        <h4>Detected URLs ({urlsAndImages.urls.length})</h4>
                        <ul className="urls-list">
                            {urlsAndImages.urls.slice(0, 8).map((url, index) => (
                                <li key={index}>
                                    <a href={url} target="_blank" rel="noreferrer">
                                        {url.length > 60 ? url.substring(0, 57) + '...' : url}
                                    </a>
                                </li>
                            ))}
                            {urlsAndImages.urls.length > 8 && (
                                <li className="more-urls">
                                    +{urlsAndImages.urls.length - 8} more URLs
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        );
    };
    
    // Helper function to find URLs and images in any data structure
    const findUrlsAndImages = (data, results = { urls: [], images: [] }) => {
        if (!data) return results;
        
        // If it's a string, check if it's a URL or image
        if (typeof data === 'string') {
            // Check if it's a URL
            try {
                const url = new URL(data);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    // Check if it's an image URL
                    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(data)) {
                        if (!results.images.includes(data)) {
                            results.images.push(data);
                        }
                    } else {
                        if (!results.urls.includes(data)) {
                            results.urls.push(data);
                        }
                    }
                }
            } catch {}
        }
        // If it's an object or array, recursively check all values
        else if (typeof data === 'object' && data !== null) {
            for (const key in data) {
                findUrlsAndImages(data[key], results);
            }
        }
        
        return results;
    };

    return (
        <div className="results-container">
            <div className="results-header">
                <h2>Results:</h2>
                <div className="view-toggle">
                    <button 
                        className={`toggle-btn ${viewMode === 'structured' ? 'active' : ''}`}
                        onClick={() => setViewMode('structured')}
                    >
                        Structured View
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
                        onClick={() => setViewMode('raw')}
                    >
                        Raw Data
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === 'enhanced' ? 'active' : ''}`}
                        onClick={() => setViewMode('enhanced')}
                    >
                        Enhanced View
                    </button>
                </div>
            </div>

            <div className="results-content">
                {!data ? (
                    <div className="no-results">
                        <p>No data scraped yet. Enter a URL above and click "Scrape Now" to begin.</p>
                    </div>
                ) : (
                    <div className="dynamic-data-display">
                        {viewMode === 'structured' && (
                            <div className="structured-view">
                                {Object.entries(data).map(([key, value]) => 
                                    renderDataNode(key, value, 'root')
                                )}
                            </div>
                        )}
                        
                        {viewMode === 'raw' && (
                            <div className="raw-view">
                                <pre>{JSON.stringify(data, null, 2)}</pre>
                            </div>
                        )}
                        
                        {viewMode === 'enhanced' && (
                            <div className="enhanced-view">
                                {renderEnhancedContent(data)}
                                <div className="data-summary">
                                    <h4>Data Summary</h4>
                                    <div className="summary-items">
                                        <div className="summary-item">
                                            <span className="label">URL:</span>
                                            <span className="value">{data.url || 'N/A'}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="label">Time Scraped:</span>
                                            <span className="value">{data.timestamp || 'N/A'}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="label">Data Size:</span>
                                            <span className="value">
                                                {JSON.stringify(data).length} characters
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="results-features">
                <ul>
                    <li>Flexible view adapts to any scraped content</li>
                    <li>Tree-view for nested data exploration</li>
                    <li>Toggle between structured view and raw data</li>
                </ul>
            </div>
            
            <div className="results-actions">
                <button 
                    onClick={handleDownloadCSV} 
                    className="btn btn-primary" 
                    disabled={!data}
                >
                    Download CSV
                </button>
                <button 
                    onClick={handleDownloadJSON} 
                    className="btn btn-primary" 
                    disabled={!data}
                >
                    Download JSON
                </button>
                <button 
                    onClick={handleViewRawHTML} 
                    className="btn btn-secondary" 
                    disabled={!data || !data.raw_html}
                >
                    View Raw HTML
                </button>
            </div>
        </div>
    );
};

export default ResultsTable;