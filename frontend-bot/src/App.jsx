import React, { useState, useEffect } from 'react';
import ScrapeForm from './components/ScrapeForm/ScrapeForm';
import ResultsTable from './components/ResultsTable/ResultsTable';
import ScheduleForm from './pages/ScheduleForm'; 
import ResultsView from './pages/ResultsView';
import ProxyManagement from './pages/ProxyManagement';

import './App.css';

function App() {
  const [scrapingResults, setScrapingResults] = useState(null);
  const [currentPage, setCurrentPage] = useState('scrape');

  useEffect(() => {
    console.log(`Current page is now: ${currentPage}`);
  }, [currentPage]);

  const handleScrapingComplete = (results) => {
    setScrapingResults(results);
    console.log('Scraping results:', results);
  };

  // Improved navigation handler
  const handleNavigate = (page) => {
    console.log(`Navigation requested to: ${page}`);
    // Ensure the page value is valid
    if (['scrape', 'results', 'schedule', 'proxies'].includes(page)) {
      setCurrentPage(page);
    } else {
      console.error(`Invalid page requested: ${page}`);
    }
  };

  // Render content based on current page
  const renderContent = () => {
    console.log(`Rendering content for page: ${currentPage}`);

    switch (currentPage) {
      case 'scrape':
        return (
          <>
            <ScrapeForm 
              onScrapingComplete={handleScrapingComplete} 
              onNavigate={handleNavigate} 
            />
            <ResultsTable data={scrapingResults} />
          </>
        );
      case 'schedule':
        return <ScheduleForm onNavigate={handleNavigate} />;
      case 'results':
        return <ResultsView onNavigate={handleNavigate} />;
      case 'proxies':
        // Make sure we're rendering ProxyManagement, not ResultsView
        console.log("Rendering ProxyManagement component");
        return <ProxyManagement onNavigate={handleNavigate} />;
      default:
        return (
          <>
            <ScrapeForm 
              onScrapingComplete={handleScrapingComplete}
              onNavigate={handleNavigate} 
            />
            <ResultsTable data={scrapingResults} />
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;