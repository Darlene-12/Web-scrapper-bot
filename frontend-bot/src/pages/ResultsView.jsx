import React, { useState, useEffect, useRef } from 'react';
import { getScrapedData, downloadCSV, downloadJSON, deleteScrapedData } from '../api/api';
import './ResultsView.css';
const ResultsView = ({onNavigate}) => {
    // State for scraped data
    const [scrapedData, setScrapedData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    
    // State for loading and pagination
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        dataType: 'all',
        status: 'all',
        fromDate: '',
        toDate: ''
    });
    
    // Selection state
    const [selectedItems, setSelectedItems] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    
    // Ref for search debounce
    const searchTimeout = useRef(null);
    
    // Fetch scraped data on component mount and when filters change
    useEffect(() => {
        fetchData();
    }, [filters]);
    
    // Apply search term with debounce
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }
        
        searchTimeout.current = setTimeout(() => {
            applySearch();
        }, 300);
        
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchTerm, scrapedData]);
    
    // Reset selections when filtered data changes
    useEffect(() => {
        setSelectedItems({});
        setSelectAll(false);
    }, [filteredData]);
    
    // Fetch data from API
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (filters.dataType !== 'all') {
                params.append('data_type', filters.dataType);
            }
            
            if (filters.status !== 'all') {
                params.append('status', filters.status);
            }
            
            if (filters.fromDate) {
                params.append('start_date', filters.fromDate);
            }
            
            if (filters.toDate) {
                params.append('end_date', filters.toDate);
            }
            
            const response = await getScrapedData(params);
            setScrapedData(response.data);
            setFilteredData(response.data);
            setTotalCount(response.count || response.data.length);
        } catch (error) {
            console.error('Error fetching scraped data:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Apply search filter
    const applySearch = () => {
        if (!searchTerm.trim()) {
            setFilteredData(scrapedData);
            return;
        }
        
        const lowerSearch = searchTerm.toLowerCase();
        const results = scrapedData.filter(item => {
            // Search in url, keywords, and content
            return (
                (item.url && item.url.toLowerCase().includes(lowerSearch)) ||
                (item.keywords && item.keywords.toLowerCase().includes(lowerSearch)) ||
                // Try to search in content if it's an object
                (item.content && typeof item.content === 'object' && 
                    JSON.stringify(item.content).toLowerCase().includes(lowerSearch))
            );
        });
        
        setFilteredData(results);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    
    // Handle filter changes
    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Handle select all toggle
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems({});
        } else {
            const newSelected = {};
            filteredData.forEach(item => {
                newSelected[item.id] = true;
            });
            setSelectedItems(newSelected);
        }
        setSelectAll(!selectAll);
    };
    
    // Handle individual item selection
    const handleSelectItem = (id) => {
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            if (newSelected[id]) {
                delete newSelected[id];
            } else {
                newSelected[id] = true;
            }
            return newSelected;
        });
    };
    
    // Get selected item IDs
    const getSelectedIds = () => {
        return Object.keys(selectedItems).map(id => parseInt(id, 10));
    };
    
    // Handle export selected
    const handleExportSelected = async (format) => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) {
            alert('No items selected');
            return;
        }
        
        try {
            if (format === 'csv') {
                await downloadCSV(selectedIds);
            } else if (format === 'json') {
                await downloadJSON(selectedIds);
            }
        } catch (error) {
            console.error(`Error exporting as ${format}:`, error);
            alert(`Failed to export as ${format}`);
        }
    };
    
    // Handle export all
    const handleExportAll = async (format) => {
        try {
            if (format === 'csv') {
                await downloadCSV();
            } else if (format === 'json') {
                await downloadJSON();
            }
        } catch (error) {
            console.error(`Error exporting all as ${format}:`, error);
            alert(`Failed to export all as ${format}`);
        }
    };
    
    // Handle delete selected
    const handleDeleteSelected = async () => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) {
            alert('No items selected');
            return;
        }
        
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) {
            return;
        }
        
        try {
            await Promise.all(selectedIds.map(id => deleteScrapedData(id)));
            await fetchData();
            alert('Selected items deleted successfully');
        } catch (error) {
            console.error('Error deleting selected items:', error);
            alert('Failed to delete some items');
        }
    };
    
    // Handle delete individual item
    const handleDeleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }
        
        try {
            await deleteScrapedData(id);
            await fetchData();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        }
    };
    
    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };
    
    // Get count of selected items
    const getSelectedCount = () => {
        return Object.keys(selectedItems).length;
    };

    return (
        <div className="results-view-container">
            <div className="results-header">
                <h2>View Scraped Results</h2>
            </div>

            <div className="nav-container">
                <div className="nav-buttons">
                <button 
                    className="nav-button"
                    onClick={() => onNavigate && onNavigate('scrape')}
                >
                    Scrape Data
                </button>
                <button 
                    className="nav-button active"
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

            
            <div className="search-section">
                <div className="search-input">
                    <input
                        type="text"
                        placeholder="Search by URL, keywords, or content..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
                
                <div className="filters-section">
                    <div className="filter-group">
                        <label>Data Type:</label>
                        <select 
                            value={filters.dataType} 
                            onChange={(e) => handleFilterChange('dataType', e.target.value)}
                        >
                            <option value="all">All</option>
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
                    
                    <div className="filter-group">
                        <label>Status:</label>
                        <select 
                            value={filters.status} 
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                        </select>
                    </div>
                    
                    <div className="filter-group date-filter">
                        <label>Date:</label>
                        <input 
                            type="date" 
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                            placeholder="From"
                        />
                        <input 
                            type="date" 
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange('toDate', e.target.value)}
                            placeholder="To"
                        />
                    </div>
                </div>
            </div>
            
            {isLoading ? (
                <div className="loading-indicator">Loading scraped results...</div>
            ) : (
                <>
                    <div className="results-table-wrapper">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-col">
                                        <input 
                                            type="checkbox" 
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>URL</th>
                                    <th>Keywords</th>
                                    <th>Data Type</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-results">No results found</td>
                                    </tr>
                                ) : (
                                    filteredData.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedItems[item.id]}
                                                    onChange={() => handleSelectItem(item.id)}
                                                />
                                            </td>
                                            <td className="url-cell" title={item.url}>
                                                {item.url ? (item.url.length > 40 ? `${item.url.substring(0, 37)}...` : item.url) : 'N/A'}
                                            </td>
                                            <td className="keywords-cell">
                                                {item.keywords || 'N/A'}
                                            </td>
                                            <td>{item.data_type || 'N/A'}</td>
                                            <td>{formatDate(item.timestamp)}</td>
                                            <td>
                                                <span className={`status-badge ${item.status}`}>
                                                    {item.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button 
                                                    className="action-btn view-btn"
                                                    onClick={() => window.location.href = `/view/${item.id}`}
                                                >
                                                    View
                                                </button>
                                                <button 
                                                    className="action-btn export-btn"
                                                    onClick={() => handleExportSelected('json', [item.id])}
                                                >
                                                    Export
                                                </button>
                                                <button 
                                                    className="action-btn delete-btn"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="table-actions">
                        <div className="selection-info">
                            {getSelectedCount() > 0 ? (
                                <span>{getSelectedCount()} items selected</span>
                            ) : (
                                <span>No items selected</span>
                            )}
                        </div>
                        <div className="action-buttons">
                            <button 
                                className="action-btn"
                                onClick={() => handleExportSelected('csv')}
                                disabled={getSelectedCount() === 0}
                            >
                                Export Selected
                            </button>
                            <button 
                                className="action-btn delete-action"
                                onClick={handleDeleteSelected}
                                disabled={getSelectedCount() === 0}
                            >
                                Delete Selected
                            </button>
                            <button 
                                className="action-btn"
                                onClick={() => handleExportAll('json')}
                            >
                                Export All
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ResultsView;