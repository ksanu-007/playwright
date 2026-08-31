import { test } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import UserActivationPage from '../pages/userActivation.js';
import testData from '../utils/testData.json';

test('debug: try completing Microsoft SSO login for sera-standard1', async ({ page, context }) => {
  test.setTimeout(120000);

  const loginPage = new LoginPage(page);
  await page.goto(testData.appUrl.testUrl, { waitUntil: 'load', timeout: 60000 });
  await loginPage.loginNetsfere();

  const userActivation = new UserActivationPage(page);
  await userActivation.navigateToInvitedUsers();
  await page.waitForSelector('tbody tr', { timeout: 15000 }).catch(() => {});
  await userActivation.showAllEntries();

  const link = await userActivation.getActivationLinkFromRow(0);
  console.log('LINK:', link);

  const p = await context.newPage();
  await p.goto(link, { waitUntil: 'load', timeout: 30000 });
  await p.waitForTimeout(1500);

  const continueBtn = p.getByRole('button', { name: /Continue/i }).first();
  if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await continueBtn.click();
    await p.waitForTimeout(2000);
  }

  console.log('ON_MS_URL:', p.url());
  await p.screenshot({ path: 'debug-sso-1.png' });

  const msPasswordField = p.locator('input[type="password"]').first();
  const msPassVisible = await msPasswordField.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('MS_PASSWORD_FIELD_VISIBLE_IMMEDIATELY:', msPassVisible);

  // Microsoft's real login usually asks for email first (even though login_hint
  // pre-fills it, it might still show an account picker or an "enter password" step)
  const bodyText1 = await p.locator('body').innerText().catch(() => '');
  console.log('MS_PAGE_BODY_1_START');
  console.log(bodyText1.slice(0, 800));
  console.log('MS_PAGE_BODY_1_END');

  if (msPassVisible) {
    await msPasswordField.fill(testData.logincreds.password);
    const signInBtn = p.getByRole('button', { name: /Sign in/i }).first();
    if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInBtn.click();
      await p.waitForTimeout(3000);
    }
  } else {
    // Maybe need to click "Next" first on an email confirmation screen
    const nextBtn = p.getByRole('button', { name: /Next/i }).first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await p.waitForTimeout(2000);
      const passVisible2 = await msPasswordField.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('MS_PASSWORD_FIELD_VISIBLE_AFTER_NEXT:', passVisible2);
      if (passVisible2) {
        await msPasswordField.fill(testData.logincreds.password);
        const signInBtn = p.getByRole('button', { name: /Sign in/i }).first();
        if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await signInBtn.click();
          await p.waitForTimeout(3000);
        }
      }
    }
  }

  console.log('FINAL_URL:', p.url());
  await p.screenshot({ path: 'debug-sso-2-final.png' });
  const bodyText2 = await p.locator('body').innerText().catch(() => '');
  console.log('MS_PAGE_BODY_2_START');
  console.log(bodyText2.slice(0, 1000));
  console.log('MS_PAGE_BODY_2_END');
});
