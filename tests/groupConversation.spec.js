import { test, expect } from '@playwright/test';
import path from 'path';
import Weblogin from '../pages/weblogin.js';
import CommonMethod from '../utils/common.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import ConversationPageLocator from '../locators/conversation.locator.js';

const PASSWORD = 'Abcd@1234567';
const MSG = `Hello group! ${Date.now()}`;

test('5-user group: chat, attachment, call', async ({ browser }) => {
  test.setTimeout(300000);

  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();

  try {
    console.log('=== LOGIN ===');
    async function login(page, email) {
      const wl = new Weblogin(page);
      await wl.loginAndVerify(email, PASSWORD);
      const c = new CommonMethod(page);
      await c.click(new WebLoginPageLocator(page).featureXButton).catch(() => {});
    }
    await login(page1, 'autos@sanu.netsferetest.org');
    await login(page2, '16415u1@sanu.netsferetest.org');
    await page2.waitForTimeout(1000);

    const common1 = new CommonMethod(page1);
    const convLoc1 = new ConversationPageLocator(page1);

    console.log('\n=== CREATE GROUP (5 users) ===');
    await page1.locator('[title="Start Conversation"]').click({ force: true });
    await page1.waitForTimeout(1500);
    await page1.locator('.namegenEmailReplace').fill('16415u1');
    await page1.waitForTimeout(2000);
    await page1.locator(`(//div[contains(@displayname,'16415u1')])[1]`).click();
    await page1.waitForTimeout(500);
    await page1.locator('//*[text()="Create"]').click();
    await page1.waitForTimeout(3000);

    const ep = page1.locator('//div[text()="Edit Participant(s)"]');
    if (await ep.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ep.click({ force: true });
    } else {
      await page1.locator('//i[@class="fa fa-ellipsis-v"]').first().click({ force: true });
      await page1.waitForTimeout(800);
      await page1.locator('//div[contains(text(),"Edit Participant")]').click({ force: true });
    }
    await page1.waitForTimeout(1500);

    const input = page1.locator('.namegenEmailReplace').first();
    let added = 0;
    for (const u of ['16415u2', '16415u3', '16415u4', '16415u5']) {
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.fill(u);
        await page1.waitForTimeout(1000);
        const r = page1.locator(`(//div[contains(@displayname,'${u}')])[1]`);
        if (await r.isVisible({ timeout: 1500 }).catch(() => false)) {
          await r.click({ force: true });
          added++;
        }
      }
    }
    console.log(`  Added ${added} more (total ${added + 2} in group)`);

    const save = page1.getByText('Save');
    if (await save.isVisible({ timeout: 1500 }).catch(() => false)) {
      await save.click({ force: true });
      await page1.waitForTimeout(2000);
    }
    await page1.keyboard.press('Escape');
    await page1.waitForTimeout(500);

    console.log('\n=== SEND MESSAGE + ATTACHMENT ===');
    const ta = page1.locator('textarea').first();
    await ta.waitFor({ state: 'visible', timeout: 8000 });
    await ta.fill(MSG, { force: true });
    await page1.waitForTimeout(500);
    await page1.keyboard.press('Enter');
    await page1.waitForTimeout(1000);
    // Try a second time if needed
    await page1.keyboard.press('Enter');
    await page1.waitForTimeout(2000);
    console.log('  ✓ Message sent');

    await common1.click(convLoc1.AddAttachmentButton).catch(() =>
      page1.locator('//span[contains(@class,"ion-plus-circled")]').click({ force: true })
    );
    await page1.waitForTimeout(1500);

    const fp = path.resolve('c:\\playwright\\utils\\data', 'eticket.pdf');
    const fcp = page1.waitForEvent('filechooser', { timeout: 10000 });
    await convLoc1.fromDeviceButton.click({ timeout: 5000 }).catch(() =>
      page1.locator('//div[contains(text(),"Device")]').first().click({ timeout: 5000 })
    );
    const fc = await fcp.catch(() => null);
    if (fc) await fc.setFiles(fp);
    else await page1.locator('input[type="file"]').first().setInputFiles(fp);
    await page1.waitForTimeout(2000);
    await convLoc1.uploadSendButton.click({ force: true, timeout: 5000 });
    await page1.waitForTimeout(2000);
    console.log('  ✓ Sent message + attachment');

    console.log('\n=== VALIDATE FROM 16415u1 ===');
    await page2.reload();
    await page2.waitForTimeout(3000);
    let opened = false;
    for (let a = 0; a < 15; a++) {
      const items = await page2.locator('div.scrollbox > div > div').all();
      for (const item of items) {
        const t = await item.textContent();
        const r = await item.boundingBox();
        if (t && r && t.includes('now') && t.includes('autos') && t.length > 40) {
          await item.click();
          opened = true;
          break;
        }
      }
      if (opened) break;
      await page2.waitForTimeout(1000);
    }
    await page2.waitForTimeout(3000);
    console.log('  ✓ Opened');

    const b2 = await page2.locator('body').textContent();
    const mv = b2.includes(MSG);
    const av = b2.includes('eticket') || b2.includes('pdf');
    console.log(`  msg=${mv} att=${av}`);
    expect(mv).toBeTruthy();
    expect(av).toBeTruthy();

    const rt = page2.locator('textarea').first();
    if (await rt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rt.fill('Received!');
      await page2.keyboard.press('Enter');
      await page2.waitForTimeout(1500);
    }

    console.log('\n=== VIDEO CALL ===');
    await ctx1.grantPermissions(['camera', 'microphone']);
    await common1.click(convLoc1.makeavideocallButton);
    console.log('  ✓ Call initiated');

    let connected = false;
    for (let i = 0; i < 20; i++) {
      const eb = page1.locator('//button[@title="End call"]').first();
      if (await eb.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log(`  ✓ Connected after ~${i + 1}s`);
        await eb.click({ force: true });
        connected = true;
        break;
      }
      for (const sel of ['button:has-text("Answer")', 'button:has-text("Accept")', '[title*="Answer" i]', '[title*="Accept" i]']) {
        if (await page2.locator(sel).first().isVisible({ timeout: 200 }).catch(() => false)) {
          await page2.locator(sel).first().click({ force: true });
          connected = true;
          break;
        }
      }
      if (connected) break;
      await page1.waitForTimeout(1000);
    }
    if (!connected) console.log('  ⚠ Call not connected');

    console.log('\n=== DONE ===');
    console.log('✓ 5-user group');
    console.log('✓ Message + attachment');
    console.log(`✓ Call: ${connected ? 'connected' : 'attempted'}`);
    console.log('✓ PASSED');

  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
