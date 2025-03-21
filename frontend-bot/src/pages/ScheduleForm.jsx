import React, { useState, useEffect } from 'react';
import { createSchedule, getSchedules, deleteSchedule, runSchedule, updateSchedule } from '../api/api';
import './ScheduleForm.css';

const ScheduleForm = () => {
    // Form state
    const [formState, setFormState] = useState({
        url: '',
        keywords: '',
        dataType: 'auto',
        frequency: 'daily',
        useSelenium: false,
        sendNotifications: false,
        timeout: 30,
        maxDepth: 1,
        followLinks: false,
        name: '',
        customHeaders: '',
        proxyId: ''
    });
    
    // Scheduled tasks
    const [scheduledTasks, setScheduledTasks] = useState([]);
    
    // Loading states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Available proxies
    const [availableProxies, setAvailableProxies] = useState([]);
    
    // Advanced options toggle
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Fetch scheduled tasks on component mount
    useEffect(() => {
        fetchScheduledTasks();
        fetchProxies();
    }, []);

    // Fetch all scheduled tasks from API
    const fetchScheduledTasks = async () => {
        setIsLoading(true);
        try {
            const response = await getSchedules();
            setScheduledTasks(response.data);
        } catch (error) {
            console.error('Error fetching scheduled tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Fetch available proxies
    const fetchProxies = async () => {
        try {
            const response = await fetch('/api/proxies/?is_active=true');
            const data = await response.json();
            setAvailableProxies(data);
        } catch (error) {
            console.error('Error fetching proxies:', error);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState({
            ...formState,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Handle form submission to create new schedule
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formState.url) {
            alert('URL is required');
            return;
        }
        
        if (!formState.name) {
            // Auto-generate name if not provided
            formState.name = `Scrape ${new URL(formState.url).hostname}`;
        }
        
        setIsSubmitting(true);
        
        try {
            // Parse custom headers if provided
            let customHeaders = null;
            if (formState.customHeaders.trim()) {
                try {
                    customHeaders = JSON.parse(formState.customHeaders);
                } catch (e) {
                    alert('Invalid JSON format for custom headers');
                    setIsSubmitting(false);
                    return;
                }
            }
            
            await createSchedule({
                name: formState.name,
                url: formState.url,
                keywords: formState.keywords,
                data_type: formState.dataType,
                frequency: formState.frequency,
                use_selenium: formState.useSelenium,
                notify_on_completion: formState.sendNotifications,
                timeout: parseInt(formState.timeout, 10),
                max_depth: parseInt(formState.maxDepth, 10),
                follow_links: formState.followLinks,
                custom_headers: customHeaders,
                proxy_id: formState.proxyId || null
            });
            
            // Reset form
            setFormState({
                url: '',
                keywords: '',
                dataType: 'auto',
                frequency: 'daily',
                useSelenium: false,
                sendNotifications: false,
                timeout: 30,
                maxDepth: 1,
                followLinks: false,
                name: '',
                customHeaders: '',
                proxyId: ''
            });
            
            // Reset advanced options
            setShowAdvancedOptions(false);
            
            // Refresh tasks list
            await fetchScheduledTasks();
            
        } catch (error) {
            console.error('Error creating schedule:', error);
            alert(`Failed to create schedule: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle running a scheduled task immediately
    const handleRunNow = async (id) => {
        try {
            await runSchedule(id);
            alert('Task started successfully');
            // Refresh tasks list to update next run time
            await fetchScheduledTasks();
        } catch (error) {
            console.error('Error running task:', error);
            alert(`Failed to run task: ${error.message}`);
        }
    };

    // Handle deleting a scheduled task
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this scheduled task?')) {
            return;
        }
        
        try {
            await deleteSchedule(id);
            // Refresh tasks list
            await fetchScheduledTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(`Failed to delete task: ${error.message}`);
        }
    };
    
    // Toggle active state of a scheduled task
    const handleToggleActive = async (id, currentState) => {
        try {
            await updateSchedule(id, { is_active: !currentState });
            // Refresh tasks list
            await fetchScheduledTasks();
        } catch (error) {
            console.error('Error updating task:', error);
            alert(`Failed to update task: ${error.message}`);
        }
    };

    return (
        <div className="schedule-container">
            <div className="schedule-header">
                <h2>Schedule Scraping Tasks</h2>
            </div>
            
            <div className="schedule-form">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="url">Enter URL:</label>
                        <input
                            type="url"
                            id="url"
                            name="url"
                            value={formState.url}
                            onChange={handleInputChange}
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="keywords">Keywords:</label>
                        <input
                            type="text"
                            id="keywords"
                            name="keywords"
                            value={formState.keywords}
                            onChange={handleInputChange}
                            placeholder="Optional keywords separated by commas"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="dataType">Data Type:</label>
                        <select
                            id="dataType"
                            name="dataType"
                            value={formState.dataType}
                            onChange={handleInputChange}
                        >
                            <option value="auto">Auto-detect</option>
                            <option value="full_page">Full Page</option>
                            <option value="structured">Structured Data</option>
                            <option value="text_only">Text Only</option>
                            <option value="links">Links</option>
                            <option value="images">Images</option>
                            <option value="tables">Tables</option>
                            <option value="custom">Custom (JSON Path)</option>
                        </select>
                    </div>

                    <div className="form-group frequency-group">
                        <label>Frequency:</label>
                        <div className="frequency-buttons">
                            <button
                                type="button"
                                className={formState.frequency === 'daily' ? 'active' : ''}
                                onClick={() => setFormState({...formState, frequency: 'daily'})}
                            >
                                Daily
                            </button>
                            <button
                                type="button"
                                className={formState.frequency === 'weekly' ? 'active' : ''}
                                onClick={() => setFormState({...formState, frequency: 'weekly'})}
                            >
                                Weekly
                            </button>
                            <button
                                type="button"
                                className={formState.frequency === 'monthly' ? 'active' : ''}
                                onClick={() => setFormState({...formState, frequency: 'monthly'})}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                className={formState.frequency === 'custom' ? 'active' : ''}
                                onClick={() => setFormState({...formState, frequency: 'custom'})}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    <div className="form-group options-row">
                        <label>Options:</label>
                        <div className="options-controls">
                            <div className="option-item">
                                <input
                                    type="checkbox"
                                    id="useSelenium"
                                    name="useSelenium"
                                    checked={formState.useSelenium}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="useSelenium">Use Selenium</label>
                            </div>
                            
                            <div className="option-item">
                                <input
                                    type="checkbox"
                                    id="sendNotifications"
                                    name="sendNotifications"
                                    checked={formState.sendNotifications}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="sendNotifications">Send Email Notifications</label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="advanced-toggle">
                        <button 
                            type="button"
                            className="toggle-btn"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        >
                            {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
                        </button>
                    </div>
                    
                    {showAdvancedOptions && (
                        <div className="advanced-options">
                            <div className="form-group">
                                <label htmlFor="timeout">Timeout (seconds):</label>
                                <input
                                    type="number"
                                    id="timeout"
                                    name="timeout"
                                    min="5"
                                    max="300"
                                    value={formState.timeout}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="maxDepth">Max Crawl Depth:</label>
                                <input
                                    type="number"
                                    id="maxDepth"
                                    name="maxDepth"
                                    min="1"
                                    max="10"
                                    value={formState.maxDepth}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group checkbox-group">
                                <input
                                    type="checkbox"
                                    id="followLinks"
                                    name="followLinks"
                                    checked={formState.followLinks}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="followLinks">Follow Links</label>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="customHeaders">Custom Headers (JSON):</label>
                                <textarea
                                    id="customHeaders"
                                    name="customHeaders"
                                    value={formState.customHeaders}
                                    onChange={handleInputChange}
                                    placeholder='{"User-Agent": "Custom User Agent", "Accept-Language": "en-US,en;q=0.9"}'
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="proxyId">Use Proxy:</label>
                                <select
                                    id="proxyId"
                                    name="proxyId"
                                    value={formState.proxyId}
                                    onChange={handleInputChange}
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

                    <div className="form-group">
                        <label htmlFor="name">Name:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formState.name}
                            onChange={handleInputChange}
                            placeholder="Optional schedule name"
                        />
                    </div>

                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="schedule-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Scheduling...' : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="scheduled-tasks-section">
                <h3>Scheduled Tasks:</h3>
                
                {isLoading ? (
                    <div className="loading">Loading scheduled tasks...</div>
                ) : scheduledTasks.length === 0 ? (
                    <div className="no-tasks">No scheduled tasks found</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="scheduled-tasks-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>URL</th>
                                    <th>Frequency</th>
                                    <th>Next Run</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduledTasks.map(task => (
                                    <tr key={task.id}>
                                        <td>{task.name}</td>
                                        <td className="url-cell" title={task.url}>
                                            {task.url.length > 30 ? `${task.url.substring(0, 27)}...` : task.url}
                                        </td>
                                        <td>{task.frequency}</td>
                                        <td>{task.next_run_display || task.next_run}</td>
                                        <td>
                                            <span 
                                                className={`status-badge ${task.is_active ? 'active' : 'inactive'}`}
                                                onClick={() => handleToggleActive(task.id, task.is_active)}
                                                title={task.is_active ? "Click to deactivate" : "Click to activate"}
                                            >
                                                {task.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button 
                                                className="action-btn run-btn"
                                                onClick={() => handleRunNow(task.id)}
                                                title="Run Now"
                                            >
                                                Run
                                            </button>
                                            <button 
                                                className="action-btn edit-btn"
                                                onClick={() => alert('Edit functionality to be implemented')}
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="action-btn delete-btn"
                                                onClick={() => handleDelete(task.id)}
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
        </div>
    );
};

export default ScheduleForm;