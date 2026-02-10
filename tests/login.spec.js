import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';

test('verify add user functionality', async ({ page }) => {

  const commonMethod = new CommonMethod(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const dashboardPageLocator = new DashboardPageLocator(page);

  await page.goto('https://admin.netsferetest.com/#/login');
  await loginPage.loginNetsfere();
  //await expect(page).toHaveURL('https://admin.netsferetest.com/#/dashboard');
  await dashboardPage.verifyDashboardScreen();

  await commonMethod.click(dashboardPageLocator.userGroups);
  await commonMethod.click(dashboardPageLocator.invitedUser);
  await commonMethod.click(dashboardPageLocator.addUserButton);

  await dashboardPage.enterUserDetails('atgu', '@murali.netsferetest.org');

  await commonMethod.click(dashboardPageLocator.DoneButton);
  await commonMethod.click(dashboardPageLocator.LogoutButton);
});
