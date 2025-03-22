import React, { useState, useEffect } from 'react';
import { getProxies, testProxy, deleteProxy, addProxy, updateProxy } from '../api/api';
import './ProxyManagement.css';

const ProxyManagement = () => {
    // State for proxies list
    const [proxies, setProxies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State for add/edit proxy modal
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentProxy, setCurrentProxy] = useState(null);
    
    // Form state
    const [formState, setFormState] = useState({
        address: '',
        port: '',
        type: 'http',
        username: '',
        password: '',
        is_active: true
    });

    // Load proxies on component mount
    useEffect(() => {
        fetchProxies();
    }, []);

    // Fetch all proxies from API
    const fetchProxies = async () => {
        setLoading(true);
        try {
            const response = await getProxies();
            setProxies(response.data);
        } catch (error) {
            console.error('Error fetching proxies:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle opening the add proxy modal
    const handleAddProxy = () => {
        setFormState({
            address: '',
            port: '',
            type: 'http',
            username: '',
            password: '',
            is_active: true
        });
        setEditMode(false);
        setCurrentProxy(null);
        setShowModal(true);
    };

    // Handle opening the edit proxy modal
    const handleEditProxy = (proxy) => {
        setFormState({
            address: proxy.address,
            port: proxy.port,
            type: proxy.proxy_type,
            username: proxy.username || '',
            password: proxy.password || '',
            is_active: proxy.is_active
        });
        setEditMode(true);
        setCurrentProxy(proxy);
        setShowModal(true);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState({
            ...formState,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const proxyData = {
                address: formState.address,
                port: parseInt(formState.port, 10),
                proxy_type: formState.type,
                username: formState.username || null,
                password: formState.password || null,
                is_active: formState.is_active
            };
            
            if (editMode) {
                await updateProxy(currentProxy.id, proxyData);
            } else {
                await addProxy(proxyData);
            }
            
            // Refresh proxies list
            await fetchProxies();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving proxy:', error);
            alert(`Failed to save proxy: ${error.message}`);
        }
    };

    // Handle testing a proxy
    const handleTestProxy = async (proxyId) => {
        try {
            const response = await testProxy(proxyId);
            alert(`Proxy test ${response.data.status}: ${response.data.message}`);
            // Refresh proxies list to update success rate
            await fetchProxies();
        } catch (error) {
            console.error('Error testing proxy:', error);
            alert(`Failed to test proxy: ${error.message}`);
        }
    };

    // Handle deleting a proxy
    const handleDeleteProxy = async (proxyId) => {
        if (!window.confirm('Are you sure you want to delete this proxy?')) {
            return;
        }
        
        try {
            await deleteProxy(proxyId);
            // Refresh proxies list
            await fetchProxies();
        } catch (error) {
            console.error('Error deleting proxy:', error);
            alert(`Failed to delete proxy: ${error.message}`);
        }
    };

    // Format success rate for display
    const formatSuccessRate = (proxy) => {
        if (!proxy.success_rate && proxy.success_rate !== 0) {
            return 'N/A';
        }
        return `${proxy.success_rate}%`;
    };

    // Format last used time for display
    const formatLastUsed = (proxy) => {
        if (!proxy.last_used_display && !proxy.last_used) {
            return 'Never';
        }
        return proxy.last_used_display || new Date(proxy.last_used).toLocaleString();
    };

    return (
        <div className="proxy-management-container">
            <div className="proxy-header">
                <h2>Proxy Management</h2>
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
                    onClick={() => {
                    console.log('Schedule button clicked');
                    if (onNavigate) onNavigate('schedule');
                    }}
                >
                    Schedule
                </button>

                <button 
                    className="nav-button"
                    onClick={() => onNavigate && onNavigate('results')}
                >
                    Proxies
                </button>

                </div>
            </div>

            
            <div className="proxy-actions">
                <button className="add-proxy-btn" onClick={handleAddProxy}>
                    [Add New Proxy]
                </button>
            </div>
            
            <div className="proxy-list-section">
                {loading ? (
                    <div className="loading">Loading proxies...</div>
                ) : proxies.length === 0 ? (
                    <div className="no-proxies">No proxies configured</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="proxies-table">
                            <thead>
                                <tr>
                                    <th>Address</th>
                                    <th>Port</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Success Rate</th>
                                    <th>Last Used</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proxies.map(proxy => (
                                    <tr key={proxy.id}>
                                        <td>{proxy.address}</td>
                                        <td>{proxy.port}</td>
                                        <td>{proxy.proxy_type}</td>
                                        <td>
                                            <span className={`status-badge ${proxy.is_active ? 'active' : 'inactive'}`}>
                                                {proxy.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>{formatSuccessRate(proxy)}</td>
                                        <td>{formatLastUsed(proxy)}</td>
                                        <td className="actions-cell">
                                            <button 
                                                className="action-btn test-btn"
                                                onClick={() => handleTestProxy(proxy.id)}
                                                title="Test"
                                            >
                                                Test
                                            </button>
                                            <button 
                                                className="action-btn edit-btn"
                                                onClick={() => handleEditProxy(proxy)}
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteProxy(proxy.id)}
                                                title="Delete"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Add/Edit Proxy Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="proxy-modal">
                        <div className="modal-header">
                            <h3>{editMode ? 'Edit Proxy' : 'Add New Proxy'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="address">Address:</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formState.address}
                                    onChange={handleInputChange}
                                    placeholder="IP address or hostname"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="port">Port:</label>
                                <input
                                    type="number"
                                    id="port"
                                    name="port"
                                    value={formState.port}
                                    onChange={handleInputChange}
                                    placeholder="Port number"
                                    min="1"
                                    max="65535"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="type">Type:</label>
                                <select
                                    id="type"
                                    name="type"
                                    value={formState.type}
                                    onChange={handleInputChange}
                                >
                                    <option value="http">HTTP</option>
                                    <option value="https">HTTPS</option>
                                    <option value="socks4">SOCKS4</option>
                                    <option value="socks5">SOCKS5</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="username">Username (optional):</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formState.username}
                                    onChange={handleInputChange}
                                    placeholder="Proxy username if required"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="password">Password (optional):</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formState.password}
                                    onChange={handleInputChange}
                                    placeholder="Proxy password if required"
                                />
                            </div>
                            
                            <div className="form-group checkbox-group">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formState.is_active}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="is_active">Active</label>
                            </div>
                            
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="save-btn">
                                    {editMode ? 'Update Proxy' : 'Add Proxy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProxyManagement;