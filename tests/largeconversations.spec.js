import {test, expect} from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import testData from '../utils/testData.json';
import WebLoginPageLocator from '../locators/weblogin.locator.js';


test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Initiate browser and Login userID and Password`);
   await page.goto(testData.appUrl.webUrl);
  await loginPage.loginNetsfere();  
  
});

test('Verify that user is able to create large conversations', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
        const webloginPageLocator = new WebLoginPageLocator(page);
        const common = new CommonMethod(page);
        await common.click(webloginPageLocator.featureXButton);
        await common.click(conversationPageLocator.startConversation);
        await common.click


});

