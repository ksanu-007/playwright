import { test, expect } from '@playwright/test';
import ConversationHelper from '../pages/conversation.js';
import Weblogin from '../pages/weblogin.js';
import testData from '../utils/testData.json';
import path from 'path';

const PASSWORD = testData.logincreds.password;
const EMAIL_DOMAIN = testData.logincreds.email;

const USERS = {
  primary: { email: `${testData.logincreds.name}${EMAIL_DOMAIN}`, displayName: testData.logincreds.name },
  user1: { email: `${testData.conversationTestData.user1}${EMAIL_DOMAIN}`, displayName: testData.conversationTestData.user1 },
  user2: { email: `${testData.conversationTestData.user2}${EMAIL_DOMAIN}`, displayName: testData.conversationTestData.user2 },
  user3: { email: `${testData.conversationTestData.user3}${EMAIL_DOMAIN}`, displayName: testData.conversationTestData.user3 },
};

const TEST_MESSAGES = ['Hello Team', 'Welcome everyone', 'This is HOPT Sanity Test'];

test.describe('HOPT Sanity - End-to-End Messaging Flow', () => {
  let contexts = {};
  let pages = {};
  let conversations = {};

  test.beforeEach(async ({ browser }) => {
    for (const [key] of Object.entries(USERS)) {
      contexts[key] = await browser.newContext({
        geolocation: { latitude: 40.7128, longitude: -74.0060 },
        permissions: ['geolocation', 'microphone', 'camera']
      });
      pages[key] = await contexts[key].newPage();
      conversations[key] = new ConversationHelper(pages[key]);
    }
  });

  test.afterEach(async () => {
    for (const [key] of Object.entries(USERS)) {
      if (contexts[key]) await contexts[key].close().catch(() => {});
    }
  });

  test('Complete HOPT sanity scenario covering all messaging features', async () => {
    test.setTimeout(3600000);

    // =========================================================================
    // STEP 1: Login all four users (parallel with single attempt each)
    // =========================================================================
    await test.step('Step 1 - Login all four users', async () => {
      await Promise.all(Object.entries(USERS).map(async ([key, user]) => {
        const webLogin = new Weblogin(pages[key]);
        await webLogin.loginWebApplication(user.email, PASSWORD);
        await expect(pages[key].locator('text=How can I help?').first()).toBeVisible({ timeout: 60000 });
      }));
    });

    // =========================================================================
    // STEPS 2-4: Create group, add participants, send text messages
    // =========================================================================
    await test.step('Steps 2-4 - Create group, add participants, send messages', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.dismissFeatureModal();

      // Create group conversation with all users
      await convP.startGroupConversation(
        [USERS.user1.displayName, USERS.user2.displayName, USERS.user3.displayName],
        'HOPT_Sanity_Group'
      );
      await pageP.waitForTimeout(800);
      await expect(convP.convLoc.textareaInput).toBeVisible({ timeout: 10000 });

      // Send text messages and verify each one appears
      for (const msg of TEST_MESSAGES) {
        await convP.sendMessage(msg);
        await pageP.waitForTimeout(800);
        const body = await pageP.locator('body').textContent().catch(() => '');
        expect(body).toContain(msg);
      }
    });

    // =========================================================================
    // STEP 5: Other users verify messages and reply
    // =========================================================================
    await test.step('Step 5 - Users verify and reply', async () => {
      await conversations.primary.openConversationByText('HOPT_Sanity_Group', 10000);

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        const opened = await conv.openConversationByText('HOPT_Sanity_Group', 30000);
        expect(opened).toBeTruthy();

        for (const msg of TEST_MESSAGES) {
          const found = await conv.isConversationTextVisible(msg, 20000);
          expect(found).toBeTruthy();
        }
      }));

      // Each user sends a reply
      const replies = [
        { key: 'user1', text: 'Received' },
        { key: 'user2', text: 'Thanks' },
        { key: 'user3', text: 'Looks Good' },
      ];

      await Promise.all(replies.map(async ({ key, text }) => {
        await conversations[key].sendMessage(text);
      }));

      // Primary sees all replies
      const convP = conversations.primary;
      await convP.openConversationByText('HOPT_Sanity_Group', 15000);
      for (const { text } of replies) {
        const found = await convP.isConversationTextVisible(text, 20000);
        expect(found).toBeTruthy();
      }
    });

    // =========================================================================
    // STEP 6: Send attachments
    // =========================================================================
    await test.step('Step 6 - Send attachments', async () => {
      const convP = conversations.primary;
      await convP.openConversationByText('HOPT_Sanity_Group', 10000);

      const attachments = [
        { name: 'sample-image.png', filePath: path.resolve('test-files', 'sample-image.png') },
        { name: 'sample.pdf', filePath: path.resolve('test-files', 'sample.pdf') },
        { name: 'sample.docx', filePath: path.resolve('test-files', 'sample.docx') },
      ];

      for (const att of attachments) {
        await convP.addAttachment(att.filePath);
        const attached = await convP.verifyAttachment(att.name, 30000);
        expect(attached).toBeTruthy();
      }
    });

    // =========================================================================
    // STEP 7: Share location
    // =========================================================================
    await test.step('Step 7 - Share location', async () => {
      const convP = conversations.primary;
      await convP.openConversationByText('HOPT_Sanity_Group', 10000);
      await convP.shareLocation();
      const shared = await convP.verifyLocationReceived(20000);
      expect(shared).toBeTruthy();

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        await conv.openConversationByText('HOPT_Sanity_Group', 20000);
        const received = await conv.verifyLocationReceived(20000);
        expect(received).toBeTruthy();
      }));
    });

    // =========================================================================
    // STEPS 8-9: Create poll and vote
    // =========================================================================
    await test.step('Steps 8-9 - Poll and votes', async () => {
      const convP = conversations.primary;
      const POLL_Q = 'Is HOPT working correctly?';
      const votes = { user1: 'Yes', user2: 'No', user3: 'Yes' };

      await convP.openConversationByText('HOPT_Sanity_Group', 10000);
      await convP.createPoll(POLL_Q, 'Yes', 'No');
      const pollCreated = await convP.verifyPollResult(POLL_Q, 'Yes', 15000);
      expect(pollCreated).toBeTruthy();

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        await conv.openConversationByText('HOPT_Sanity_Group', 20000);
        const received = await conv.verifyPollResult(POLL_Q, 'Yes', 20000);
        expect(received).toBeTruthy();
      }));

      await Promise.all(Object.entries(votes).map(async ([key, opt]) => {
        await conversations[key].openConversationByText('HOPT_Sanity_Group', 10000);
        await conversations[key].votePoll(opt);
      }));

      await convP.openConversationByText('HOPT_Sanity_Group', 10000);
      const resultVisible = await convP.verifyPollResult(POLL_Q, 'Yes', 10000);
      expect(resultVisible).toBeTruthy();
    });

    // =========================================================================
    // STEPS 10-13: Audio call, screen share, end call
    // =========================================================================
    await test.step('Steps 10-13 - Audio call, screen share, end call', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText('HOPT_Sanity_Group', 10000);
      await convP.startAudioCall();
      const callConnected = await convP.waitForCallConnected(60000);
      expect(callConnected).toBeTruthy();

      await convP.startScreenShare();
      await pageP.waitForTimeout(800);
      await convP.stopScreenShare();

      await convP.endCall();
      await pageP.waitForTimeout(2000);
    });
  });
});
