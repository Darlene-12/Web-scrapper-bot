import React, {useState, useEffect, useRef} from 'react';

// UseState to track if the collapsible is open or closed
// useEffect to state the changes and do animations
// useRef to access real HTML elememnt to measure its height


import './Collapsible.css';

const Collapsible = ({title, children, initiallyOpen = false}) => {

  // title is the header text, children is the conten that is inside the collapsible while initiallyOpen with the default optional prop
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [height, setHeight] = useState(initiallyOpen ? 'auto': '0px');
  const contentRef = useRef(null);

  // isOpen: The lock — is the drawer open?
  // height: The drawer space — how much space should it take?
  // contentRef: The measuring tape — to know how big the drawer needs to be.



  useEffect (() => {
    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight; //Measures the height of the hidden content
      setHeight(`${contentHeight}px`);

      setTimeout (() => {
        setHeight('auto'); // setting this to auto allows the collapsible to grow or shrink if the content changes later
      }, 300);
    } else {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(`${contentHeight}px`);

      contentRef.current.offsetHeight;

      setTimeout (() => {
        setHeight('0px');
      }, 10);
    }
  }, [isOpen]);

  const toggleCollapsible = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className= "collapsible">
      <div className={`collapsible-header ${isOpen ? 'open': ''}`}
      onClick={toggleCollapsible}
      >
        <h3>{title}</h3>
        <span className="collapsible-icon">{isOpen ? '▲':'▲'}</span>
      </div>
      <div
        ref={contentRef}
        className="collapsible-content"
        style={{height}}
      >
        <div className="collapsible-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;