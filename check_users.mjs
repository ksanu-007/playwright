import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://admin.netsferetest.com/#/login', { waitUntil: 'load' });
await page.locator('//input[@type="email"]').fill('kul@sanu.netsferetest.org');
await page.locator('//button[@type="submit"]').click();
await page.waitForTimeout(1000);
await page.locator('//input[@type="password"]').fill('Abcd@1234567');
await page.locator('//button[@type="submit"]').click();
await page.waitForTimeout(3000);

await page.goto('https://admin.netsferetest.com/#/Invited%20Users', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(3000);

const rows = await page.locator('tbody tr').count();
console.log('Invited user count:', rows);

if (rows > 0) {
  const href = await page.locator('tbody tr').first().locator('td').nth(4).locator('a').getAttribute('href');
  console.log('First link href:', href?.substring(0, 200));
  
  const body = href ? href.split('?')[1] : '';
  if (body) {
    const params = new URLSearchParams(body);
    const encodedBody = params.get('body');
    if (encodedBody) {
      const decoded = decodeURIComponent(encodedBody);
      console.log('Decoded URL:', decoded.substring(0, 200));
    }
  }
}

await browser.close();
