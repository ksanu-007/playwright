import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import VaultDashboardPage from '../pages/VaultDashboardPage.js';
import VaultReportsPage from '../pages/VaultReportsPage.js';
import Weblogin from '../pages/weblogin.js';
import ConversationHelper from '../pages/conversation.js';
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
  test('Run HOPT Sanity then verify vault dashboard reflects the update', async ({ page, browser }, testInfo) => {
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

      // Content-level check: every exported row must actually belong to the
      // requested conversation — a UI-reported "Completed" status only
      // confirms compilation finished, not that the filter matched correctly.
      const messages = await vaultReports.getReportMessages(reportName);
      console.log(`Report "${reportName}" exported ${messages.length} message row(s)`);
      expect(messages.length).toBe(Number(stats.messageCount));
      for (const row of messages) {
        expect(row.ContainerId).toBe(String(conversationId));
      }
    });

    await test.step('Step 5 - Generate and verify a vault report by message keyword', async () => {
      const vaultReports = new VaultReportsPage(page);
      await vaultReports.open();

      const reportName = `HOPTSanity_Keyword_${Date.now()}`;
      await vaultReports.createReportByKeyword(reportName, 'Hello Team');
      await vaultReports.verifyReportVisible(reportName);
      console.log(`Report "${reportName}" submitted for keyword "Hello Team"`);

      const finalRowText = await vaultReports.waitForReportCompleted(reportName, 120000);
      console.log(`Report final row: ${finalRowText}`);

      const stats = await vaultReports.getReportStats(reportName);
      console.log('Report stats:', JSON.stringify(stats));

      expect(stats.status).toMatch(/Completed/i);

      // Content-level check: a keyword search is only correct if EVERY
      // returned row actually contains the keyword — the UI status/count
      // alone can't catch a filter that's silently too broad. The search
      // itself is case-insensitive (confirmed live 2026-08-29: it correctly
      // matched a pre-existing "Hello team, this is a test message..." row
      // too), so the assertion matches that instead of requiring exact case.
      const messages = await vaultReports.getReportMessages(reportName);
      console.log(`Report "${reportName}" exported ${messages.length} message row(s)`);
      expect(messages.length).toBe(Number(stats.messageCount));
      expect(messages.length).toBeGreaterThan(0);
      for (const row of messages) {
        expect(row.Message.toLowerCase()).toContain('hello team');
      }
    });

    await test.step('Step 6 - Generate and verify a vault report by message ID', async () => {
      // The Message ID isn't something HOPTSanity.spec.js's own run ever
      // surfaces (unlike CONVERSATION_ID) — it's read from the live web
      // client's per-message "Message Details" panel (triple-dot menu on the
      // message bubble), which needs a separate logged-in context since
      // `page` here is the vault client, not the web messaging client.
      const msgContext = await browser.newContext();
      let messageId;
      try {
        const msgPage = await msgContext.newPage();
        const webLogin = new Weblogin(msgPage);
        await webLogin.loginWebApplication(
          `${testData.logincreds.name}${testData.logincreds.email}`,
          testData.logincreds.password
        );
        // A brand-new context has no cached session/app bundle, so the app
        // takes noticeably longer to finish loading here than in a page
        // that's already been used this run — wait for the same readiness
        // signal HOPTSanity.spec.js waits on after login.
        await msgPage.locator('text=How can I help?').first().waitFor({ state: 'visible', timeout: 60000 });

        const conv = new ConversationHelper(msgPage);
        await conv.dismissFeatureModal();

        // The HOPT Sanity group just created is the most recent conversation.
        const firstConv = msgPage.locator('div.scrollbox > div > div').first();
        await firstConv.waitFor({ state: 'visible', timeout: 30000 });
        await firstConv.click({ force: true });
        await msgPage.waitForTimeout(1000);
        await conv.dismissFeatureModal();

        messageId = await conv.getMessageId('Hello Team');
        console.log(`Captured Message ID for "Hello Team": ${messageId}`);
      } finally {
        await msgContext.close();
      }

      expect(messageId).toBeTruthy();

      const vaultReports = new VaultReportsPage(page);
      await vaultReports.open();

      const reportName = `HOPTSanity_MsgId_${Date.now()}`;
      await vaultReports.createReportByMessageId(reportName, messageId);
      await vaultReports.verifyReportVisible(reportName);
      console.log(`Report "${reportName}" submitted for message ID ${messageId}`);

      const finalRowText = await vaultReports.waitForReportCompleted(reportName, 120000);
      console.log(`Report final row: ${finalRowText}`);

      const stats = await vaultReports.getReportStats(reportName);
      console.log('Report stats:', JSON.stringify(stats));

      expect(stats.status).toMatch(/Completed/i);

      // Content-level check: a single-message-ID report must resolve to
      // exactly that one message, not a broader/narrower match.
      const messages = await vaultReports.getReportMessages(reportName);
      console.log(`Report "${reportName}" exported ${messages.length} message row(s)`);
      expect(messages.length).toBe(1);
      expect(messages[0].Id).toBe(String(messageId));
      expect(messages[0].Message).toBe('Hello Team');
    });
  });
});
