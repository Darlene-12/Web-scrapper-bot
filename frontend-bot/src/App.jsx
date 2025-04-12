// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';


// Import pages
import LandingPage from './pages/LandingPage';
import ScrapePage from './pages/ScrapePage';
import ResultsPage from './pages/ResultsPage';
import SchedulingPage from './pages/SchedulingPage';
import DashboardPage from './pages/DashboardPage';

// Import CSS
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scrape" element={<ScrapePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results/:taskId" element={<ResultsPage />} />
        <Route path="/schedule" element={<SchedulingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Redirects for legacy URLs or typos */}
        <Route path="/schedules" element={<Navigate to="/schedule" replace />} />
        <Route path="/result" element={<Navigate to="/results" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        {/* 404 - redirect to home for now */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;