import React, { useState } from 'react';
import ScrapeForm from './components/ScrapeForm/ScrapeForm';
import ResultsTable from './components/ResultsTable/ResultsTable';
import AnalyticsPage from './pages/AnalyticsPage';
import './App.css';

function App() {
  const [scrapingResults, setScrapingResults] = useState(null);

  const handleScrapingComplete = (results) => {
    setScrapingResults(results);
    console.log('Scraping results:', results);
  };

  return (
    <div className="app-container">
      <main className="app-main">
        <ScrapeForm onScrapingComplete={handleScrapingComplete} />
        <ResultsTable data={scrapingResults} />
      </main>
    </div>
  );
}

export default App;


