const base = require('@playwright/test');
import testData from '../utils/testData.json';

exports.test = base.test.extend({

  testData: async ({}, use) => {
    await use(testData);
  }

});

// Global hooks for this project
exports.test.beforeEach(async ({ page , testData }) => {
  console.log('Running Before Each Test');
await page.goto(testData.appUrl.testUrl);
  await loginPage.loginNetsfere();
  await dashboardPage.verifyDashboardScreen();

});

exports.test.afterEach(async ({ page }) => {
  console.log('Test Finished');
  await common.click(dashboardPageLocator.LogoutButton);
});
