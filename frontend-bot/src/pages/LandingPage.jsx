// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import RobotAnimation from '../components/common/RobotAnimation';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      
      <main className="landing-content">
        <section className="hero-section">
          <div className="container">
            <div className="hero-content">
              <h1>Powerful Web Scraping Solution</h1>
              <p>Extract, process, and analyze data from any website or PDF with our intelligent scraping tools</p>
              <div className="hero-buttons">
                <Link to="/scrape" className="primary-button">Start Scraping</Link>
                <Link to="/dashboard" className="secondary-button">View Dashboard</Link>
              </div>
            </div>
            
            <div className="hero-animation">
              <RobotAnimation />
            </div>
          </div>
        </section>
        
        <section className="features-section">
          <div className="container">
            <h2>Advanced Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon web-icon"></div>
                <h3>Multi-site Scraping</h3>
                <p>Scrape data from multiple websites simultaneously using powerful selectors and automation</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon pdf-icon"></div>
                <h3>PDF Processing</h3>
                <p>Extract text, tables, and data from PDF documents with advanced OCR technology</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon schedule-icon"></div>
                <h3>Scheduled Scraping</h3>
                <p>Set up recurring scraping tasks and get notifications when new data is available</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon proxy-icon"></div>
                <h3>Smart Proxy Usage</h3>
                <p>Rotate IP addresses and use proxy servers to avoid rate limiting and blocking</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="how-it-works">
          <div className="container">
            <h2>How It Works</h2>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Enter URL</h3>
                <p>Provide the website URL or upload PDF files that contain the data you want to extract</p>
              </div>
              
              <div className="step">
                <div className="step-number">2</div>
                <h3>Configure Scraper</h3>
                <p>Select data types, choose scraping method (Selenium or BeautifulSoup), and set options</p>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <h3>Process Results</h3>
                <p>Clean, transform, and analyze the extracted data with our processing tools</p>
              </div>
              
              <div className="step">
                <div className="step-number">4</div>
                <h3>Export & Schedule</h3>
                <p>Download data in multiple formats or set up scheduled scraping tasks</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="cta-section">
          <div className="container">
            <h2>Ready to Extract Valuable Data?</h2>
            <p>Start using our powerful scraping tools and unlock insights from websites and documents</p>
            <Link to="/scrape" className="primary-button large">Get Started Now</Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;