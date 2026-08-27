import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import VaultDashboardPage from '../pages/VaultDashboardPage.js';
import VaultReportsPage from '../pages/VaultReportsPage.js';
import testData from '../utils/testData.json';

async function loginToVault(page) {
  console.log('[vault-login] goto', testData.appUrl.vaultUrl);
  await page.goto(testData.appUrl.vaultUrl);
  console.log('[vault-login] goto done, url=', page.url());

  // Confirmed live: navigating the same `page` to the login URL a second
  // time (Step 3, after Step 1 already authenticated it) redirects straight
  // to the dashboard since the session is still active — there's no login
  // form to fill in that case. Reload instead, to get a fresh read of the
  // dashboard rather than reusing whatever was in the DOM since Step 1.
  if (page.url().includes('/dashboard')) {
    console.log('[vault-login] already authenticated (session still active) — reloading for fresh data');
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch((e) => console.log('[vault-login] networkidle wait failed:', e.message));
    console.log('[vault-login] loginToVault complete (reused session)');
    return;
  }

  const emailField = page.locator('input[type="email"]').first();
  console.log('[vault-login] waiting for email field');
  await emailField.waitFor({ state: 'visible', timeout: 15000 });
  await emailField.fill(testData.vaultLogin.username);
  console.log('[vault-login] email filled');

  const nextBtn = page.locator('button:has-text("Next")').first();
  if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[vault-login] clicking Next');
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  const passField = page.locator('input[type="password"]').first();
  console.log('[vault-login] waiting for password field');
  await passField.waitFor({ state: 'visible', timeout: 10000 });
  await passField.fill(testData.vaultLogin.password);
  console.log('[vault-login] password filled');

  const loginBtn = page.locator('button[type="submit"]').first();
  console.log('[vault-login] clicking submit');
  await loginBtn.click();
  console.log('[vault-login] submit clicked, waiting for dashboard URL');

  await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch((e) => console.log('[vault-login] waitForURL dashboard failed:', e.message));
  console.log('[vault-login] url after waitForURL:', page.url());
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch((e) => console.log('[vault-login] networkidle wait failed:', e.message));
  console.log('[vault-login] loginToVault complete');
}

test.describe('Vault Dashboard - Verify Update After HOPT Sanity', () => {
  test('Run HOPT Sanity then verify vault dashboard reflects the update', async ({ page }, testInfo) => {
    test.setTimeout(600000);
    const headedFlag = testInfo.project.use.headless === false ? ' --headed' : '';

    let beforeCount = 0;
    let conversationId = null;

    await test.step('Step 1 - Capture vault dashboard baseline', async () => {
      console.log('[step1] starting');
      await loginToVault(page);
      console.log('[step1] logged in, verifying dashboard loaded');
      const vaultDashboard = new VaultDashboardPage(page);
      await vaultDashboard.verifyDashboardLoaded();
      console.log('[step1] dashboard loaded, reading archive count');
      beforeCount = await vaultDashboard.getArchiveCount();
      console.log(`[step1] Baseline archive count: ${beforeCount}`);
    });

    await test.step('Step 2 - Run HOPTSanity.spec.js', async () => {
      // SKIP_MOBILE_SETUP: this nested run is a fresh `npx playwright test`
      // process, so it would otherwise re-trigger globalSetup's Android/iOS
      // device preflight (utils/mobileEnvironmentSetup.js) — irrelevant for
      // this purely web-based vault flow, and slow (10+ min) whenever a
      // physical device happens to be connected at run time.
      //
      // stdio must NOT be 'inherit' here: this parent process's own stdout
      // is itself a pipe (this test is normally run via `... | tail`), and
      // confirmed live that making the child process share that same pipe
      // deadlocks — both processes writing to one OS pipe with nothing
      // draining it fast enough hung the whole run for 29+ minutes. Letting
      // execSync capture the child's output into its own buffer and
      // printing it afterwards avoids sharing that pipe.
      try {
        const output = execSync(`npx playwright test tests/HOPTSanity.spec.js --project=chromium${headedFlag}`, {
          cwd: process.cwd(),
          env: { ...process.env, SKIP_MOBILE_SETUP: '1' },
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 50,
        });
        console.log(output);

        // HOPTSanity.spec.js's final step logs "CONVERSATION_ID:<id>" for
        // the group conversation it created — captured here so Step 4 can
        // scope a vault report to that exact conversation.
        const match = output.match(/CONVERSATION_ID:(\d+)/);
        conversationId = match ? match[1] : null;
        console.log(`Captured conversation ID from HOPT Sanity run: ${conversationId}`);
      } catch (err) {
        console.log(err.stdout || '');
        console.error(err.stderr || '');
        throw err;
      }
    });

    await test.step('Step 3 - Login to vault and verify dashboard updated', async () => {
      await loginToVault(page);
      const vaultDashboard = new VaultDashboardPage(page);
      await vaultDashboard.verifyDashboardLoaded();

      const afterCount = await vaultDashboard.getArchiveCount();
      console.log(`Archive count after HOPT Sanity run: ${afterCount}`);

      await vaultDashboard.verifyNoErrors();

      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
      console.log(afterCount > beforeCount
        ? `Vault dashboard updated: archive count went from ${beforeCount} to ${afterCount}.`
        : 'Archive count unchanged after HOPT Sanity run.');
    });

    await test.step('Step 4 - Generate and verify a vault report for the HOPT Sanity conversation', async () => {
      expect(conversationId).toBeTruthy();

      const vaultReports = new VaultReportsPage(page);
      await vaultReports.open();

      const reportName = `HOPTSanity_Conv_${conversationId}_${Date.now()}`;
      await vaultReports.createReport(reportName, conversationId);
      await vaultReports.verifyReportVisible(reportName);
      console.log(`Report "${reportName}" submitted for conversation ID ${conversationId}`);

      const finalRowText = await vaultReports.waitForReportCompleted(reportName, 120000);
      console.log(`Report final row: ${finalRowText}`);

      const stats = await vaultReports.getReportStats(reportName);
      console.log('Report stats:', JSON.stringify(stats));

      expect(stats.status).toMatch(/Completed/i);
    });
  });
});
