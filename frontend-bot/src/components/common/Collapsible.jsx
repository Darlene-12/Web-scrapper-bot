// src/components/common/Collapsible.jsx
import React, { useState, useRef, useEffect } from 'react';
import './Collapsible.css';

const Collapsible = ({ title, children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [height, setHeight] = useState(initiallyOpen ? 'auto' : '0px');
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(`${contentHeight}px`);
      // After transition is complete, set height to auto to handle content changes
      setTimeout(() => {
        setHeight('auto');
      }, 300);
    } else {
      // First set a fixed height to enable transition
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(`${contentHeight}px`);
      // Trigger reflow
      contentRef.current.offsetHeight;
      // Then animate to 0
      setTimeout(() => {
        setHeight('0px');
      }, 10);
    }
  }, [isOpen]);

  const toggleCollapsible = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible">
      <div 
        className={`collapsible-header ${isOpen ? 'open' : ''}`} 
        onClick={toggleCollapsible}
      >
        <h3>{title}</h3>
        <span className="collapsible-icon">{isOpen ? '▲' : '▼'}</span>
      </div>
      <div 
        ref={contentRef}
        className="collapsible-content"
        style={{ height }}
      >
        <div className="collapsible-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;