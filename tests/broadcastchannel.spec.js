import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';
import { finished } from 'node:stream';
import GroupsPageLocator from '../locators/groups.locator.js';
import BroadcastPageLocator from '../locators/broadcast.locator.js';


test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Initiate browser and Login userID and Password`);
   await page.goto(testData.appUrl.testUrl);
  await loginPage.loginNetsfere();  
});

test('verify Add Broadcast Channel functionality', async ({ page}) => {
  const dashboardPage = new DashboardPage(page);
  const dashboardPageLocator = new DashboardPageLocator(page);
  const groupsPageLocator = new GroupsPageLocator(page);
  const broadcastPageLocator = new BroadcastPageLocator(page);
  const common = new CommonMethod(page);
  await dashboardPage.verifyDashboardScreen();
  await common.click(broadcastPageLocator.BroadcastTab);
  await common.click(broadcastPageLocator.AddBroadcastButton);
    await common.fill(broadcastPageLocator.EnterBroadcastChannelName, testData.BroadcastChannelDetails.broadcastName);
    await common.fill(broadcastPageLocator.EnterBroadcastChannelDescription, testData.BroadcastChannelDetails.broadcastchannelDescription);
    await common.click(broadcastPageLocator.SelectAudienceButton);
    await common.fill(broadcastPageLocator.SearchGroupInBroadcast, testData.groupDetails.shortgroupName);
    await common.click(broadcastPageLocator.SelectSearchGroupInBroadcast);
    await common.click(broadcastPageLocator.SaveChangesAndReturnButton);
    await page.waitForTimeout(10000);
    await common.click(broadcastPageLocator.AddNewBroadcastButton);
    await page.waitForTimeout(5000);
    await common.verifyElementVisible(broadcastPageLocator.SuccessMessage);
    await common.click(broadcastPageLocator.closeButton);
    await common.click(broadcastPageLocator.AddaFilterButton);
    await page.waitForTimeout(5000);
    await common.fill(broadcastPageLocator.EnterBroadcastChannelName, testData.BroadcastChannelDetails.broadcastName);
    await common.click(broadcastPageLocator.FilterBroadcastChannelName);
    await common.click(broadcastPageLocator.selectbroadcastchannel);
    await common.click(broadcastPageLocator.deletebroadcastchannel);

});

