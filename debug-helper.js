/**
 * Game Debug Helper Injection
 * 
 * This file contains code that can be injected into your game
 * to expose debugging tools and object information.
 * 
 * To use:
 * 1. Start your game with the http-server
 * 2. Run `node debug-helper.js`
 * 3. This will inject debugging tools into the running game
 */

const puppeteer = require('puppeteer');

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Use visible browser for this
    args: ['--window-size=1280,720']
  });
  
  // Create a new page
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // Go to game page
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    console.log('Game loaded successfully');
    
    // Inject debugging tools
    await page.evaluate(() => {
      // Create debug UI
      const debugUI = document.createElement('div');
      debugUI.style.position = 'fixed';
      debugUI.style.top = '10px';
      debugUI.style.right = '10px';
      debugUI.style.background = 'rgba(0, 0, 0, 0.7)';
      debugUI.style.color = 'white';
      debugUI.style.padding = '10px';
      debugUI.style.borderRadius = '5px';
      debugUI.style.fontFamily = 'monospace';
      debugUI.style.fontSize = '12px';
      debugUI.style.zIndex = '1000';
      debugUI.style.maxHeight = '80vh';
      debugUI.style.overflowY = 'auto';
      debugUI.style.maxWidth = '300px';
      
      // Toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.innerText = 'Toggle Debug Panel';
      toggleBtn.style.position = 'fixed';
      toggleBtn.style.top = '10px';
      toggleBtn.style.right = '10px';
      toggleBtn.style.zIndex = '1001';
      
      // Info panel (initially hidden)
      const infoPanel = document.createElement('div');
      infoPanel.style.display = 'none';
      debugUI.appendChild(infoPanel);
      
      // Add button to take screenshot
      const ssBtn = document.createElement('button');
      ssBtn.innerText = 'Take Screenshot';
      ssBtn.style.display = 'block';
      ssBtn.style.marginTop = '10px';
      ssBtn.style.marginBottom = '10px';
      debugUI.appendChild(ssBtn);
      
      // Function to update info panel
      const updateInfo = () => {
        let info = '';
        
        // General game info
        info += '<h3>Game Info</h3>';
        info += `Current View: ${currentView || 'unknown'}<br>`;
        
        // Camera info
        info += '<h3>Camera</h3>';
        if (activeCamera) {
          info += `Position: (${activeCamera.position.x.toFixed(2)}, ${activeCamera.position.y.toFixed(2)}, ${activeCamera.position.z.toFixed(2)})<br>`;
        }
        
        // Queen info
        info += '<h3>Queen</h3>';
        if (queenMesh) {
          info += `Position: (${queenMesh.position.x.toFixed(2)}, ${queenMesh.position.y.toFixed(2)}, ${queenMesh.position.z.toFixed(2)})<br>`;
          info += `Grid Position: [${queenGridX}, ${queenGridY}]<br>`;
          info += `Visible: ${queenMesh.visible}<br>`;
        } else {
          info += 'Not placed yet<br>';
        }
        
        // Eggs info
        info += '<h3>Eggs</h3>';
        info += `Count: ${eggs ? eggs.length : 0}<br>`;
        if (eggs && eggs.length > 0) {
          info += '<details><summary>Egg Details</summary>';
          eggs.forEach((egg, i) => {
            info += `<br>Egg ${i}: Timer: ${egg.hatchTimer.toFixed(1)}s<br>`;
            if (egg.mesh) {
              info += `Position: (${egg.mesh.position.x.toFixed(2)}, ${egg.mesh.position.y.toFixed(2)}, ${egg.mesh.position.z.toFixed(2)})<br>`;
            }
          });
          info += '</details>';
        }
        
        // Voxel grid info
        info += '<h3>Underground</h3>';
        info += `Grid size: ${undergroundWidth}x${undergroundHeight}<br>`;
        
        infoPanel.innerHTML = info;
      };
      
      // Toggle visibility
      toggleBtn.addEventListener('click', () => {
        if (infoPanel.style.display === 'none') {
          infoPanel.style.display = 'block';
        } else {
          infoPanel.style.display = 'none';
        }
      });
      
      // Screenshot functionality
      ssBtn.addEventListener('click', () => {
        // Create a canvas from the WebGL context
        const canvas = renderer.domElement;
        
        // Convert to image data and open in new tab
        const dataURL = canvas.toDataURL('image/png');
        const w = window.open('about:blank', 'Screenshot');
        w.document.write(`<img src="${dataURL}" alt="Screenshot" style="max-width: 100%;" />`);
        w.document.title = `Screenshot - ${new Date().toISOString()}`;
      });
      
      // Add to DOM
      document.body.appendChild(debugUI);
      document.body.appendChild(toggleBtn);
      
      // Set up update interval
      setInterval(updateInfo, 500);
      
      // Expose helper functions to console
      window.debug = {
        // Helper to find an object's coordinates
        positionOf: (obj) => {
          if (!obj) return 'Object not found';
          if (obj.position) {
            return {
              x: obj.position.x,
              y: obj.position.y,
              z: obj.position.z
            };
          }
          return 'No position property found';
        },
        
        // Dump game state to console
        dumpState: () => {
          console.log('=== GAME STATE DUMP ===');
          console.log('Current View:', currentView);
          console.log('Queen:', queenMesh ? {
            position: {
              x: queenMesh.position.x,
              y: queenMesh.position.y,
              z: queenMesh.position.z
            },
            gridPosition: [queenGridX, queenGridY],
            visible: queenMesh.visible
          } : 'Not placed');
          console.log('Eggs:', eggs ? eggs.length : 0);
          console.log('Underground Grid:', `${undergroundWidth}x${undergroundHeight}`);
          return 'State dumped to console';
        },
        
        // Toggle wireframe mode for better visualization
        toggleWireframe: () => {
          scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                  mat.wireframe = !mat.wireframe;
                });
              } else {
                obj.material.wireframe = !obj.material.wireframe;
              }
            }
          });
          return 'Wireframe toggled';
        }
      };
      
      console.log('Debug tools injected. Use window.debug to access helper functions.');
    });
    
    console.log('\nDebug helper injected into game.');
    console.log('\nAvailable in browser console:');
    console.log('- window.debug.positionOf(object) - Get position of any object');
    console.log('- window.debug.dumpState() - Print game state to console');
    console.log('- window.debug.toggleWireframe() - Toggle wireframe rendering');
    
    // Keep browser open for debugging
    console.log('\nPress Ctrl+C to close the debug session');
    
  } catch (error) {
    console.error('Error during debug session:', error);
    await browser.close();
  }
})();