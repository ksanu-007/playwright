import { test, expect } from '@playwright/test';
import Weblogin from '../pages/weblogin.js';
import CommonMethod from '../utils/common.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';

test('Verify web user is able to login successfully and see "How can I help?" label', async ({ page }) => {
  const weblogin = new Weblogin(page);
  const webloginPageLocator = new WebLoginPageLocator(page);
  const common = new CommonMethod(page);
  
  // Login with POM method using credentials from the scenario
  await weblogin.loginAndVerify('playo@sanu.netsferetest.org', 'Abcd@1234567');
  
  // Close the feature modal if it exists
  await common.click(webloginPageLocator.featureXButton);
  
  console.log('✓ Test passed: Successfully logged in and verified "How can I help?" label');
});