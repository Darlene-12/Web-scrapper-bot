// src/components/common/RobotAnimation.jsx
import React, { useEffect, useRef } from 'react';
import './RobotAnimation.css';

const RobotAnimation = () => {
  const canvasRef = useRef(null);
  const robotRef = useRef({
    x: 0,
    y: 0,
    jumping: false,
    jumpHeight: 0,
    maxJumpHeight: 80,
    jumpSpeed: 3,
    falling: false,
    eyesBlink: false,
    blinkTimer: 0,
    armsUp: false,
    armsTimer: 0,
    dataLoading: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let robot = robotRef.current;

    // Set initial robot position
    robot.x = canvas.width / 2;
    robot.y = canvas.height - 100;

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 300;
      robot.x = canvas.width / 2;
      robot.y = canvas.height - 100;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw loading data text
      ctx.fillStyle = '#4285f4';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      const loadingText = 'Loading Data';
      const dots = '.'.repeat(Math.floor(robot.dataLoading / 20) % 4);
      ctx.fillText(`${loadingText}${dots}`, canvas.width / 2, 40);
      
      // Update robot jump animation
      if (robot.jumping) {
        if (!robot.falling) {
          robot.jumpHeight += robot.jumpSpeed;
          if (robot.jumpHeight >= robot.maxJumpHeight) {
            robot.falling = true;
          }
        } else {
          robot.jumpHeight -= robot.jumpSpeed;
          if (robot.jumpHeight <= 0) {
            robot.jumpHeight = 0;
            robot.jumping = false;
            robot.falling = false;
            
            // Start a new jump after a short pause
            setTimeout(() => {
              robot.jumping = true;
              robot.falling = false;
            }, 500 + Math.random() * 1000);
          }
        }
      } else if (Math.random() < 0.01) {
        // Randomly start jumping
        robot.jumping = true;
      }
      
      // Update blink animation
      robot.blinkTimer++;
      if (robot.blinkTimer > 120) {
        robot.eyesBlink = !robot.eyesBlink;
        if (robot.eyesBlink) {
          robot.blinkTimer = 0;
        } else {
          robot.blinkTimer = 100;
        }
      }
      
      // Update arms animation
      robot.armsTimer++;
      if (robot.armsTimer > 60) {
        robot.armsUp = !robot.armsUp;
        robot.armsTimer = 0;
      }
      
      // Update data loading animation
      robot.dataLoading = (robot.dataLoading + 1) % 100;
      
      // Draw robot
      drawRobot(
        ctx, 
        robot.x, 
        robot.y - robot.jumpHeight, 
        robot.eyesBlink, 
        robot.armsUp
      );
      
      // Draw data particles
      drawDataParticles(ctx, robot.x, robot.y - robot.jumpHeight, robot.dataLoading);
      
      animationFrameId = window.requestAnimationFrame(animate);
    };
    
    // Function to draw the robot
    const drawRobot = (ctx, x, y, blink, armsUp) => {
      // Body
      ctx.fillStyle = '#4285f4';
      ctx.fillRect(x - 30, y - 60, 60, 70);
      
      // Head
      ctx.fillStyle = '#5f6368';
      ctx.fillRect(x - 25, y - 90, 50, 40);
      
      // Eyes
      if (!blink) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 15, y - 80, 10, 12);
        ctx.fillRect(x + 5, y - 80, 10, 12);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 12, y - 76, 4, 4);
        ctx.fillRect(x + 8, y - 76, 4, 4);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 15, y - 74, 10, 2);
        ctx.fillRect(x + 5, y - 74, 10, 2);
      }
      
      // Mouth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 10, y - 60, 20, 5);
      
      // Arms
      ctx.fillStyle = '#5f6368';
      if (armsUp) {
        // Arms up
        ctx.fillRect(x - 40, y - 60, 10, 40);
        ctx.fillRect(x + 30, y - 60, 10, 40);
      } else {
        // Arms down
        ctx.fillRect(x - 40, y - 40, 10, 40);
        ctx.fillRect(x + 30, y - 40, 10, 40);
      }
      
      // Legs
      ctx.fillStyle = '#5f6368';
      ctx.fillRect(x - 20, y, 15, 30);
      ctx.fillRect(x + 5, y, 15, 30);
      
      // Antenna
      ctx.fillStyle = '#ea4335';
      ctx.fillRect(x - 5, y - 100, 10, 10);
      ctx.fillRect(x - 2, y - 110, 4, 10);
    };
    
    // Function to draw data particles
    const drawDataParticles = (ctx, x, y, loadingPhase) => {
      const particles = [];
      const phase = loadingPhase / 25;
      
      // Generate particle positions
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2 + phase;
        const distance = 50 + Math.sin(angle * 3) * 20;
        particles.push({
          x: x + Math.cos(angle) * distance,
          y: y - 40 + Math.sin(angle) * distance / 2,
          size: 3 + Math.random() * 5,
          color: getRandomColor()
        });
      }
      
      // Draw particles
      particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    
    // Helper function to get random colors
    const getRandomColor = () => {
      const colors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#5f6368'];
      return colors[Math.floor(Math.random() * colors.length)];
    };
    
    // Start animation
    robotRef.current.jumping = true;
    animate();
    
    // Cleanup
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="robot-animation-container">
      <canvas ref={canvasRef} className="robot-canvas" />
      <div className="animation-text">
        <h2>Smart Web Scraping</h2>
        <p>Extract data from any website with our intelligent robot</p>
      </div>
    </div>
  );
};

export default RobotAnimation;