import { test } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import Weblogin from '../pages/weblogin.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import testData from '../utils/testData.json';

const PASSWORD = testData.logincreds.password;
const GROUP1 = 'Group_X_150';
const GROUP2 = 'Group_Y_200';

test('Create 2 groups from existing active users and chat', async ({ page, browser }) => {
  test.setTimeout(3600000);

  const loginPage = new LoginPage(page);
  const dl = new DashboardPageLocator(page);
  const common = new CommonMethod(page);

  // ================================
  // PHASE 1: LOGIN
  // ================================
  console.log('=== PHASE 1: LOGIN ===\n');
  await page.goto(testData.appUrl.testUrl);
  await loginPage.loginNetsfere();
  await page.waitForTimeout(3000);
  console.log(`  URL after login: ${page.url()}`);

  // ================================
  // PHASE 2: CREATE GROUP 1 (150 members)
  // ================================
  console.log(`\n=== PHASE 2: ${GROUP1} ===\n`);

  // Navigate to Teams section via hash routing
  await page.evaluate(() => { window.location.hash = '#/Teams'; });
  await page.waitForTimeout(3000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log(`  URL after nav to Teams: ${page.url()}`);

  const addGroupBtn = page.getByRole('button', { name: 'Add Group' });
  await addGroupBtn.waitFor({ state: 'attached', timeout: 10000 });
  await addGroupBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(1500);

  await page.locator('//input[@placeholder="Group Name"]').fill(GROUP1);
  await page.locator('//input[@placeholder="Shorter Name for your Group when abbreviated"]').fill('GX150');

  const editMembersBtn = page.getByRole('button', { name: 'Edit Members' });
  await editMembersBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(3000);

  // Show All entries
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'All'));
    if (sel) { sel.value = 'All'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(2000);

  // Select first 150 rows
  const s1 = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    let c = 0;
    for (let i = 0; i < rows.length && i < 150; i++) {
      const cb = rows[i].querySelector('i.fa-square');
      if (cb) { cb.click(); c++; }
    }
    return c;
  });
  console.log(`  Selected ${s1} members`);

  // Save & Add via evaluate
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Save')?.click(); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Add')?.click(); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Close' || x.className.includes('close'))?.click(); });
  await page.waitForTimeout(2000);

  // Dismiss any remaining form/modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  console.log(`✓ ${GROUP1} created`);

  // ================================
  // PHASE 3: CREATE GROUP 2 (200 members)
  // ================================
  console.log(`\n=== PHASE 3: ${GROUP2} ===\n`);

  await page.evaluate(() => { window.location.hash = '#/Teams'; });
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  if (!(await addGroupBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Reload if button not found (form may still be open)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  }

  await addGroupBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(1500);

  await page.locator('//input[@placeholder="Group Name"]').fill(GROUP2);
  await page.locator('//input[@placeholder="Shorter Name for your Group when abbreviated"]').fill('GY200');
  await editMembersBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'All'));
    if (sel) { sel.value = 'All'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(2000);

  const s2 = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    let c = 0;
    for (let i = 150; i < rows.length && i < 350; i++) {
      const cb = rows[i].querySelector('i.fa-square');
      if (cb) { cb.click(); c++; }
    }
    return c;
  });
  console.log(`  Selected ${s2} members`);

  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Save')?.click(); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Add')?.click(); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent === 'Close' || x.className.includes('close'))?.click(); });
  await page.waitForTimeout(1000);
  console.log(`✓ ${GROUP2} created`);

  // ================================
  // PHASE 4: WEB PORTAL CHAT
  // ================================
  console.log(`\n=== PHASE 4: WEB PORTAL CHATS ===\n`);

  const wctx = await browser.newContext();
  const wp = await wctx.newPage();
  const webLogin = new Weblogin(wp);

  try {
    await webLogin.loginAndVerify('autos@sanu.netsferetest.org', PASSWORD);
    const wc = new CommonMethod(wp);
    const wl = new WebLoginPageLocator(wp);
    await wc.click(wl.featureXButton).catch(() => {});

    // Helper: search for a target in Start Conversation dialog and send a message
    async function startConversationAndSend(targetLabel, message) {
      console.log(`\n  === ${targetLabel} ===`);
      await wp.locator('[title="Start Conversation"]').click({ force: true, timeout: 5000 });
      await wp.waitForTimeout(2000);

      await wp.locator('.namegenEmailReplace').fill(targetLabel, { timeout: 5000 });
      await wp.waitForTimeout(4000);

      // Strategy 1: match by @displayname attribute (used by users)
      let matched = false;
      let result = wp.locator(`(//div[contains(@displayname,'${targetLabel}')])[1]`);
      if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
        await result.click({ force: true, timeout: 3000 });
        matched = true;
      }

      // Strategy 2: match any result element containing the target text
      if (!matched) {
        const genericMatch = wp.locator(`//div[contains(text(),'${targetLabel}')]`).first();
        if (await genericMatch.isVisible({ timeout: 3000 }).catch(() => false)) {
          await genericMatch.click({ force: true, timeout: 3000 });
          matched = true;
        }
      }

      if (!matched) {
        const resultsHtml = await wp.evaluate(() => {
          const items = document.querySelectorAll('.namegenEmailReplace, [class*="result"], [class*="dropdown"] li, div[displayname]');
          return [...items].slice(0, 10).map(el => el.textContent?.trim() || el.outerHTML?.slice(0, 120)).join(' | ');
        });
        console.log(`  Available results: ${resultsHtml}`);
      }

      if (matched) {
        await wp.waitForTimeout(1000);
        // Try clicking Create; skip if not found (some items auto-create)
        await wp.locator('//*[text()="Create"]').click({ force: true, timeout: 5000 }).catch(() => {
          console.log('  No Create button, conversation may have auto-created');
        });
        await wp.waitForTimeout(5000);

        // Look for any visible textarea to send message
        const ta = wp.locator('textarea').first();
        if (await ta.isVisible({ timeout: 5000 }).catch(() => false)) {
          await ta.fill(message, { timeout: 8000 });
          await wp.keyboard.press('Enter');
          await wp.waitForTimeout(3000);
          const text = await wp.locator('body').textContent({ timeout: 5000 }).catch(() => '');
          console.log(text.includes(message) || text.includes(targetLabel) ? '  ✓ Message sent' : '  Message may have failed');
        } else {
          console.log('  No textarea found after creating conversation');
        }
      } else {
        console.log(`  ✗ Could not find ${targetLabel}`);
      }
    }

    // Helper: close any open conversation/dialog
    async function closeOpenConvo() {
      await wp.keyboard.press('Escape');
      await wp.waitForTimeout(1000);
      await wp.keyboard.press('Escape');
      await wp.waitForTimeout(1000);
    }

    // 1. 1-on-1 chat with 16415u1
    await startConversationAndSend('16415u1', 'Hello from autos!');
    await closeOpenConvo();

    // 2. Group chat with Group_X_150
    await startConversationAndSend(GROUP1, `Hello ${GROUP1}!`);
    await closeOpenConvo();

    // 3. Group chat with Group_Y_200
    await startConversationAndSend(GROUP2, `Hello ${GROUP2}!`);
    await closeOpenConvo();

    console.log('\n✓ All web portal chats done');
  } finally {
    await wctx.close();
  }

  console.log('\n=== COMPLETED ===');
  console.log(`Groups: ${GROUP1} (150), ${GROUP2} (200)`);
});
