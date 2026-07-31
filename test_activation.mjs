import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const activationUrl = 'https://web.netsferetest.com/?email=kul_20260615_1781524222167_0@sanu.netsferetest.org&activationCode=922299#activate';

console.log('Navigating to:', activationUrl);
await page.goto(activationUrl, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);

console.log('Current URL:', page.url());

const pwFields = await page.locator('input[type="password"]').count();
console.log('Password fields found:', pwFields);

const bodyText = await page.locator('body').textContent().catch(() => 'N/A');
console.log('Body (first 500 chars):', bodyText.substring(0, 500).replace(/\s+/g, ' '));

await browser.close();
