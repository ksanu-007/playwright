import UserActivationLocator from '../locators/userActivation.locators.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import LoginPage from './loginpage.js';
import testData from '../utils/testData.json';

export default class UserActivationPage {
  constructor(page) {
    this.page = page;
    this.locators = new UserActivationLocator(page);
    this.dashboard = new DashboardPageLocator(page);
    this.common = new CommonMethod(page);
  }

  _getAdminOrigin() {
    try {
      const current = this.page.url();
      if (current && current !== 'about:blank') {
        const origin = new URL(current).origin;
        if (origin.includes('admin') || origin.includes('localhost')) return origin;
      }
    } catch {}
    const loginUrl = testData.appUrl.testUrl || testData.appUrl.productionUrl;
    return loginUrl.replace('/#/login', '').replace('/#/Login', '');
  }

  async _loginToAdmin() {
    const loginPage = new LoginPage(this.page);
    const adminOrigin = this._getAdminOrigin();
    await this.page.goto(`${adminOrigin}/#/login`, { waitUntil: 'load', timeout: 30000 });
    const adminName = testData.logincreds.adminName || testData.logincreds.name;
    await loginPage.loginNetsfere(
      adminName + testData.logincreds.email,
      testData.logincreds.password
    );
  }

  async _ensureAdminSession() {
    const url = this.page.url();
    if (!url || url === 'about:blank' || url.includes('login') || url.includes('Login')) {
      await this._loginToAdmin();
    }
  }

  async navigateToInvitedUsers() {
    if (this.page.url().includes('Invited')) return;

    if (!this.page.url().includes('Dashboard')) {
      const baseUrl = this._getAdminOrigin();
      await this.page.goto(`${baseUrl}/#/Dashboard`, { waitUntil: 'load', timeout: 30000 });
      if (this.page.url().includes('login') || this.page.url() === 'about:blank') {
        await this._loginToAdmin();
      }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.dashboard.UserAndGroups.click({ timeout: 5000 });
        await this.page.waitForTimeout(300);
        await this.dashboard.InviteUser.click({ timeout: 5000 });
        await this.page.waitForTimeout(500);
        if (this.page.url().includes('Invited')) return;
        if (this.page.url().includes('login')) {
          await this._loginToAdmin();
          const baseUrl = this._getAdminOrigin();
          await this.page.goto(`${baseUrl}/#/Dashboard`, { waitUntil: 'load', timeout: 30000 });
        }
      } catch {
        if (this.page.url().includes('login')) {
          await this._loginToAdmin();
          const baseUrl = this._getAdminOrigin();
          await this.page.goto(`${baseUrl}/#/Dashboard`, { waitUntil: 'load', timeout: 30000 });
        }
      }
    }

