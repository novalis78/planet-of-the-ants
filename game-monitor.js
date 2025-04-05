const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Helper to get timestamped filename
const getTimestampedFilename = (prefix) => {
  const now = new Date();
  return `${prefix}_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}.png`;
};

// Helper to take screenshot with descriptive name
const takeScreenshot = async (page, description) => {
  const filename = getTimestampedFilename(description.replace(/\s+/g, '_').toLowerCase());
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot saved: ${filename}`);
  return filepath;
};

// Game monitoring class
class GameMonitor {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async start() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    
    await this.page.goto('http://localhost:8080', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    console.log('Game monitor started - viewing game at: http://localhost:8080');
    return this;
  }

  async captureCurrentState() {
    // Take screenshot of current state
    return await takeScreenshot(this.page, 'current_state');
  }

  async switchView() {
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(500); // Wait for view to change
    const viewType = await this.page.evaluate(() => {
      // Access current view from game state
      // This assumes your game stores currentView in global scope
      // You may need to adjust this based on your actual implementation
      return window.currentView || 'unknown';
    });
    await takeScreenshot(this.page, `view_${viewType}`);
    return viewType;
  }

  async placeQueen() {
    await this.page.mouse.click(640, 360); // Click center of screen
    await this.page.waitForTimeout(500);
    return await takeScreenshot(this.page, 'queen_placed');
  }

  async digUnderground(positions) {
    // Switch to underground view if not already there
    const viewType = await this.page.evaluate(() => window.currentView || 'unknown');
    if (viewType !== 'underground') {
      await this.switchView();
    }
    
    // Click on each position to dig
    for (const [x, y] of positions) {
      await this.page.mouse.click(x, y);
      await this.page.waitForTimeout(200);
    }
    
    return await takeScreenshot(this.page, 'after_digging');
  }

  async moveQueen(directions) {
    // Switch to underground view if not already there
    const viewType = await this.page.evaluate(() => window.currentView || 'unknown');
    if (viewType !== 'underground') {
      await this.switchView();
    }
    
    // Press arrow keys to move queen
    for (const direction of directions) {
      switch (direction) {
        case 'up':
          await this.page.keyboard.press('ArrowUp');
          break;
        case 'down':
          await this.page.keyboard.press('ArrowDown');
          break;
        case 'left':
          await this.page.keyboard.press('ArrowLeft');
          break;
        case 'right':
          await this.page.keyboard.press('ArrowRight');
          break;
      }
      await this.page.waitForTimeout(300);
    }
    
    return await takeScreenshot(this.page, 'queen_moved');
  }

  async recordTimelapseOfEggHatching(durationSeconds = 15) {
    // Switch to underground view if not already there
    const viewType = await this.page.evaluate(() => window.currentView || 'unknown');
    if (viewType !== 'underground') {
      await this.switchView();
    }
    
    console.log(`Recording egg hatching timelapse for ${durationSeconds} seconds...`);
    
    // Take a screenshot every second
    const startTime = Date.now();
    let count = 0;
    
    while ((Date.now() - startTime) < durationSeconds * 1000) {
      await takeScreenshot(this.page, `egg_timelapse_${count}`);
      count++;
      await this.page.waitForTimeout(1000);
    }
    
    console.log(`Timelapse completed with ${count} frames`);
    return count;
  }

  // Use game's JavaScript to extract data
  async getGameState() {
    return await this.page.evaluate(() => {
      // Access data from the game
      // This assumes your game variables are in global scope
      // Adjust as needed based on your actual implementation
      return {
        currentView: window.currentView || 'unknown',
        queenPosition: window.queenMesh ? {
          x: window.queenMesh.position.x,
          y: window.queenMesh.position.y,
          z: window.queenMesh.position.z
        } : null,
        eggCount: window.eggs ? window.eggs.length : 0,
        // Add any other state you want to extract
      };
    });
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      console.log('Game monitor stopped');
    }
  }
}

// Example usage
(async () => {
  const monitor = new GameMonitor();
  
  try {
    await monitor.start();
    
    // Demo sequence
    await monitor.captureCurrentState();
    await monitor.placeQueen();
    await monitor.switchView(); // To underground
    
    // Dig some holes in a pattern (coordinates will depend on your game's scale)
    await monitor.digUnderground([
      [640, 360], // Center
      [680, 360], // Right
      [720, 360], // Further right
      [680, 400], // Down-right
    ]);
    
    // Move queen around
    await monitor.moveQueen(['right', 'right', 'down']);
    
    // Wait for eggs to appear and hatch
    console.log('Waiting for eggs to appear and hatch...');
    const frameCount = await monitor.recordTimelapseOfEggHatching(20);
    console.log(`Recorded ${frameCount} frames of egg lifecycle`);
    
    // Get game state
    const gameState = await monitor.getGameState();
    console.log('Current game state:', gameState);
    
  } catch (error) {
    console.error('Error during monitoring:', error);
  } finally {
    await monitor.stop();
  }
})();