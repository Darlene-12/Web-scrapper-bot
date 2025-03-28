import React, { useState, useEffect } from 'react';

const LandingPage = ({ onNavigate }) => {
  const [botPosition, setBotPosition] = useState(-100);
  const [rotation, setRotation] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Animate bot rolling in
    const rollInterval = setInterval(() => {
      setBotPosition(prev => {
        if (prev >= 50) {
          clearInterval(rollInterval);
          setShowButton(true);
          return 50;
        }
        return prev + 2;
      });
      
      setRotation(prev => prev - 15);
    }, 30);
    
    return () => clearInterval(rollInterval);
  }, []);

  const handleStartClick = () => {
    setRedirecting(true);
    
    // Use the onNavigate prop to navigate to the scrape page after animation
    setTimeout(() => {
      onNavigate('scrape');
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 text-blue-400">
          Web Scraping Bot
        </h1>
        <h2 className="text-xl md:text-2xl text-center mb-12 text-blue-200">
          Extract Any Data From Anywhere
        </h2>
        
        {/* Bot container */}
        <div className="relative h-64 mb-8">
          {/* Bot character */}
          <div 
            className="absolute transition-all duration-300 transform"
            style={{ 
              left: `${botPosition}%`, 
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              opacity: redirecting ? 0 : 1
            }}
          >
            <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center relative">
              {/* Bot eyes */}
              <div className="absolute w-6 h-6 bg-white rounded-full top-6 left-6"></div>
              <div className="absolute w-6 h-6 bg-white rounded-full top-6 right-6"></div>
              
              {/* Bot mouth */}
              <div className="absolute w-16 h-3 bg-white rounded-full bottom-8"></div>
              
              {/* Bot antenna */}
              <div className="absolute w-2 h-10 bg-gray-300 -top-10 left-1/2 transform -translate-x-1/2">
                <div className="w-4 h-4 bg-red-500 rounded-full absolute -top-4 left-1/2 transform -translate-x-1/2"></div>
              </div>
              
              {/* Bot treads/wheels */}
              <div className="absolute w-40 h-8 bg-gray-700 rounded-full -bottom-4 -left-4"></div>
            </div>
          </div>
          
          {/* Ground shadow */}
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-4 bg-black rounded-full opacity-30"
            style={{ opacity: redirecting ? 0 : 0.3 }}
          ></div>
        </div>
        
        {/* Start button */}
        {showButton && !redirecting && (
          <div className="flex justify-center animate-bounce">
            <button
              onClick={handleStartClick}
              className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-4 px-8 rounded-full transform transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300"
            >
              Start Scraping
            </button>
          </div>
        )}
        
        {redirecting && (
          <div className="flex justify-center">
            <div className="w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Feature highlights */}
        <div className={`mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 transition-opacity duration-500 ${redirecting ? 'opacity-0' : 'opacity-100'}`}>
          <div className="bg-blue-800 bg-opacity-50 p-6 rounded-lg">
            <div className="text-blue-300 text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">Intelligent Extraction</h3>
            <p className="text-gray-300">Our bot automatically identifies and extracts the data you need from any website.</p>
          </div>
          
          <div className="bg-blue-800 bg-opacity-50 p-6 rounded-lg">
            <div className="text-blue-300 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
            <p className="text-gray-300">Process hundreds of pages in seconds with our optimized scraping algorithms.</p>
          </div>
          
          <div className="bg-blue-800 bg-opacity-50 p-6 rounded-lg">
            <div className="text-blue-300 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Data Transformation</h3>
            <p className="text-gray-300">Convert scraped data into CSV, JSON, or any format you need for analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;