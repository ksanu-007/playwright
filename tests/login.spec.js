import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';

test('verify add user functionality', async ({ page }) => {

  const common = new CommonMethod(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const dashboardPageLocator = new DashboardPageLocator(page);

  await page.goto('https://admin.netsferetest.com/#/login');
  await loginPage.loginNetsfere();
  //await expect(page).toHaveURL('https://admin.netsferetest.com/#/dashboard');
  await dashboardPage.verifyDashboardScreen();

  await common.click(dashboardPageLocator.UserAndGroups);
  await common.click(dashboardPageLocator.InviteUser);
  await common.click(dashboardPageLocator.AddUserButton);

  await dashboardPage.enterUserDetails('atgu', '@murali.netsferetest.org');

  //await common.click(dashboardPageLocator.DoneButton);

  //await common.click(dashboardPageLocator.LogoutButton);
});
