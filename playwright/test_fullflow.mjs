import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Step 1: Login to admin
console.log('=== Step 1: Login to Admin ===');
await page.goto('https://admin.netsferetest.com/#/login', { waitUntil: 'load' });
await page.locator('//input[@type="email"]').fill('kul@sanu.netsferetest.org');
await page.locator('//button[@type="submit"]').click();
await page.waitForTimeout(1000);
await page.locator('//input[@type="password"]').fill('Abcd@1234567');
await page.locator('//button[@type="submit"]').click();
await page.waitForTimeout(3000);
console.log('URL after login:', page.url());

// Step 2: Navigate to Dashboard (simulating inter-activation nav)
console.log('\n=== Step 2: Navigate to Dashboard ===');
await page.goto('https://admin.netsferetest.com/#/Dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Nav error:', e.message));
await page.waitForTimeout(1000);
console.log('URL:', page.url());

// Step 3: Navigate to activation URL
console.log('\n=== Step 3: Navigate to Activation URL ===');
const activationUrl = 'https://web.netsferetest.com/?email=kul_20260615_1781524222167_0@sanu.netsferetest.org&activationCode=922299#/activate';
console.log('Going to:', activationUrl);
await page.goto(activationUrl, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);
console.log('URL after activation nav:', page.url());

// Check for password fields
const pwFields = await page.locator('input[type="password"]').count();
console.log('Password fields found:', pwFields);
if (pwFields > 0) {
  const val = await page.locator('input[type="password"]').first().inputValue();
  console.log('First password field value:', `"${val}"`);
} else {
  // Dump page content
  const text = await page.locator('body').textContent().catch(() => 'N/A');
  console.log('Body:', text.substring(0, 500).replace(/\s+/g, ' '));
}

// Step 4: Try to fill password and activate
if (pwFields > 0) {
  console.log('\n=== Step 4: Fill and Activate ===');
  await page.locator('input[type="password"]').first().fill('Abcd@1234567', { force: true });
  
  // Find second password field
  const allPw = await page.locator('input[type="password"]').all();
  if (allPw.length > 1) {
    await allPw[1].fill('Abcd@1234567', { force: true });
    console.log('Filled confirm password');
  } else {
    console.log('Only 1 password field found');
  }
  
  // Click terms checkbox (icon)
  const termsIcon = page.locator('span.icon.ion-android-checkbox-outline-blank');
  if (await termsIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
    await termsIcon.click();
    console.log('Clicked terms checkbox');
  }
  
  // Click Activate
  const activateBtn = page.getByRole('button', { name: /Activate|activate/ });
  await activateBtn.click({ timeout: 5000 });
  await page.waitForTimeout(2000);
  console.log('URL after activate:', page.url());
  const msg = await page.locator('text=/Success|Activated|activated successfully/i').isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Success message visible:', msg);
}

await browser.close();
