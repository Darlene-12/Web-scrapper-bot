import React, {useEffect, useRef} from 'react';
import './RobotAnimation.css';


const RobotAnimation = () => {
  const canvasRef = useRef(null);
  const robotRef = useRef ({
    x:0,
    y:0,
    jumping: false,
    jumpHeight: 0,
    jumpSpeed: 3,
    falling: false,
    eyesBlink: false,
    blinkTimer: 0,
    armsUp: false,
    armsTimer: 0,
    dataLoading: 0
  });


  useEffect (() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext ('2d'); // Get the 2D  drawing context...paintbrush
    let animationFrameId; // This will store the animation loop identifier
    let robot = robotRef.current; // Access the robot object we created. 

    // set the initial robot position
    robot.x = canvas.width /2; // setting it in the center horizontally just above the center of the canvas vertically.
    robot.y = canvas.height -100;

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.ParentElement.clientWidth;
      canvas.height = 300;
      robot.x = canvas.width /2;
      robot.y = canvas.height - 100;
    };

    window.addEventListener ('resize', handleResize);
    handleResize ();

    // Animation function
    const animate = () =>{
      ctx.clearRect(0,0, canvas.width, canvas.height);

      // Draw loading data text
      ctx.fillStyle = '#4285f4';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';

      const LoadingText = 'Loading Data';
      const dots = '.'.repeat(Math.floor(robot.dataLoading / 20) % 4);
      ctx.fillText(`${loadingText}${dots}`, canvas.width /2 , 40)

      // Update the robot jump animation
      if (robot.jumping) {
        if(!robot.falling) {
          robot.jumpHeight += robot.jumpSpeed;
          if (robot.jumpHeight >= robot.maxjumpHeight){
            robot.falling = true;
          }
        }else {
          robot.jumpHeight -= robot.jumpSpeed;
          if (robot.jumpHeight <= 0) {
            robot.jumpHeight = 0;
            robot.jumping = false;
            robot.falling = false;

            // start a new jump after a short pause

            setTimeout (() => {
              robot.jumping = true;
              robot.falling = false;
            }, 500 + Math.random() * 1000);
          }
        }
      }else if (Math.random () < 0.01) {
        //Randomly starting to jump

        robot.jumping = true;
      }

      //Update the blink animation
      robot.blinkTimer++;
      if (robot.armsTimer > 60){
        robot.armsUp = !robot.armsUp;
        robot.armsTimer = 0;
      } else {
        robot.blinkTimer = 100;
      }
    }
    //Update arms animation
    robot.dataLoading++;
    if (robot.armsTimer > 60) {
      robot.armsUp = !robot.armsUp;
      robot.armsTimer = 0;
    }

    // update data loading animation
    robot.dataLoading = (robot.dataLoading + 1) % 100
    
};
export default RobotAnimation;





