
import DashboardPageLocator from '../locators/dashboard.locators.js';
import commonMethod from '../utils/common.js';
import { expect } from '@playwright/test';
import LoginPageLocators from '../locators/login.locators.js';
import testData from '../utils/testData.json';
import test from 'node:test';
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
    
    console.log(`Entering password`);
    await this.common.fill(this.webloginPageLocators.passwordInput, password);
    
    console.log(`Clicking next/continue button for password`);
    await this.common.click(this.webloginPageLocators.continueButton);
    
    console.log(`Waiting for page to load`);
    await this.page.waitForTimeout(2000);
  }

  /**
   * Verify the "How can I help?" label is visible after login
   */
  async verifyHowCanIHelpLabel() {
    console.log(`Verifying "How can I help?" label is visible`);
    await this.common.verifyElementVisible(this.webloginPageLocators.loginverification);
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
}

