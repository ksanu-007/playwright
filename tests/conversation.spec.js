import { test, expect } from '@playwright/test';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import ConversationPageLocator  from '../locators/conversation.locator.js';
import LoginPage from '../pages/loginpage.js';
import { finished } from 'node:stream';
import path from 'path';


test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Initiate browser and Login userID and Password`);
   await page.goto(testData.appUrl.webUrl);
  await loginPage.loginNetsfere();  
  
});

test('Verify user can login and create conversation with message "New Test Conversation"', async ({ page }) => {
  test.setTimeout(120000); // Increase timeout for this test
  
  const conversationPageLocator = new ConversationPageLocator(page);
  const webloginPageLocator = new WebLoginPageLocator(page);
  const common = new CommonMethod(page);
  
  try {
    console.log('✓ Step 1: Closing feature modal');
    await common.click(webloginPageLocator.featureXButton);
    
    console.log('✓ Step 2: Clicking on start conversation icon');
    await common.click(conversationPageLocator.startConversation);
    
    console.log('✓ Step 3: Clicking on search user name field');
    await common.click(conversationPageLocator.searchUserName);
    
    console.log('✓ Step 3a: Typing "playou1" in search field');
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    
    console.log('✓ Step 3b: Waiting for search results to load');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 4: Selecting playou1 from search results');
    await common.click(conversationPageLocator.selectUserName);
    
    console.log('✓ Step 5: Clicking on create button');
    await common.click(conversationPageLocator.createButton);
    
    console.log('✓ Step 5a: Waiting for conversation to be created');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 6: Typing message "New Test Conversation"');
    await common.fill(conversationPageLocator.writeMessage, 'New Test Conversation');
    
    console.log('✓ Step 6a: Clicking on send button');
    await common.click(conversationPageLocator.sendButton);
    
    console.log('✓ Step 6b: Waiting for message to be sent');
    await page.waitForTimeout(5000);
    
    console.log('✅ Test Passed: Successfully created conversation and sent message "New Test Conversation"');
    
  } catch (error) {
    console.error('❌ Test Failed with error:', error.message);
    
    await page.screenshot({ path: `./test-results/conversation-failure-${Date.now()}.png` });
    throw error;
  }
});

test('Verify user create conversation', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(5000);
    await common.fill(conversationPageLocator.writeMessage, testData.logincreds.message);
    await common.click(conversationPageLocator.sendButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.AddAttachmentButton);
    await page.waitForTimeout(10000);
    await common.click(conversationPageLocator.ShareLocation);
    await page.waitForTimeout(15000);
    await common.click(conversationPageLocator.SendLocationButton);
    
});

test('Verify user copy link and send', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(5000);
    await common.fill(conversationPageLocator.writeMessage, testData.logincreds.message);
    await common.click(conversationPageLocator.sendButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.CopyLinkSecureMeet);
    await common.click(conversationPageLocator.writeMessage);
    await page.keyboard.press('Control+V');
    await common.click(conversationPageLocator.sendButton);
    await page.waitForTimeout(5000);

});

test('Verify Favorite and UnFavorite Functionality', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(5000);
    await common.fill(conversationPageLocator.writeMessage, testData.logincreds.message);
    await common.click(conversationPageLocator.sendButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.favoriteButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.unfavoriteButton);

});



test('Verify EditParticipants Functionality with Multiple users', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(5000);
    await common.fill(conversationPageLocator.writeMessage, testData.logincreds.message);
    await common.click(conversationPageLocator.sendButton);
    await common.click(conversationPageLocator.EditPArticipantsButton);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user2);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectOtherUserName);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.EditPArticipantsSaveButton);
    await common.fill(conversationPageLocator.writeMessage, testData.logincreds.message);
    await common.click(conversationPageLocator.EditPArticipantsButton);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user3);
    await page.waitForTimeout(10000);
    await common.click(conversationPageLocator.selectsecondusername);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.EditPArticipantsSaveButton);
    

});

test('Verify Record Voice Message Functionality', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.voicemessageButton);
    await page.waitForTimeout(20000);
    await common.click(conversationPageLocator.voicemessagestopButton);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.sendButton);

});

test('Verify Make a Call Functionality', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(15000);
    await common.click(conversationPageLocator.makeacallButton);
    await page.waitForTimeout(20000);
    await common.click(conversationPageLocator.endcallButton);

});

test('Verify Make Video Call Functionality', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(15000);
    await common.click(conversationPageLocator.makeavideocallButton);
    await page.waitForTimeout(20000);
    await common.click(conversationPageLocator.endvideocallButton);

});

test('Verify user can create conversation with file attachment', async ({ page }) => {
  test.setTimeout(180000); // Increase timeout for file upload
  
  const conversationPageLocator = new ConversationPageLocator(page);
  const webloginPageLocator = new WebLoginPageLocator(page);
  const common = new CommonMethod(page);
  
  try {
    console.log('✓ Step 1: Closing feature modal');
    await common.click(webloginPageLocator.featureXButton);
    
    console.log('✓ Step 2: Clicking on start conversation icon');
    await common.click(conversationPageLocator.startConversation);
    
    console.log('✓ Step 3: Clicking on search user name field');
    await common.click(conversationPageLocator.searchUserName);
    
    console.log('✓ Step 3a: Typing "playou1" in search field');
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    
    console.log('✓ Step 3b: Waiting for search results to load');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 4: Selecting playou1 from search results');
    await common.click(conversationPageLocator.selectUserName);
    
    console.log('✓ Step 5: Clicking on create button');
    await common.click(conversationPageLocator.createButton);
    
    console.log('✓ Step 5a: Waiting for conversation to be created');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 6: Typing message "New Test Conversation"');
    await common.fill(conversationPageLocator.writeMessage, 'New Test Conversation');
    
    console.log('✓ Step 6a: Clicking on send button');
    await common.click(conversationPageLocator.sendButton);
    
    console.log('✓ Step 6b: Waiting for message to be sent');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 7: Clicking on Plus icon (Add Attachment Button)');
    await common.click(conversationPageLocator.AddAttachmentButton);
    
    console.log('✓ Step 7a: Waiting for attachment menu to appear');
    await page.waitForTimeout(3000);
    
    console.log('✓ Step 8: Clicking on "From Device" button');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    try {
      await conversationPageLocator.fromDeviceButton.waitFor({ state: 'visible', timeout: 5000 });
      await common.click(conversationPageLocator.fromDeviceButton);
    } catch (error) {
      console.log(`Step 8 - From Device button not found with exact locator: ${error.message}`);
      console.log('Step 8a - Trying alternative approach: clicking any visible upload button');
      const alternativeButton = page.locator('//div[contains(text(), "Device")] | //button[contains(text(), "Device")] | //span[contains(text(), "Device")]').first();
      await alternativeButton.click({ timeout: 5000 });
    }
    
    console.log('✓ Step 8b: Waiting for file chooser to appear');
    
    console.log('✓ Step 9: Uploading eticket.pdf file');
    const filePath = path.resolve('c:\\playwright\\utils\\data', 'eticket.pdf');
    console.log(`File path: ${filePath}`);
    
    try {
      const fileChooser = await fileChooserPromise.catch(() => {
        console.log('File chooser event not triggered within timeout');
        return null;
      });
      
      if (fileChooser) {
        console.log('File chooser intercepted, setting file...');
        await fileChooser.setFiles(filePath);
        console.log(`File eticket.pdf uploaded successfully via file chooser`);
      } else {
        console.log('Fallback: Trying direct file input method');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(filePath);
        console.log('File uploaded via direct input method');
      }
    } catch (uploadError) {
      console.error(`File upload failed: ${uploadError.message}`);
      throw uploadError;
    }
    
    console.log('✓ Step 9a: Waiting for file to be attached');
    await page.waitForTimeout(5000);
    
    console.log('✓ Step 9b: Verifying attached file appears in conversation');
    await common.verifyAttachedFile(conversationPageLocator.AttachedFileName, 'eticket.pdf');
    
    console.log('✓ Step 10: Clicking send button to send the attachment');
    await common.click(conversationPageLocator.uploadSendButton);
    
    console.log('✓ Step 10a: Waiting for attachment to be sent');
    await page.waitForTimeout(5000);
    
    console.log('✅ Test Passed: Successfully created conversation with file attachment and sent it');
    
  } catch (error) {
    console.error('❌ Test Failed with error:', error.message);
   
    await page.screenshot({ path: `./test-results/conversation-file-upload-failure-${Date.now()}.png` });
    throw error;
  }
});

test('Verify Creating Poll', async ({ page }) => {
    const conversationPageLocator = new ConversationPageLocator(page);
    const webloginPageLocator = new WebLoginPageLocator(page);
    const common = new CommonMethod(page);
    await common.click(webloginPageLocator.featureXButton);
    await common.click(conversationPageLocator.startConversation);
    await common.click(conversationPageLocator.searchUserName);
    await common.fill(conversationPageLocator.searchUserName, testData.logincreds.user1);
    await page.waitForTimeout(5000);
    await common.click(conversationPageLocator.selectUserName);
    await common.click(conversationPageLocator.createButton);
    await page.waitForTimeout(15000);
    await common.click(conversationPageLocator.AddAttachmentButton);
    await page.waitForTimeout(20000);
    await common.click(conversationPageLocator.createpollButton);
    await common.fill(conversationPageLocator.enterpollquestion, testData.logincreds.pollquestion);
    await common.fill(conversationPageLocator.enteroption1, testData.logincreds.option1);
    await common.fill(conversationPageLocator.enteroption2, testData.logincreds.option2);
    await common.click(conversationPageLocator.sendButton);

});


