// src/components/scraper/ProxySettings.jsx
import React from 'react';
import './ProxySettings.css';

const ProxySettings = ({ settings, onChange }) => {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : 
                    type === 'number' ? Number(value) : value;
    
    onChange({
      ...settings,
      [name]: newValue
    });
  };

  return (
    <div className="proxy-settings">
      <div className="form-check main-toggle">
        <input
          type="checkbox"
          id="useProxy"
          name="useProxy"
          checked={settings.useProxy}
          onChange={handleInputChange}
          className="form-check-input"
        />
        <label htmlFor="useProxy" className="form-check-label">
          Use Proxy Server
        </label>
      </div>
      
      {settings.useProxy && (
        <div className="proxy-config">
          <div className="form-group">
            <label htmlFor="proxyUrl">Proxy URL</label>
            <input
              type="text"
              id="proxyUrl"
              name="proxyUrl"
              value={settings.proxyUrl}
              onChange={handleInputChange}
              placeholder="http://proxy.example.com:8080"
              className="form-control"
            />
            <small className="form-text">Enter proxy server address with port</small>
          </div>
          
          <div className="form-check auth-toggle">
            <input
              type="checkbox"
              id="requiresAuth"
              name="requiresAuth"
              checked={settings.requiresAuth}
              onChange={handleInputChange}
              className="form-check-input"
            />
            <label htmlFor="requiresAuth" className="form-check-label">
              Requires Authentication
            </label>
          </div>
          
          {settings.requiresAuth && (
            <div className="auth-fields">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={settings.username}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={settings.password}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
            </div>
          )}
          
          <div className="form-check rotation-toggle">
            <input
              type="checkbox"
              id="rotateIp"
              name="rotateIp"
              checked={settings.rotateIp}
              onChange={handleInputChange}
              className="form-check-input"
            />
            <label htmlFor="rotateIp" className="form-check-label">
              Rotate IP Addresses
            </label>
          </div>
          
          {settings.rotateIp && (
            <div className="form-group">
              <label htmlFor="rotationInterval">Rotation Interval (minutes)</label>
              <input
                type="number"
                id="rotationInterval"
                name="rotationInterval"
                value={settings.rotationInterval}
                onChange={handleInputChange}
                min="1"
                className="form-control"
              />
              <small className="form-text">How often to change IP addresses</small>
            </div>
          )}
          
          <div className="proxy-info">
            <p>
              <strong>Note:</strong> Using proxies helps avoid IP blocks and rate limiting when scraping websites.
              Ensure you have permission to use the proxy servers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxySettings;