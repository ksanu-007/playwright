import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import LoginPage from './loginpage.js';
import testData from '../utils/testData.json';

export default class DashboardPage {
  constructor(page) {
    this.page = page;
    this.dashboardpagelocators = new DashboardPageLocator(page);
    this.common = new CommonMethod(page);
  }

  async navigateToAddUser() {
    await this.page.goto(testData.appUrl.testUrl.replace('/#/login', '/#/Invited%20Users'), { waitUntil: 'load', timeout: 30000 });
    await this.page.waitForTimeout(1000);
    await this.dashboardpagelocators.AddUserButton.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(600);
  }

  async verifyInviteAnotherUserLabel() {
    await this.dashboardpagelocators.InviteAnotherUserLabel.waitFor({ state: 'visible', timeout: 10000 });
  }

  async addUsersSequentially(baseUserId, emailDomain, startIndex, endIndex, onProgress = null) {
    const results = [];
    const total = endIndex - startIndex + 1;
    const startTime = Date.now();

    for (let i = 0; i < total; i++) {
      const idx = startIndex + i;
      const username = `${baseUserId}${idx}`;
      const email = `${username}${emailDomain}`;
      const currentNum = i + 1;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = currentNum / (Date.now() - startTime) * 1000;
      const remaining = total - currentNum;
      const eta = rate > 0 ? (remaining / rate).toFixed(0) : '?';

      console.log(`[${currentNum}/${total}] Adding ${username} (Elapsed: ${elapsed}s, ETA: ${eta}s)`);

      let addSuccess = false;
      let attempts = 0;
      const maxAddRetries = 3;
      let skipped = false;

      while (attempts < maxAddRetries && !addSuccess) {
        try {
          attempts++;
          await this.dashboardpagelocators.FirstName.fill(username);
          await this.dashboardpagelocators.Email.fill(email);
          await this.dashboardpagelocators.InviteButton.click({ timeout: 5000 }).catch(() =>
            this.dashboardpagelocators.InviteButton.click({ force: true, timeout: 5000 })
          );

          try {
            await this.dashboardpagelocators.InviteAnotherUserLabel.waitFor({
              state: 'visible', timeout: 8000
            });
            addSuccess = true;
            console.log(`  ✓ ${username} added${attempts > 1 ? ` (${attempts} attempts)` : ''}`);
          } catch {
            skipped = true;
            console.log(`  ∼ ${username} skipped (already exists)`);
            addSuccess = true;
          }

          if (onProgress) onProgress({ type: 'add', username, success: true, skipped, attempts });

          if (i < total - 1) {
            if (skipped) {
              await this.page.keyboard.press('Escape');
              await this.page.waitForTimeout(300);
              await this.dashboardpagelocators.FirstName.fill('');
              await this.dashboardpagelocators.Email.fill('');
            } else {
              await this.dashboardpagelocators.InviteAnotherUserButton.click({ timeout: 5000 }).catch(() =>
                this.dashboardpagelocators.InviteAnotherUserButton.click({ force: true, timeout: 5000 })
              );
              await this.page.waitForTimeout(300);
            }
          }
        } catch (error) {
          if (attempts >= maxAddRetries) {
            console.error(`  ✗ ${username} failed after ${maxAddRetries} attempts: ${error.message.substring(0, 100)}`);
            if (onProgress) onProgress({ type: 'add', username, success: false, attempts });
            const url = this.page.url();
            if (!url.includes('Add%20User') && !url.includes('Add User')) {
              const loginPage = new LoginPage(this.page);
              await loginPage.loginNetsfere();
              await this.navigateToAddUser();
            }
          } else {
            console.log(`  Retry ${attempts}/${maxAddRetries} for ${username}: ${error.message.substring(0, 80)}`);
            if (this.page.url().includes('login')) {
              const loginPage = new LoginPage(this.page);
              await loginPage.loginNetsfere();
              await this.navigateToAddUser();
            } else {
              await this.navigateToAddUser();
            }
          }
        }
      }

      results.push({ username, email, success: addSuccess, skipped, attempts });
    }

    return results;
  }
}
