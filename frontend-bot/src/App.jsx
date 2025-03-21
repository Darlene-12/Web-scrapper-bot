import React, { useState, useEffect } from 'react';
import ScrapeForm from './components/ScrapeForm/ScrapeForm';
import ResultsTable from './components/ResultsTable/ResultsTable';
import SchedulePage from './pages/SchedulePage'; // Add import for SchedulePage
import ResultsPage from './pages/ResultsPage'; // Import the ResultsPage


import './App.css';

function App() {
  const [scrapingResults, setScrapingResults] = useState(null);
  const [currentPage, setCurrentPage] = useState('scrape'); // Add state for current page

  // Add effect to log when page changes
  useEffect(() => {
    console.log(`Current page is now: ${currentPage}`);
  }, [currentPage]);

  const handleScrapingComplete = (results) => {
    setScrapingResults(results);
    console.log('Scraping results:', results);
  };

  const handleNavigate = (page) => {
    console.log(`Navigation requested to: ${page}`);
    setCurrentPage(page);
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
        return <SchedulePage onNavigate={handleNavigate} />;
      case 'results':
        // When you create ResultsPage component:
        // return <ResultsPage onNavigate={handleNavigate} />;
        return <ResultsPage onNavigate={handleNavigate} />;
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