// src/components/layout/Navbar.jsx
import React, { useState } from 'react';
import {Link, useNavigate} from 'react-router-dom';
import './Navbar.css'; 

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignUp = () =>{
    navigate('signup');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          WebScrapeX <span className="logo-highlight">Pro</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
        </div>

        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/scrape" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Scrape
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/results" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Results
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/schedule" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Schedule
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Dashboard
            </Link>
          </li>
        </ul>

        <div className="nav-auth">
          <button className="login-button" onClick={handleLogin}>Login</button>
          <button className="signup-button" onClick={handleSignUp}>Sign Up</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;