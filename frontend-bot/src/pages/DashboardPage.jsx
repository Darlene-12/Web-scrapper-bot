// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Collapsible from '../components/common/Collapsible';
import './DashboardPage.css';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    activeScrapes: 0,
    scheduledTasks: 0,
    dataUsage: '0 KB',
    completedTasks: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulated data loading
  useEffect(() => {
    // In a real app, this would be an API call
    setTimeout(() => {
      setStats({
        activeScrapes: 5,
        scheduledTasks: 12,
        dataUsage: '2.5 GB',
        completedTasks: 283
      });
      
      setRecentActivity([
        {
          id: 1,
          name: 'Healthcare Data Scrape',
          status: 'Completed',
          timestamp: '2 hours ago',
          dataCount: 1458,
          url: 'https://healthcare-example.com'
        },
        {
          id: 2,
          name: 'Tech News Scrape',
          status: 'Completed',
          timestamp: '8 hours ago',
          dataCount: 372,
          url: 'https://technews-example.com'
        },
        {
          id: 3,
          name: 'Engineering Blog Scrape',
          status: 'Completed',
          timestamp: 'Yesterday',
          dataCount: 124,
          url: 'https://engineering-example.com'
        },
        {
          id: 4,
          name: 'PDF Extraction: Medical Reports',
          status: 'Completed',
          timestamp: '2 days ago',
          dataCount: 53,
          url: 'PDF Upload'
        },
        {
          id: 5,
          name: 'E-commerce Product Data',
          status: 'Failed',
          timestamp: '3 days ago',
          dataCount: 0,
          url: 'https://ecommerce-example.com',
          errorMessage: 'Access denied by target server'
        }
      ]);
      
      setIsLoading(false);
    }, 1000);
  }, []);
  
  const getStatusClass = (status) => {
    switch(status) {
      case 'Completed':
        return 'status-completed';
      case 'In Progress':
        return 'status-in-progress';
      case 'Scheduled':
        return 'status-scheduled';
      case 'Failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      
      <main className="dashboard-content">
        <div className="container">
          <header className="dashboard-header">
            <h1>Dashboard</h1>
            <div className="dashboard-actions">
              <Link to="/scrape" className="dashboard-button primary">New Scrape</Link>
              <Link to="/schedule" className="dashboard-button secondary">Schedule Task</Link>
            </div>
          </header>
          
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              <section className="stats-section">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon active-icon"></div>
                    <div className="stat-info">
                      <h2>{stats.activeScrapes}</h2>
                      <p>Active Scrapes</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon scheduled-icon"></div>
                    <div className="stat-info">
                      <h2>{stats.scheduledTasks}</h2>
                      <p>Scheduled Tasks</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon data-icon"></div>
                    <div className="stat-info">
                      <h2>{stats.dataUsage}</h2>
                      <p>Data Usage</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon completed-icon"></div>
                    <div className="stat-info">
                      <h2>{stats.completedTasks}</h2>
                      <p>Completed Tasks</p>
                    </div>
                  </div>
                </div>
              </section>
              
              <section className="activity-section">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-content">
                        <h3>{activity.name}</h3>
                        <div className="activity-details">
                          <span className={`activity-status ${getStatusClass(activity.status)}`}>
                            {activity.status}
                          </span>
                          <span className="activity-time">{activity.timestamp}</span>
                          <span className="activity-data">
                            {activity.dataCount} {activity.dataCount === 1 ? 'item' : 'items'}
                          </span>
                          <span className="activity-url" title={activity.url}>
                            {activity.url}
                          </span>
                        </div>
                        {activity.errorMessage && (
                          <div className="activity-error">
                            Error: {activity.errorMessage}
                          </div>
                        )}
                      </div>
                      <div className="activity-actions">
                        <Link to={`/results/${activity.id}`} className="activity-button">
                          View Data
                        </Link>
                        <button className="activity-button secondary">
                          Run Again
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              
              <section className="tools-section">
                <Collapsible title="Targeting Tools">
                  <div className="tools-grid">
                    <div className="tool-card">
                      <h3>CSS Selector Builder</h3>
                      <p>Create precise CSS selectors to target specific elements on web pages</p>
                      <Link to="/tools/css-selector" className="tool-link">Open Tool</Link>
                    </div>
                    
                    <div className="tool-card">
                      <h3>XPath Generator</h3>
                      <p>Generate XPath expressions to navigate through the structure of web pages</p>
                      <Link to="/tools/xpath" className="tool-link">Open Tool</Link>
                    </div>
                    
                    <div className="tool-card">
                      <h3>Regex Tester</h3>
                      <p>Test and refine regular expressions for pattern matching in scraped data</p>
                      <Link to="/tools/regex" className="tool-link">Open Tool</Link>
                    </div>
                    
                    <div className="tool-card">
                      <h3>Element Preview</h3>
                      <p>Preview selected elements before scraping to ensure correct targeting</p>
                      <Link to="/tools/preview" className="tool-link">Open Tool</Link>
                    </div>
                  </div>
                </Collapsible>
                
                <Collapsible title="API Integration">
                  <div className="api-section">
                    <div className="api-info">
                      <h3>Access Your Data via API</h3>
                      <p>
                        Integrate scraped data directly into your applications using our RESTful API.
                        Get data in JSON format with simple HTTP requests.
                      </p>
                      <div className="api-key">
                        <label>Your API Key:</label>
                        <div className="key-container">
                          <span className="masked-key">••••••••••••••••••••••</span>
                          <button className="show-key-button">Show</button>
                          <button className="copy-key-button">Copy</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="api-example">
                      <h4>Example Request:</h4>
                      <pre className="code-block">
                        {`curl -X GET https://api.webscrapex.com/v1/data \\
-H "Authorization: Bearer YOUR_API_KEY" \\
-H "Content-Type: application/json"`}
                      </pre>
                      <Link to="/api-docs" className="api-docs-link">View Full API Documentation</Link>
                    </div>
                  </div>
                </Collapsible>
                
                <Collapsible title="Analytics">
                  <div className="analytics-placeholder">
                    <div className="analytics-message">
                      <h3>Data Analytics Coming Soon</h3>
                      <p>
                        Our advanced analytics dashboard is under development. 
                        Soon you'll be able to visualize trends, perform data analysis,
                        and get insights directly from your scraped data.
                      </p>
                    </div>
                  </div>
                </Collapsible>
              </section>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardPage;