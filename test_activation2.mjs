import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const activationUrl = 'https://web.netsferetest.com/?email=kul_20260615_1781524222167_0@sanu.netsferetest.org&activationCode=922299#/activate';

console.log('1. Navigating to activation URL...');
await page.goto(activationUrl, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);
console.log('URL:', page.url());

// Check for all input fields
const allInputs = await page.locator('input').count();
console.log(`Total input fields: ${allInputs}`);
for (let i = 0; i < allInputs; i++) {
  const type = await page.locator('input').nth(i).getAttribute('type');
  const value = await page.locator('input').nth(i).inputValue();
  const placeholder = await page.locator('input').nth(i).getAttribute('placeholder');
  console.log(`  Input ${i}: type=${type}, placeholder=${placeholder}, value="${value}"`);
}

// Check for Continue button
const buttons = await page.locator('button').count();
console.log(`Total buttons: ${buttons}`);
for (let i = 0; i < buttons; i++) {
  const text = await page.locator('button').nth(i).textContent();
  console.log(`  Button ${i}: "${text?.trim()}"`);
}

// Check for checkbox
const checkboxes = await page.locator('input[type="checkbox"]').count();
console.log(`Checkboxes: ${checkboxes}`);

const termsLabels = await page.locator('text=Terms of Service').count();
console.log(`Terms of Service labels: ${termsLabels}`);

console.log('\nFull body text:');
const text = await page.locator('body').textContent();
console.log(text.replace(/\s+/g, ' ').trim());

await browser.close();
