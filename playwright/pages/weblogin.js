
import DashboardPageLocator from '../locators/dashboard.locators.js';
import commonMethod from '../utils/common.js';
import { expect } from '@playwright/test';
import LoginPageLocators from '../locators/login.locators.js';
import testData from '../utils/testData.json';
import WebLoginPageLocator from '../locators/weblogin.locator.js';


export default class Weblogin {
  constructor(page) {
    this.page = page;
   
    this.dashboardpagelocators = new DashboardPageLocator(page);
    this.webloginPageLocators = new WebLoginPageLocator(page);
    this.common = new commonMethod(page);
  }

  /**
   * Login to web application with email and password
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async loginWebApplication(email, password) {
    console.log(`Navigating to web application URL: ${testData.appUrl.webUrl}`);
    await this.page.goto(testData.appUrl.webUrl);
    
    console.log(`Entering email: ${email}`);
    await this.common.fill(this.webloginPageLocators.emailInput, email);
    
    console.log(`Clicking continue button`);
    await this.common.click(this.webloginPageLocators.continueButton);
    await this.page.waitForTimeout(3000);
    
    console.log(`Entering password`);
    await this.common.fill(this.webloginPageLocators.passwordInput, password);
    
    console.log(`Clicking next/continue button for password`);
    await this.common.click(this.webloginPageLocators.continueButton);
    
    console.log(`Waiting for page to load`);
    await this.page.waitForTimeout(2000);

    // Fixed 2026-08-06: this method previously never checked whether login
    // actually succeeded — confirmed live that a transient failure ("Invalid
    // email address and/or password" on otherwise-correct credentials, seen
    // once across many identical successful runs) left the page stuck on
    // #/login with no exception thrown, so callers' own retry logic (e.g.
    // the loginWeb() helper several specs use) never triggered since nothing
    // ever threw. Throwing here on a detected failure lets that existing
    // retry logic actually do its job.
    const loginError = this.page.locator('text=Invalid email address and/or password');
    if (await loginError.isVisible({ timeout: 2000 }).catch(() => false)) {
      throw new Error(`Web login failed for ${email}: invalid credentials or transient error`);
    }
  }

  /**
   * Verify the "How can I help?" label is visible after login
   */
  async verifyHowCanIHelpLabel() {
    console.log(`Verifying "How can I help?" label is visible`);
    await this.common.verifyElementVisible(this.webloginPageLocators.loginverification.first());
    console.log(`"How can I help?" label verified successfully`);
  }

  /**
   * Complete login flow and verify successful login
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async loginAndVerify(email, password) {
    await this.loginWebApplication(email, password);
    await this.verifyHowCanIHelpLabel();
  }

  /**
   * Logout of the web application via the top-left avatar's Settings panel.
   * Verified live 2026-08-06: the avatar (wrapped in a `title="Settings"`
   * div, top-left of the sidebar) opens a profile/settings panel with a
   * "Logout" button directly on it — no confirmation dialog, navigates
   * straight to #/login.
   *
   * Fixed 2026-08-06: `force: true` on the avatar click reproducibly failed
   * to open the panel (confirmed live — the app needs a real, actionability-
   * checked click with its normal event sequence; `force` bypasses that and
   * the click silently no-ops). Plain `.click()` on both the avatar and the
   * Logout button works.
   */
  async logout(timeout = 15000) {
    console.log('Logging out of web application');
    await this.webloginPageLocators.settingsAvatarButton.first().click();
    await this.webloginPageLocators.logoutButton.waitFor({ state: 'visible', timeout });
    await this.webloginPageLocators.logoutButton.click();
    await this.page.waitForURL(/#\/login/, { timeout }).catch(() => {});
  }
}

