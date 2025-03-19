import { useState } from 'react';
import ScrapeForm from './components/ScrapeForm/ScrapeForm';
import './App.css';

function App(){
  const [scrapingResults, setScrapingResults] = useState(null);

  const handleScrapingComplete = (data) => {
    setScrapingResults(data);
    console.log(' Scraping results:', results);
  };  


  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Web Scraping</h1>
      </header>
      <main className="app-main">
        <ScrapeForm onScrapingComplete={handleScrapingComplete} />
        {scrapingResults && (
          <div className="results-preview">
            <h2>Scraping Results</h2>
            <pre>{JSON.stringify(scrapingResults, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;