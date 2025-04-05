const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Get timestamp for unique filenames
const getTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
};

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
  });
  
  // Create a new page
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // Go to your game page
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded successfully');
    
    // Take initial screenshot (surface view)
    const timestamp = getTimestamp();
    await page.screenshot({ 
      path: path.join(screenshotsDir, `surface_${timestamp}.png`),
      fullPage: true 
    });
    console.log(`Surface view screenshot saved: surface_${timestamp}.png`);
    
    // Press Tab to switch to underground view
    await page.keyboard.press('Tab');
    
    // Wait for the view to fully change
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take underground view screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, `underground_${timestamp}.png`),
      fullPage: true 
    });
    console.log(`Underground view screenshot saved: underground_${timestamp}.png`);

    // Optional: Place queen by clicking on ground (if not already placed)
    try {
      await page.mouse.click(640, 360); // Click center of screen
      console.log('Placed queen (or attempted to)');
      
      // Wait a moment for the queen to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take another screenshot after placing queen
      await page.screenshot({ 
        path: path.join(screenshotsDir, `queen_placed_${timestamp}.png`),
        fullPage: true 
      });
      console.log(`Queen placement screenshot saved: queen_placed_${timestamp}.png`);
    } catch (err) {
      console.log('Queen already placed or unable to place queen');
    }
    
  } catch (error) {
    console.error('Error during screenshot process:', error);
  } finally {
    // Close browser
    await browser.close();
    console.log('Browser closed');
    
    // Signal completion
    console.log('Screenshots completed successfully');
  }
})();