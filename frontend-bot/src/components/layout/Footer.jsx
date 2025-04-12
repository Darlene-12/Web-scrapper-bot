import React from 'react';
import {Link} from 'react-router-dom';
import './Footer.css'; 

const Footer = () =>{
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>WebScrapeX Pro</h3>
          <p>
            A powerful yet multipurpose web scraping solution
            for extracting data from any website or PDF document.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/scrape">Start Scraping</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Resources</h4>
          <ul className="footer-links">
            <li>
              <Link to="/docs">Documentation</Link>
            </li>
            <li>
              <Link to="/api">API</Link>
            </li>
            <li>
              <Link to="/support">Support</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <p>
            <i className="fas fa-envelope"></i> support@webscrapepro.com
          </p>
          <div className="social-icons">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-github"></i>
            </a>
            <a href="https://github.com/Darlene-12/Web-scrapper-bot/tree/main" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-github"></i>
            </a>
            <a href="https://www.linkedin.com/in/darlene-wendy-638065254/" target="_blank" rel="noopener noreferrer"> 
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WebScrapeX Pro.  All Rights Reserved</p>
        <div className="footer-bottom-links">
          <Link to="/privacy"> Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


