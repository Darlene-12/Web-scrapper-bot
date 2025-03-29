// src/pages/SchedulingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Collapsible from '../components/common/Collapsible';
import { scraperApi } from '../services/api';
import { formatDate } from '../utils/helpers';
import './SchedulingPage.css';

const SchedulingPage = () => {
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    url: '',
    keywords: '',
    dataType: 'auto',
    frequency: 'daily',
    time: '08:00',
    daysOfWeek: {
      monday: true,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: true,
      saturday: false,
      sunday: false
    },
    dayOfMonth: 1,
    notifications: {
      email: true,
      webhook: false,
      emailAddress: '',
      webhookUrl: ''
    },
    deliveryMethod: 'email',
    scrapeMethod: 'selenium'
  });
  
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        
        // In a real app, fetch from API
        // const data = await scraperApi.getSchedules();
        // setSchedules(data);
        
        // Mock data for demonstration
        setTimeout(() => {
          setSchedules(getMockSchedules());
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching schedules:', err);
        setError('Unable to load scheduled tasks. Please try again later.');
        setLoading(false);
        
        // For demo - use mock data
        setSchedules(getMockSchedules());
      }
    };
    
    fetchSchedules();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setScheduleForm({
      ...scheduleForm,
      [name]: value
    });
  };
  
  const handleDayOfWeekChange = (day) => {
    setScheduleForm({
      ...scheduleForm,
      daysOfWeek: {
        ...scheduleForm.daysOfWeek,
        [day]: !scheduleForm.daysOfWeek[day]
      }
    });
  };
  
  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setScheduleForm({
        ...scheduleForm,
        notifications: {
          ...scheduleForm.notifications,
          [name]: checked
        }
      });
    } else {
      setScheduleForm({
        ...scheduleForm,
        notifications: {
          ...scheduleForm.notifications,
          [name]: value
        }
      });
    }
  };
  
  const saveSchedule = async () => {
    // Validate the form
    if (!scheduleForm.name.trim()) {
      setError('Please provide a name for this schedule');
      return;
    }
    
    if (!scheduleForm.url.trim()) {
      setError('Please provide a URL to scrape');
      return;
    }
    
    if (scheduleForm.frequency === 'weekly' && 
        !Object.values(scheduleForm.daysOfWeek).some(day => day)) {
      setError('Please select at least one day of the week');
      return;
    }
    
    if (scheduleForm.notifications.email && !scheduleForm.notifications.emailAddress) {
      setError('Please provide an email address for notifications');
      return;
    }
    
    if (scheduleForm.notifications.webhook && !scheduleForm.notifications.webhookUrl) {
      setError('Please provide a webhook URL for notifications');
      return;
    }
    
    setError(null);
    setSaving(true);
    
    try {
      // In a real app, send to API
      // await scraperApi.createSchedule(scheduleForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update local state with new schedule
      const newSchedule = {
        id: `schedule-${Date.now()}`,
        name: scheduleForm.name,
        url: scheduleForm.url,
        frequency: scheduleForm.frequency,
        time: scheduleForm.time,
        nextRun: calculateNextRun(scheduleForm),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      setSchedules([newSchedule, ...schedules]);
      
      // Reset form
      setScheduleForm({
        ...scheduleForm,
        name: '',
        url: '',
        keywords: ''
      });
      
      // Show success message
      setSuccessMessage('Schedule created successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Unable to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled task?')) {
      return;
    }
    
    try {
      // In a real app, call API
      // await scraperApi.deleteSchedule(scheduleId);
      
      // Update local state
      setSchedules(schedules.filter(schedule => schedule.id !== scheduleId));
      
      // Show success message
      setSuccessMessage('Schedule deleted successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Unable to delete schedule. Please try again.');
    }
  };
  
  const toggleScheduleStatus = async (scheduleId) => {
    try {
      // Find the schedule to update
      const updatedSchedules = schedules.map(schedule => {
        if (schedule.id === scheduleId) {
          return {
            ...schedule,
            status: schedule.status === 'active' ? 'paused' : 'active'
          };
        }
        return schedule;
      });
      
      // In a real app, call API
      // await scraperApi.updateSchedule(scheduleId, { status: newStatus });
      
      // Update local state
      setSchedules(updatedSchedules);
      
    } catch (err) {
      console.error('Error updating schedule status:', err);
      setError('Unable to update schedule status. Please try again.');
    }
  };
  
  // Calculate next run date based on schedule settings
  const calculateNextRun = (schedule) => {
    const now = new Date();
    const [hour, minute] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);
    
    // If the time has already passed today, move to next occurrence
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    if (schedule.frequency === 'weekly') {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = daysOfWeek[nextRun.getDay()];
      
      // If the current day is not selected, find the next selected day
      if (!schedule.daysOfWeek[currentDay]) {
        let daysToAdd = 1;
        let nextDay = nextRun.getDay() + 1;
        
        while (daysToAdd < 7) {
          if (nextDay > 6) nextDay = 0; // Wrap around to Sunday
          
          if (schedule.daysOfWeek[daysOfWeek[nextDay]]) {
            break;
          }
          
          daysToAdd++;
          nextDay++;
        }
        
        nextRun.setDate(nextRun.getDate() + daysToAdd);
      }
    } else if (schedule.frequency === 'monthly') {
      const dayOfMonth = parseInt(schedule.dayOfMonth, 10);
      
      nextRun.setDate(dayOfMonth);
      
      // If this would put us in the past, move to next month
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }
    
    return nextRun.toISOString();
  };
  
  // Mock data for demonstration
  const getMockSchedules = () => {
    return [
      {
        id: 'schedule-1',
        name: 'Daily Tech News',
        url: 'https://technews-example.com',
        frequency: 'daily',
        time: '08:00',
        nextRun: '2023-07-22T08:00:00.000Z',
        status: 'active',
        createdAt: '2023-06-10T14:23:45.000Z'
      },
      {
        id: 'schedule-2',
        name: 'Weekly Healthcare Updates',
        url: 'https://healthcare-example.com',
        frequency: 'weekly',
        time: '10:30',
        nextRun: '2023-07-24T10:30:00.000Z',
        status: 'active',
        createdAt: '2023-05-22T11:15:30.000Z'
      },
      {
        id: 'schedule-3',
        name: 'Monthly Industry Report',
        url: 'https://industry-example.com',
        frequency: 'monthly',
        time: '09:00',
        nextRun: '2023-08-01T09:00:00.000Z',
        status: 'paused',
        createdAt: '2023-04-05T16:40:12.000Z'
      }
    ];
  };

  return (
    <div className="scheduling-page">
      <Navbar />
      
      <main className="scheduling-content">
        <div className="container">
          <header className="scheduling-header">
            <div>
              <h1>Schedule Scraping Tasks</h1>
              <p>Create recurring scraping tasks that run automatically on your schedule</p>
            </div>
            <Link to="/scrape" className="button secondary">
              One-time Scrape
            </Link>
          </header>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          <div className="scheduling-form-section">
            <h2>Create New Schedule</h2>
            
            <div className="scheduling-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Schedule Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={scheduleForm.name}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="E.g., Daily News Scrape"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="url">Website URL</label>
                  <input
                    type="url"
                    id="url"
                    name="url"
                    value={scheduleForm.url}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="https://example.com/data-page"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="scrapeMethod">Scraping Method</label>
                  <select
                    id="scrapeMethod"
                    name="scrapeMethod"
                    value={scheduleForm.scrapeMethod}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="selenium">Selenium</option>
                    <option value="beautifulsoup">BeautifulSoup</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="keywords">Keywords (optional)</label>
                  <input
                    type="text"
                    id="keywords"
                    name="keywords"
                    value={scheduleForm.keywords}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter comma-separated keywords"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dataType">Data Type</label>
                  <select
                    id="dataType"
                    name="dataType"
                    value={scheduleForm.dataType}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="text">Text Content</option>
                    <option value="tables">Table Data</option>
                    <option value="links">Links</option>
                    <option value="images">Images</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="frequency">Frequency</label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={scheduleForm.frequency}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="time">Time</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={scheduleForm.time}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
              </div>
              
              {scheduleForm.frequency === 'weekly' && (
                <div className="form-group">
                  <label>Days of Week</label>
                  <div className="days-of-week">
                    {Object.keys(scheduleForm.daysOfWeek).map((day) => (
                      <div className="day-option" key={day}>
                        <input
                          type="checkbox"
                          id={`day-${day}`}
                          checked={scheduleForm.daysOfWeek[day]}
                          onChange={() => handleDayOfWeekChange(day)}
                        />
                        <label htmlFor={`day-${day}`}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {scheduleForm.frequency === 'monthly' && (
                <div className="form-group">
                  <label htmlFor="dayOfMonth">Day of Month</label>
                  <select
                    id="dayOfMonth"
                    name="dayOfMonth"
                    value={scheduleForm.dayOfMonth}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <Collapsible title="Notification Settings">
                <div className="notification-settings">
                  <div className="form-group checkbox-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="emailNotification"
                        name="email"
                        checked={scheduleForm.notifications.email}
                        onChange={handleNotificationChange}
                      />
                      <label htmlFor="emailNotification">
                        Email Notifications
                      </label>
                    </div>
                  </div>
                  
                  {scheduleForm.notifications.email && (
                    <div className="form-group">
                      <label htmlFor="emailAddress">Email Address</label>
                      <input
                        type="email"
                        id="emailAddress"
                        name="emailAddress"
                        value={scheduleForm.notifications.emailAddress}
                        onChange={handleNotificationChange}
                        className="form-control"
                        placeholder="your@email.com"
                      />
                    </div>
                  )}
                  
                  <div className="form-group checkbox-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="webhookNotification"
                        name="webhook"
                        checked={scheduleForm.notifications.webhook}
                        onChange={handleNotificationChange}
                      />
                      <label htmlFor="webhookNotification">
                        Webhook Notifications
                      </label>
                    </div>
                  </div>
                  
                  {scheduleForm.notifications.webhook && (
                    <div className="form-group">
                      <label htmlFor="webhookUrl">Webhook URL</label>
                      <input
                        type="url"
                        id="webhookUrl"
                        name="webhookUrl"
                        value={scheduleForm.notifications.webhookUrl}
                        onChange={handleNotificationChange}
                        className="form-control"
                        placeholder="https://your-webhook.com/endpoint"
                      />
                    </div>
                  )}
                </div>
              </Collapsible>
              
              <Collapsible title="Data Delivery Method">
                <div className="delivery-settings">
                  <div className="form-group">
                    <label htmlFor="deliveryMethod">Delivery Method</label>
                    <select
                      id="deliveryMethod"
                      name="deliveryMethod"
                      value={scheduleForm.deliveryMethod}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="email">Email Attachment</option>
                      <option value="api">API Endpoint</option>
                      <option value="database">Database Storage</option>
                      <option value="cloud">Cloud Storage</option>
                    </select>
                  </div>
                </div>
              </Collapsible>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={saveSchedule}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="schedules-list-section">
            <h2>Your Scheduled Tasks</h2>
            // Continuing the SchedulingPage.jsx component
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="empty-schedules">
                <p>You don't have any scheduled tasks yet.</p>
              </div>
            ) : (
              <div className="schedules-list">
                {schedules.map((schedule) => (
                  <div 
                    key={schedule.id} 
                    className={`schedule-item ${schedule.status === 'paused' ? 'paused' : ''}`}
                  >
                    <div className="schedule-details">
                      <h3>{schedule.name}</h3>
                      <div className="schedule-meta">
                        <span className="meta-item">
                          <i className="icon-link"></i> {schedule.url}
                        </span>
                        <span className="meta-item">
                          <i className="icon-clock"></i> {formatScheduleFrequency(schedule)}
                        </span>
                        <span className="meta-item">
                          <i className="icon-calendar"></i> Next run: {formatDate(schedule.nextRun, { type: 'datetime' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="schedule-actions">
                      <button 
                        className={`status-toggle ${schedule.status === 'active' ? 'pause-button' : 'resume-button'}`}
                        onClick={() => toggleScheduleStatus(schedule.id)}
                      >
                        {schedule.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button 
                        className="edit-button"
                        onClick={() => {
                          // In a real app, this would populate the form with schedule data
                          alert('Edit functionality would be implemented in a full app');
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Helper function to format schedule frequency in a human-readable way
const formatScheduleFrequency = (schedule) => {
  switch (schedule.frequency) {
    case 'hourly':
      return 'Every hour';
    case 'daily':
      return `Daily at ${schedule.time}`;
    case 'weekly':
      return `Weekly at ${schedule.time}`;
    case 'monthly':
      return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
    default:
      return `${schedule.frequency} at ${schedule.time}`;
  }
};

export default SchedulingPage;