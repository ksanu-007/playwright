import { test, expect } from '@playwright/test';
import LoginPage from "../pages/loginpage.js";
import DashboardPage from "../pages/dashboardpage.js";
import dashboardpage from "../locators/dashboard.locators.js";
import commonMethod from '../utils/common.js';

// const commonMethod = new CommonMethod(page);
// const loginPage = new LoginPage(page);
// const dashboardPage = new DashboardPage(page);
// const dashboardpagelocator = new dashboardpage(page);


test('verify add user functionality', async ({ page }) => {

 const commonMethod = new CommonMethod(page);
const loginPage = new LoginPage(page);
const dashboardPage = new DashboardPage(page);
const dashboardpagelocator = new dashboardpage(page);
  await page.goto('https://admin.netsferetest.com/#/login');
  await loginPage.loginNetsfere();
  dashboardPage.verifyDashboardSreen();
  commonMethod.click(dashboardpagelocator.userGroups);
  commonMethod.click(dashboardpagelocator.invitedUser);
  commonMethod.click(dashboardpagelocator.addUserButton); 
  dashboardPage.enterUserDetails('atgu', '@murali.netsferetest.org');
  commonMethod.click(dashboardpagelocator.DoneButton);
  commonMethod.click(dashboardpagelocator.LogoutButton);

  //await dashboardPage.verifyAddUser();

});

