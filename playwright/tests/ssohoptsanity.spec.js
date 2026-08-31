import { test, expect } from '@playwright/test';
import ConversationHelper from '../pages/conversation.js';
import ConversationDetailsPage from '../pages/conversationDetails.js';
import Weblogin from '../pages/weblogin.js';
import testData from '../utils/testData.json';
import path from 'path';

// Which SSO identity provider to run against is chosen ONCE, at the start of
// the run, via SSO_PROVIDER=azure|adfs (defaults to azure) — e.g.:
//   SSO_PROVIDER=adfs npx playwright test tests/ssohoptsanity.spec.js
// Everything below (creds, conversation participants, which Weblogin login
// method gets called) derives from this single switch, so the rest of the
// flow is identical for both providers.
const SSO_PROVIDER = (process.env.SSO_PROVIDER || 'azure').toLowerCase();
if (!['azure', 'adfs'].includes(SSO_PROVIDER)) {
  throw new Error(`SSO_PROVIDER must be "azure" or "adfs", got: "${SSO_PROVIDER}"`);
}
const credsKey = SSO_PROVIDER === 'adfs' ? 'adfsssologincreds' : 'azuressologincreds';
const convKey = SSO_PROVIDER === 'adfs' ? 'adfsssoconversationTestData' : 'azuressoconversationTestData';
const loginMethodName = SSO_PROVIDER === 'adfs' ? 'loginADFS' : 'loginSSO';

const PASSWORD = testData[credsKey].password;
const EMAIL_DOMAIN = testData[credsKey].email;

// Verified live 2026-08-29: twinkle-domain (ADFS) contacts are searchable by
// their displayed contact-list name only, which renders with a space before
// the trailing "uN" (e.g. "twinkle u2") — confirmed both for the primary
// user's own compose-header name and for participant search, which returned
// "No Contacts" for a space-free "twinkleu2" (only offering an email invite
// instead). The email address itself must NOT have that space
// ("twinkleu2@twinkle.netsferetest.org" — a literal space before "@" fails
// the app's own email-format validation and blocks login outright, confirmed
// live once testData.json's adfsssoconversationTestData values were updated
// to the space-containing display form). So: always build the email from a
// space-stripped id (safe no-op for every other account family, which never
// had spaces to begin with), and always use testData's raw value as-is for
// the display name (already correct either way per-family).
const stripSpaces = (raw) => raw.replace(/\s+/g, '');

const USERS = {
  primary: { email: `${stripSpaces(testData[credsKey].name)}${EMAIL_DOMAIN}`, displayName: testData[credsKey].name },
  user1: { email: `${stripSpaces(testData[convKey].user1)}${EMAIL_DOMAIN}`, displayName: testData[convKey].user1 },
  user2: { email: `${stripSpaces(testData[convKey].user2)}${EMAIL_DOMAIN}`, displayName: testData[convKey].user2 },
  user3: { email: `${stripSpaces(testData[convKey].user3)}${EMAIL_DOMAIN}`, displayName: testData[convKey].user3 },
};

const TEST_MESSAGES = ['Hello Team', 'Welcome everyone', 'This is HOPT Sanity Test'];

test.describe(`SSO HOPT Sanity - End-to-End Messaging Flow (${SSO_PROVIDER})`, () => {
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

  test('Complete SSO HOPT sanity scenario covering all messaging features', async () => {
    test.setTimeout(3600000);
    const GROUP_NAME = `SSO_HOPT_Sanity_Group-${SSO_PROVIDER}-${Date.now()}`;

    // =========================================================================
    // STEP 1: Login all four SSO users (parallel with single attempt each)
    // =========================================================================
    await test.step('Step 1 - Login all four SSO users', async () => {
      await Promise.all(Object.entries(USERS).map(async ([key, user]) => {
        const webLogin = new Weblogin(pages[key]);
        await webLogin[loginMethodName](user.email, PASSWORD);
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
        GROUP_NAME
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
      await conversations.primary.openConversationByText(GROUP_NAME, 10000);

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        const opened = await conv.openConversationByText(GROUP_NAME, 30000);
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
      await convP.openConversationByText(GROUP_NAME, 15000);
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
      await convP.openConversationByText(GROUP_NAME, 10000);

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
      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.shareLocation();
      const shared = await convP.verifyLocationReceived(20000);
      expect(shared).toBeTruthy();

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        await conv.openConversationByText(GROUP_NAME, 20000);
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

      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.createPoll(POLL_Q, 'Yes', 'No');
      const pollCreated = await convP.verifyPollResult(POLL_Q, 'Yes', 15000);
      expect(pollCreated).toBeTruthy();

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        await conv.openConversationByText(GROUP_NAME, 20000);
        const received = await conv.verifyPollResult(POLL_Q, 'Yes', 20000);
        expect(received).toBeTruthy();
      }));

      await Promise.all(Object.entries(votes).map(async ([key, opt]) => {
        await conversations[key].openConversationByText(GROUP_NAME, 10000);
        await conversations[key].votePoll(opt);
      }));

      await convP.openConversationByText(GROUP_NAME, 10000);
      const resultVisible = await convP.verifyPollResult(POLL_Q, 'Yes', 10000);
      expect(resultVisible).toBeTruthy();
    });

    // =========================================================================
    // STEPS 10-13: Audio call, screen share, end call
    // =========================================================================
    await test.step('Steps 10-13 - Audio call, screen share, end call', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText(GROUP_NAME, 10000);

      const [, callConnected] = await Promise.all([
        Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
          const conv = conversations[key];
          await conv.dismissFeatureModal();
          await conv.openConversationByText(GROUP_NAME, 20000);
          await conv.acceptIncomingCall(60000);
        })),
        (async () => {
          await convP.startAudioCall();
          return convP.waitForCallConnected(60000);
        })(),
      ]);
      expect(callConnected).toBeTruthy();

      await convP.startScreenShare();
      const sharingActive = await convP.isScreenSharingActive();
      expect(sharingActive).toBeTruthy();
      await pageP.waitForTimeout(800);
      await convP.stopScreenShare();

      await convP.endCall();
      await pageP.waitForTimeout(2000);
    });

    // =========================================================================
    // STEP 14: Capture the group's Conversation ID
    // =========================================================================
    await test.step('Step 14 - Capture conversation ID', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;
      const details = new ConversationDetailsPage(pageP);

      await convP.openConversationByText(GROUP_NAME, 10000);
      const conversationId = await details.getConversationId();
      expect(conversationId).toBeTruthy();
      console.log(`CONVERSATION_ID:${conversationId}`);
    });
  });
});
