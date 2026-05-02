
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';
import { finished } from 'node:stream';
import GroupsPageLocator from '../locators/groups.locator.js';


test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Initiate browser and Login userID and Password`);
   await page.goto(testData.appUrl.testUrl);
  await loginPage.loginNetsfere();
  
});


test('Verify Create Group functionality', async ({ page}) => {
  const dashboardPage = new DashboardPage(page);
  const dashboardPageLocator = new DashboardPageLocator(page);
  const groupsPageLocator = new GroupsPageLocator(page);
  const common = new CommonMethod(page);
  await dashboardPage.verifyDashboardScreen();
  await common.click(dashboardPageLocator.UserAndGroups);
  await common.click(groupsPageLocator.GroupsTab);
  await common.click(groupsPageLocator.AddGroupButton);
  await common.fill(groupsPageLocator.GroupNameInput, testData.groupDetails.groupName);
  await common.fill(groupsPageLocator.GroupDescriptionInput, testData.groupDetails.shortgroupName);
  await common.click(groupsPageLocator.EditMembersButton);
  await common.click(groupsPageLocator.SelectMembersCheckBox);
  await common.click(groupsPageLocator.SaveButton);
  await common.click(groupsPageLocator.EditOwnersButton);
  await common.click(groupsPageLocator.SelectOwnersCheckBox);
  await common.click(groupsPageLocator.SaveButton);
  await common.click(groupsPageLocator.AddButton);
  await page.waitForTimeout(20000);
  await common.verifyElementVisible(groupsPageLocator.SuccessMessage);
  await common.click(groupsPageLocator.closeButton);
  
});