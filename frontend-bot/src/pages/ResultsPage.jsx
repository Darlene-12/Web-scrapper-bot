// src/pages/ResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ResultsTable from '../components/results/ResultsTable';
import ExportOptions from '../components/results/ExportOptions';
import DataProcessing from '../components/results/DataProcessing';
import Collapsible from '../components/common/Collapsible';
import { scraperApi } from '../services/api';
import { formatDate } from '../utils/helpers';
import './ResultsPage.css';

const ResultsPage = () => {
  const { taskId } = useParams();
  const [results, setResults] = useState([]);
  const [taskInfo, setTaskInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingData, setProcessingData] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        if (taskId) {
          // If taskId is provided, fetch specific task results
          const taskData = await scraperApi.getScrapeStatus(taskId);
          setTaskInfo(taskData);

          if (taskData.status === 'completed') {
            const resultData = await scraperApi.getScrapeResults(taskId);
            setResults(resultData.data || []);
          }
        } else {
          // If no taskId, try to get the most recent task
          // This is a simplified example - in a real app, you might show a list of recent tasks
          const mockResults = getMockData(); // For demo purposes
          setResults(mockResults);
          setTaskInfo({
            id: 'recent-task',
            url: 'https://example.com',
            status: 'completed',
            created_at: new Date().toISOString(),
            item_count: mockResults.length,
            scrape_method: 'selenium'
          });
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Unable to load results. Please try again later.');
        
        // For demo purposes - use mock data on error
        const mockResults = getMockData();
        setResults(mockResults);
        setTaskInfo({
          id: 'demo-task',
          url: 'https://example.com',
          status: 'completed',
          created_at: new Date().toISOString(),
          item_count: mockResults.length,
          scrape_method: 'selenium'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [taskId]);

  const handleProcessData = (processedData) => {
    setProcessingData(true);
    
    // Simulate processing delay
    setTimeout(() => {
      setResults(processedData);
      setProcessingData(false);
    }, 1000);
  };

  // Mock data for demonstration purposes
  const getMockData = () => {
    return [
      { title: 'Web Scraping Techniques', author: 'John Doe', date: '2023-05-15', category: 'Technology', views: 1250 },
      { title: 'Data Extraction Best Practices', author: 'Jane Smith', date: '2023-06-02', category: 'Technology', views: 987 },
      { title: 'Python vs JavaScript for Scraping', author: 'Alex Johnson', date: '2023-04-28', category: 'Programming', views: 1624 },
      { title: 'Handling Dynamic Websites', author: 'Sarah Williams', date: '2023-07-12', category: 'Technology', views: 756 },
      { title: 'Ethical Web Scraping Guidelines', author: 'Michael Brown', date: '2023-05-30', category: 'Ethics', views: 2103 },
      { title: 'Using Proxies for Web Scraping', author: 'Emily Davis', date: '2023-06-18', category: 'Security', views: 897 },
      { title: 'Selenium Advanced Techniques', author: 'Robert Wilson', date: '2023-07-05', category: 'Programming', views: 1342 },
      { title: 'Beautiful Soup vs Scrapy', author: 'Laura Miller', date: '2023-04-12', category: 'Programming', views: 1576 },
      { title: 'Scraping E-commerce Sites', author: 'Daniel Taylor', date: '2023-06-25', category: 'Business', views: 983 },
      { title: 'Avoiding Being Blocked', author: 'Olivia Anderson', date: '2023-05-20', category: 'Security', views: 2341 }
    ];
  };

  return (
    <div className="results-page">
      <Navbar />
      
      <main className="results-content">
        <div className="container">
          <header className="results-header">
            <div className="header-info">
              <h1>Scraping Results</h1>
              {taskInfo && (
                <div className="task-info">
                  <p>
                    <span className="info-label">Source:</span>
                    <span className="info-value">{taskInfo.url}</span>
                  </p>
                  <p>
                    <span className="info-label">Date:</span>
                    <span className="info-value">
                      {formatDate(taskInfo.created_at, { type: 'datetime' })}
                    </span>
                  </p>
                  <p>
                    <span className="info-label">Method:</span>
                    <span className="info-value">{taskInfo.scrape_method}</span>
                  </p>
                  <p>
                    <span className="info-label">Status:</span>
                    <span className={`info-value status-${taskInfo.status}`}>
                      {taskInfo.status.charAt(0).toUpperCase() + taskInfo.status.slice(1)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            <div className="header-actions">
              <Link to="/scrape" className="button secondary">
                New Scrape
              </Link>
              <Link to="/schedule" className="button primary">
                Schedule Recurring
              </Link>
            </div>
          </header>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="results-sections">
            {/* Results display section */}
            <section className="results-table-section">
              <h2>Data Results <span className="item-count">({results.length} items)</span></h2>
              <ResultsTable 
                data={results} 
                loading={loading || processingData} 
              />
            </section>
            
            {/* Export section */}
            <section className="export-section">
              <ExportOptions 
                data={results} 
                filename={`scrape-data-${taskInfo?.id || 'export'}`} 
              />
            </section>
            
            {/* Data processing section (collapsible) */}
            <section className="processing-section">
              <Collapsible title="Data Processing">
                <DataProcessing 
                  data={results} 
                  onProcessData={handleProcessData} 
                />
              </Collapsible>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResultsPage;