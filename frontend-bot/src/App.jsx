import React, { useState } from 'react';
import ScrapeForm from './components/ScrapeForm/ScrapeForm';
import ResultsTable from './components/ResultsTable/ResultsTable';
import SchedulePage from './pages/SchedulePage'; // Add import for SchedulePage

import './App.css';

function App() {
  const [scrapingResults, setScrapingResults] = useState(null);
  const [currentPage, setCurrentPage] = useState('scrape'); // Add state for current page

  const handleScrapingComplete = (results) => {
    setScrapingResults(results);
    console.log('Scraping results:', results);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Render content based on current page
  const renderContent = () => {
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
        return <div>Results Page - Coming Soon</div>;
      default:
        return (
          <>
            <ScrapeForm onScrapingComplete={handleScrapingComplete}
            onNavigate={handleNavigate} />
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