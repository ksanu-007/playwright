
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
   * Login an SSO (SAML/Entra ID) account. Entering the email and clicking
   * continue redirects to login.microsoftonline.com instead of showing the
   * app's own password field, so this follows that redirect: password screen
   * (email is pre-filled via login_hint), then the "Stay signed in?" prompt
   * that follows a fresh sign-in, before landing back on the app.
   * @param {string} email - SSO email address
   * @param {string} password - SSO account password
   */
  async loginSSO(email, password) {
    console.log(`Navigating to web application URL: ${testData.appUrl.webUrl}`);
    await this.page.goto(testData.appUrl.webUrl);

    console.log(`Entering SSO email: ${email}`);
    await this.common.fill(this.webloginPageLocators.emailInput, email);

    console.log(`Clicking continue button`);
    await this.common.click(this.webloginPageLocators.continueButton);

    console.log(`Waiting for Microsoft SSO password screen`);
    await this.webloginPageLocators.passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    console.log(`Entering SSO password`);
    await this.common.fill(this.webloginPageLocators.passwordInput, password);

    console.log(`Clicking Microsoft Sign in button`);
    await this.common.click(this.webloginPageLocators.ssoSubmitButton);

    const invalidCreds = await this.webloginPageLocators.ssoInvalidCreds
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (invalidCreds) {
      throw new Error(`SSO login failed for ${email}: invalid credentials`);
    }

    // "Stay signed in?" only appears on a fresh sign-in, not on a reused session.
    // isVisible() alone won't do here - it's a single immediate check, not a
    // poll, and this screen takes a moment to render after the sign-in POST.
    const stayPrompt = await this.webloginPageLocators.ssoStaySignedInHeading
      .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (stayPrompt) {
      console.log(`Dismissing "Stay signed in?" prompt`);
      await this.common.click(this.webloginPageLocators.ssoSubmitButton);
    }

    console.log(`Waiting for redirect back to the app`);
    await this.page.waitForURL(/web\.netsferetest\.com/, { timeout: 30000 });
  }

  /**
   * Login an ADFS-configured account. Verified live 2026-08-19 (real
   * @twinkle.netsferetest.org domain — see adfsSignInButton's own locator
   * comment for how an earlier attempt against a non-SSO-configured
   * account led to the wrong conclusion that no redirect happens): entering
   * email and clicking the app's own continueButton redirects to a real
   * external ADFS page ("NetSfere Dev Inc." heading), which pre-fills email
   * and lands focus on its password field (same passwordInput xpath as the
   * app's own pages) — only its submit button differs, a plain "Sign in"
   * button rather than the app's click-ripple continueButton. No "Stay
   * signed in?" interstitial like Azure AD's loginSSO.
   * @param {string} email - ADFS account email address
   * @param {string} password - ADFS account password
   */
  async loginADFS(email, password) {
    console.log(`Navigating to web application URL: ${testData.appUrl.webUrl}`);
    await this.page.goto(testData.appUrl.webUrl);

    console.log(`Entering ADFS email: ${email}`);
    await this.common.fill(this.webloginPageLocators.emailInput, email);

    console.log(`Clicking continue button`);
    await this.common.click(this.webloginPageLocators.continueButton);

    console.log(`Waiting for ADFS password screen`);
    await this.webloginPageLocators.passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    console.log(`Entering ADFS password`);
    await this.common.fill(this.webloginPageLocators.passwordInput, password);

    console.log(`Clicking ADFS Sign in button`);
    await this.common.click(this.webloginPageLocators.adfsSignInButton);

    console.log(`Waiting for redirect back to the app`);
    await this.page.waitForURL(/web\.netsferetest\.com/, { timeout: 30000 });
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