    const baseUrl = this._getAdminOrigin();
    await this.page.goto(`${baseUrl}/#/Invited%20Users`, { waitUntil: 'load', timeout: 30000 });
  }

  async showAllEntries() {
    try {
      const select = this.page.locator('select').first();
      if (!(await select.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false))) {
        console.log('  No dropdown select found');
        return false;
      }
      await this.page.waitForTimeout(500);
      const options = await select.locator('option').all();
      const optionTexts = await select.locator('option').allTextContents();
      console.log('  Dropdown options:', optionTexts.map(o => o.trim()));

      const allIdx = optionTexts.findIndex(o => o.trim() === 'All');
      if (allIdx !== -1) {
        const val = await options[allIdx].getAttribute('value');
        await select.selectOption(val || 'All');
        await this.page.waitForTimeout(1500);
        const rowCount = await this.locators.UserRows.count();
        console.log(`  After "All": ${rowCount} rows`);
        return rowCount > 0;
      }

      const numericValues = optionTexts.map(o => parseInt(o.trim(), 10)).filter(n => !isNaN(n));
      if (numericValues.length > 0) {
        const maxVal = Math.max(...numericValues);
        const maxIdx = optionTexts.findIndex(o => o.trim() === String(maxVal));
        if (maxIdx !== -1) {
          const val = await options[maxIdx].getAttribute('value');
          await select.selectOption(val || String(maxVal));
          await this.page.waitForTimeout(1500);
          const rowCount = await this.locators.UserRows.count();
          console.log(`  After max(${maxVal}): ${rowCount} rows`);
          return rowCount > 0;
        }
      }

      return false;
    } catch (e) {
      console.log(`  showAllEntries error: ${e.message.substring(0, 80)}`);
      return false;
    }
  }

  async getInvitedUsersCount() {
    try {
      await this.page.waitForSelector('tbody tr', { timeout: 15000 });
    } catch {
      return 0;
    }
    return await this.locators.UserRows.count();
  }

  async _findEmailLinkColumnIndex(row) {
    const cells = row.locator('td');
    const cellCount = await cells.count({ timeout: 5000 }).catch(() => 0);
    for (let i = 0; i < cellCount; i++) {
      const href = await cells.nth(i).locator('a').getAttribute('href', { timeout: 2000 }).catch(() => null);
      if (href && href.includes('mailto:')) return i;
    }
    return -1;
  }

  async getActivationLinkFromRow(rowIndex) {
    const rows = this.locators.UserRows;
    const rowCount = await rows.count();
    if (rowIndex >= rowCount) {
      throw new Error(`Row ${rowIndex} is out of bounds (only ${rowCount} rows available)`);
    }
    const row = rows.nth(rowIndex);
    await row.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});

    let colIndex = -1;
    const fourthHref = await row.locator('td').nth(4).locator('a').getAttribute('href', { timeout: 3000 }).catch(() => null);
    if (fourthHref && fourthHref.includes('mailto:')) {
      colIndex = 4;
    } else {
      colIndex = await this._findEmailLinkColumnIndex(row);
    }

    if (colIndex === -1) {
      throw new Error(`No mailto link found in row ${rowIndex}`);
    }

    const emailLink = row.locator('td').nth(colIndex).locator('a');
    if (!(await emailLink.isVisible({ timeout: 3000 }).catch(() => false))) {
      throw new Error(`Email link not visible in row ${rowIndex}`);
    }

    let activationUrl = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const href = await emailLink.getAttribute('href');
      if (!href) throw new Error(`No href on email link for row ${rowIndex}`);

      const queryPart = href.split('?')[1];
      if (!queryPart) throw new Error(`No query params in email link for row ${rowIndex}`);

      const params = new URLSearchParams(queryPart);
      const encodedBody = params.get('body');
      if (!encodedBody) throw new Error(`No body parameter in email link for row ${rowIndex}`);

      activationUrl = decodeURIComponent(encodedBody);
      if (activationUrl.includes('activationCode') || activationUrl.includes('#activate')) break;

      await this.page.waitForTimeout(1000);
    }

    if (!activationUrl) throw new Error(`Failed to extract valid activation URL for row ${rowIndex}`);
    return activationUrl;
  }

  async extractLinksFromCurrentPage(targetCount = null) {
    const rowCount = await this.locators.UserRows.count();
    const limit = targetCount !== null && targetCount !== undefined ? Math.min(targetCount, rowCount) : rowCount;
    const links = [];
    for (let i = 0; i < limit; i++) {
      try {
        const link = await this.getActivationLinkFromRow(i);
        if (link) links.push(link);
      } catch (e) {
        console.log(`  Row ${i}: no activation link - ${e.message.substring(0, 80)}`);
      }
    }
    return links;
  }

  async extractLinksFromAllPages(maxLinks = null) {
    const allLinks = [];
    let pageNum = 1;

    while (true) {
      if (maxLinks !== null && allLinks.length >= maxLinks) break;

      const rowCount = await this.locators.UserRows.count();
      if (rowCount === 0) break;

      const remaining = maxLinks !== null ? maxLinks - allLinks.length : null;
      const pageLinks = await this.extractLinksFromCurrentPage(remaining);
      allLinks.push(...pageLinks);

      if (maxLinks !== null && allLinks.length >= maxLinks) break;

      const nextBtn = this.locators.NextPageButton;
      const isVisible = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) break;
      const isDisabled = await nextBtn.isDisabled().catch(() => false);
      if (isDisabled) break;

      const rowsBefore = await this.locators.UserRows.count();
      await nextBtn.click({ force: true, timeout: 5000 }).catch(() => nextBtn.click({ force: true, timeout: 5000 }));
      await this.page.waitForTimeout(2000);
      const rowsAfter = await this.locators.UserRows.count();
      if (rowsAfter >= rowsBefore && rowsAfter > 0) {
        console.log(`  Page ${pageNum}: same ${rowsAfter} rows after Next click - likely not navigating`);
        const hasChanged = await this.page.waitForFunction(
          (old) => document.querySelectorAll('tbody tr').length !== old || document.querySelector('tbody tr td a')?.href !== document.querySelectorAll('tbody tr td a')[0]?.href,
          rowsBefore, { timeout: 5000 }
        ).catch(() => false);
        if (!hasChanged) break;
      }
      pageNum++;
    }

    // Deduplicate links in case pagination duplicated rows
    const seen = new Set();
    const deduped = [];
    for (const link of allLinks) {
      if (!seen.has(link)) {
        seen.add(link);
        deduped.push(link);
      }
    }
    if (deduped.length < allLinks.length) {
      console.log(`  Deduplicated ${allLinks.length - deduped.length} duplicate links`);
    }
    return deduped;
  }

  async proceedThroughActivationForm(password) {
    const url = this.page.url();
    if (!url.includes('activate')) {
      console.log('  Not on activation page - likely already activated');
      return false;
    }

    const continueBtn = this.page.getByRole('button', { name: /Continue|continue/i });
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const termsCheckbox = this.page.locator('span.icon.ion-android-checkbox-outline-blank');
      if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await termsCheckbox.click();
        await this.page.waitForTimeout(300);
      }
      await continueBtn.click();
      await this.page.waitForTimeout(1500);
    }

    const allPasswordInputs = this.page.locator('input[type="password"]');
    const count = await allPasswordInputs.count().catch(() => 0);
    if (count === 0) {
      const currentUrl = this.page.url();
      if (currentUrl.includes('Dashboard') || currentUrl.includes('login')) {
        console.log('  Already on Dashboard/login - likely already active');
        return false;
      }
      throw new Error('No password input fields found');
    }

    const firstField = allPasswordInputs.first();
    await firstField.waitFor({ state: 'visible', timeout: 15000 });
    await firstField.clear();
    await firstField.fill(password);

    if (count >= 2) {
      const secondField = allPasswordInputs.nth(1);
      if (await secondField.isVisible().catch(() => false)) {
        await secondField.clear();
        await secondField.fill(password);
      }
    }

    const termsCheckbox = this.page.locator('span.icon.ion-android-checkbox-outline-blank');
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.click();
      await this.page.waitForTimeout(300);
    }

    const activateBtn = this.page.getByRole('button', { name: /Activate|activate|Set Password/i });
    if (!(await activateBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('Activate button not found');
    }

    for (let wait = 0; wait < 20; wait++) {
      if (await activateBtn.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(500);
    }
    if (await activateBtn.isEnabled().catch(() => false)) {
      await activateBtn.click({ timeout: 10000 });
    } else {
      await activateBtn.click({ force: true, timeout: 5000 });
    }

    try {
      await Promise.race([
        this.page.locator('text=/Success|Activated|activated successfully/i').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        this.page.waitForURL('**/Dashboard**', { timeout: 15000 }).catch(() => null),
        this.page.waitForURL('**/login**', { timeout: 15000 }).catch(() => null),
      ]);
    } catch {
      console.log('Warning: Could not confirm activation success');
    }

    return true;
  }

  async activateUserWithLink(activationLink, password) {
    if (!activationLink || !activationLink.startsWith('http')) {
      return { skipped: true, reason: `Invalid activation link` };
    }

    try {
      await this.page.goto(activationLink, { waitUntil: 'load', timeout: 30000 });
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('ERR_NAME_NOT_RESOLVED') || msg.includes('ERR_CONNECTION')) {
        return { skipped: true, reason: `DNS/Connection error: ${msg.substring(0, 80)}` };
      }
      throw e;
    }

    await this.page.waitForTimeout(2000);

    const currentUrl = this.page.url();
    if (!currentUrl.includes('activate')) {
      return { skipped: true, reason: 'Already activated (redirected away from activation page)' };
    }

    const result = await this.proceedThroughActivationForm(password);
    if (!result) {
      return { skipped: true, reason: 'Already activated (redirected away)' };
    }

    return { success: true };
  }

  async activateAllInvitedUsers(password, newUserCount = null, onProgress = null) {
    const startTime = Date.now();

    if (newUserCount !== null && newUserCount <= 0) {
      console.log('No new users to activate');
      return [];
    }

    await this.navigateToInvitedUsers();

    await this.page.waitForSelector('tbody tr', { timeout: 15000 }).catch(() => {});

    const allShown = await this.showAllEntries();
    let allLinks = [];

    if (allShown) {
      const userCount = await this.getInvitedUsersCount();
      if (userCount === 0) {
        console.log('No invited users found to activate');
        return [];
      }
      allLinks = await this.extractLinksFromCurrentPage(newUserCount);
    } else {
      allLinks = await this.extractLinksFromAllPages(newUserCount);
    }

    if (allLinks.length === 0) {
      console.log('No activation links found');
      return [];
    }

    const total = allLinks.length;
    console.log(`\nActivating ${total} users...`);
    const results = [];

    for (let i = 0; i < total; i++) {
      const userNum = i + 1;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = userNum / (Date.now() - startTime) * 1000;
      const remaining = total - userNum;
      const eta = rate > 0 ? (remaining / rate).toFixed(0) : '?';

      console.log(`\n[${userNum}/${total}] (Elapsed: ${elapsed}s, ETA: ${eta}s)`);

      let activationAttempts = 0;
      const maxActivationRetries = 2;
      let activationSuccess = false;
      let activationSkipped = false;

      while (activationAttempts < maxActivationRetries && !activationSuccess && !activationSkipped) {
        try {
          activationAttempts++;
          const result = await this.activateUserWithLink(allLinks[i], password);

          if (result.skipped) {
            console.log(`  ∼ ${result.reason}`);
            results.push({ success: false, rowIndex: i, skipped: true, message: result.reason, attempts: activationAttempts });
            activationSkipped = true;
            if (onProgress) onProgress({ type: 'activation', index: i, success: false, skipped: true });
          } else {
            results.push({ success: true, rowIndex: i, message: 'User activated', attempts: activationAttempts });
            console.log(`  ✓ Activated (${activationAttempts} attempt(s))`);
            activationSuccess = true;
            if (onProgress) onProgress({ type: 'activation', index: i, success: true });
          }
        } catch (error) {
          if (activationAttempts >= maxActivationRetries) {
            console.error(`  ✗ Failed after ${maxActivationRetries} attempts: ${error.message.substring(0, 100)}`);
            results.push({ success: false, rowIndex: i, error: error.message, attempts: activationAttempts });
            if (onProgress) onProgress({ type: 'activation', index: i, success: false });
          } else {
            console.log(`  Retry ${activationAttempts}/${maxActivationRetries}: ${error.message.substring(0, 100)}`);
          }
        }
      }

      if (i < total - 1) {
        await this.page.goto('about:blank', { waitUntil: 'load', timeout: 10000 }).catch(() => {});
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const succeeded = results.filter(r => r.success).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success && !r.skipped).length;
    console.log(`\nActivation: ${succeeded} success, ${skipped} skipped, ${failed} failed in ${totalTime}s`);
    return results;
  }
}
