import DashboardPageLocator from '../locators/dashboard.locators.js';
import commonMethod from '../utils/common.js';
import { expect } from '@playwright/test';
import LoginPageLocators from '../locators/login.locators.js';
import testData from '../utils/testData.json';
import test from 'node:test';


export default class groupsPage {
  constructor(page) {
    this.page = page;
    this.loginPageLocators = new LoginPageLocators(page);
    this.dashboardpagelocators = new DashboardPageLocator(page);
    this.common = new commonMethod(page);
  }
}




