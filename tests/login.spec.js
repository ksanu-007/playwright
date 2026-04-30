import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';
import { finished } from 'node:stream';


test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Initiate browser and Login userID and Password`);
   await page.goto(testData.appUrl.testUrl);
  await loginPage.loginNetsfere();
  
});

test.afterEach(async ({ page }) => {
  console.log('app logout');
  const common = new CommonMethod(page);
  const dashboardPageLocator = new DashboardPageLocator(page)
  await common.click(dashboardPageLocator.LogoutButton);
});

test('verify add & activate user functionality', async ({ page}) => {
  const dashboardPage = new DashboardPage(page);
  const dashboardPageLocator = new DashboardPageLocator(page);
  const common = new CommonMethod(page);
  await dashboardPage.verifyDashboardScreen();
  await common.click(dashboardPageLocator.UserAndGroups);
  await common.click(dashboardPageLocator.InviteUser);
  await common.click(dashboardPageLocator.AddUserButton);
  await dashboardPage.enterUserDetails(testData.logincreds.name, testData.logincreds.email);
});




