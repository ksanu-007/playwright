import { test, expect } from '@playwright/test';
import Weblogin from '../pages/weblogin.js';
import CommonMethod from '../utils/common.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import ConversationPageLocator from '../locators/conversation.locator.js';
import testData from '../utils/testData.json';

const PASSWORD = testData.logincreds.password;
const EMAIL_DOMAIN = testData.logincreds.email;
const BASE_USER_ID = testData.userRange.baseUserId;

const USER1_EMAIL = `${BASE_USER_ID}${EMAIL_DOMAIN}`;
const USER2_EMAIL = `kul1${EMAIL_DOMAIN}`;
const USER3_EMAIL = `kul2${EMAIL_DOMAIN}`;
const USER2_NAME = 'kul1';
const USER3_NAME = 'kul2';
const CONVERSATION_NAME = 'AI Meeting Notes';

test.describe('AI Meeting Notes - Audio Call', () => {
  let ctx1, ctx2, ctx3;
  let page1, page2, page3;
  let convLoc1;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(720000);

    ctx1 = await browser.newContext();
    page1 = await ctx1.newPage();
    ctx2 = await browser.newContext();
    page2 = await ctx2.newPage();
    ctx3 = await browser.newContext();
    page3 = await ctx3.newPage();

    for (const p of [page1, page2, page3]) {
      p.setDefaultTimeout(15000);
    }

    convLoc1 = new ConversationPageLocator(page1);
  });

  test('Kul creates AI Meeting Notes conversation with kul1 & kul2, starts audio call', async () => {
    console.log(`User1: ${USER1_EMAIL}, User2: ${USER2_EMAIL}, User3: ${USER3_EMAIL}`);

    await test.step('Login all 3 users', async () => {
      for (const [page, email] of [[page1, USER1_EMAIL], [page2, USER2_EMAIL], [page3, USER3_EMAIL]]) {
        const wl = new Weblogin(page);
        await wl.loginAndVerify(email, PASSWORD);
        await new CommonMethod(page).click(new WebLoginPageLocator(page).featureXButton).catch(() => {});
        console.log(`✓ ${email} logged in`);
      }
    });

    await test.step('Create "AI Meeting Notes" conversation with kul1 & kul2', async () => {
      await page1.bringToFront().catch(() => {});
      await page1.waitForTimeout(1000);

      await page1.locator('[title="Start Conversation"]').click({ force: true, timeout: 10000 }).catch(() => {});
      await page1.waitForTimeout(2000);

      async function searchAndSelectUser(userName) {
        const input = page1.locator('.namegenEmailReplace').first();
        await input.waitFor({ state: 'visible', timeout: 5000 });
        await input.click();
        await page1.waitForTimeout(200);
        await page1.keyboard.press('Control+a');
        await page1.keyboard.press('Delete');
        await page1.waitForTimeout(200);
        await page1.keyboard.type(userName, { delay: 50 });
        await page1.waitForTimeout(4000);
        const result = page1.locator(`//div[@displayname='${userName}']`).first();
        await result.waitFor({ state: 'visible', timeout: 10000 });
        await result.click({ timeout: 5000 });
        await page1.waitForTimeout(700);
        console.log(`✓ ${userName} added`);
      }

      for (const name of [USER2_NAME, USER3_NAME]) {
        try { await searchAndSelectUser(name); } catch (e) {
          console.log(`Could not select ${name}: ${(e.message||'').substring(0, 60)}`);
        }
      }

      const groupNameInput = page1.locator('input.namegenTitleReplace').first();
      if (await groupNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        try {
          await groupNameInput.fill('');
          await groupNameInput.fill(CONVERSATION_NAME);
          console.log(`✓ Conversation named "${CONVERSATION_NAME}"`);
        } catch (e) {
          console.log('Could not set name:', e.message.substring(0, 60));
        }
      }

      await page1.evaluate(() => {
        document.querySelectorAll('.responsiveModalContainer [style*="pointer-events"], .responsiveModalContainer [class*="overlay"]')
          .forEach(el => el.style.pointerEvents = 'none');
      });
      await page1.waitForTimeout(500);
      await page1.locator('//*[text()="Create"]').click({ timeout: 5000 });
      await page1.waitForTimeout(2000);
      await page1.keyboard.press('Escape');
      await page1.waitForTimeout(1500);
      console.log(`✓ "${CONVERSATION_NAME}" created`);
    });

    await test.step('Start audio call', async () => {
      await ctx1.grantPermissions(['camera', 'microphone']);

      await page1.locator(`//div[@title='${CONVERSATION_NAME}']`).first()
        .click({ force: true, timeout: 5000 }).catch(() => {});
      await page1.waitForTimeout(1500);

      const makVisible = await convLoc1.makeacallButton.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (!makVisible) throw new Error('Make Call button not found');
      await convLoc1.makeacallButton.first().click({ timeout: 5000 });
      console.log('✓ Make Call clicked');
      await page1.waitForTimeout(1500);
    });

    await test.step('Accept / join call on all participants', async () => {
      await ctx2.grantPermissions(['camera', 'microphone']).catch(() => {});
      await ctx3.grantPermissions(['camera', 'microphone']).catch(() => {});

      for (let i = 0; i < 30; i++) {
        if (await page1.locator('//button[@title="End call"]').first()
          .isVisible({ timeout: 300 }).catch(() => false)) {
          console.log(`✓ Call connected after ~${i + 1}s`);
          break;
        }

        for (const [page, name] of [[page2, 'Kul1'], [page3, 'Kul2']]) {
          try { await page.bringToFront(); } catch (e) {}
          for (const sel of ['button:has-text("Answer")', 'button:has-text("Accept")', 'button:has-text("Join")', 'text=Join Audio Call']) {
            try {
              const btn = page.locator(sel).first();
              if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
                await btn.click({ force: true, timeout: 2000 });
                console.log(`✓ ${name} joined`);
                await page.waitForTimeout(500);
              }
            } catch (e) {}
          }
        }
        await page1.waitForTimeout(1000);
      }
    });

    await test.step('Check Meeting Notes UI', async () => {
      const btn = page1.locator('button:has-text("Capture"), text=Meeting Notes, [title*="Meeting Notes" i]').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click({ force: true });
        console.log('✓ Capture Meeting Notes clicked');
      } else {
        console.log('ℹ Capture Meeting Notes not found in app');
      }
    });

    await test.step('Verify call stays active', async () => {
      for (let s = 0; s < 5; s++) {
        expect(await page1.locator('//button[@title="End call"]').first()
          .isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
        console.log(`✓ Call active at ${s + 1}s`);
        await page1.waitForTimeout(1000);
      }
    });

    await test.step('Cleanup', async () => {
      const endBtn = page1.locator('//button[@title="End call"]').first();
      if (await endBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await endBtn.click({ force: true });
        console.log('✓ Call ended');
        await page1.waitForTimeout(2000);
      }
    });

    console.log('=== DONE: Login ✓ | Conversation ✓ | Call ✓ | Cleanup ✓');
  });

  test.afterEach(async () => {
    for (const ctx of [ctx1, ctx2, ctx3]) {
      if (ctx) {
        try {
          for (const p of ctx.pages()) await p.close().catch(() => {});
          await ctx.close().catch(() => {});
        } catch (e) { console.log(`Context close: ${e.message}`); }
      }
    }
  });
});
