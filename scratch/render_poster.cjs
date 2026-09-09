const { chromium } = require('playwright');
const path = require('path');

async function renderPoster() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 900, height: 1300 },
    deviceScaleFactor: 2
  });
  
  const filePath = 'file:///' + path.resolve(__dirname, 'cartel_guardias_reyes_catolicos.html').replace(/\\/g, '/');
  console.log('Loading:', filePath);
  await page.goto(filePath, { waitUntil: 'networkidle' });
  
  const posterElement = await page.$('#poster');
  const targetPath = 'C:/Users/esalb/.gemini/antigravity-ide/brain/9c3f3316-4c45-429e-8671-66d42b596449/infografia_guardias_reyes_catolicos_hd.png';
  
  if (posterElement) {
    await posterElement.screenshot({ path: targetPath });
    console.log('✔ Screenshot poster saved at:', targetPath);
  } else {
    await page.screenshot({ path: targetPath, fullPage: true });
    console.log('✔ Fullpage screenshot saved at:', targetPath);
  }
  
  await browser.close();
}

renderPoster();
