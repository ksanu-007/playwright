import { test, expect } from '@playwright/test';
import ConversationHelper from '../pages/conversation.js';
import ConversationDetailsPage from '../pages/conversationDetails.js';
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
    // Fixed 2026-08-12: was a hardcoded, permanently-reused group name —
    // confirmed live via failure screenshot that it had accumulated
    // messages/polls across every run since at least Jul 27, growing large
    // enough that Primary's re-open no longer reliably rendered a just-sent
    // reply into the DOM (openConversationByText only clicks the list item,
    // it doesn't scroll-to-latest), causing isConversationTextVisible to
    // miss it. A fresh, uniquely-suffixed name per run — same convention
    // already used elsewhere in this repo (e.g. webtoandroid.spec.js's
    // makeGroup()) — gives each run an empty group instead.
    const GROUP_NAME = `HOPT_Sanity_Group-${Date.now()}`;

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
    // STEP 6: Inline reply — reply directly to the just-sent message so the
    // quote preview has a deterministic target (replyToMessage() always acts
    // on the most recent message, not one matched by content).
    // =========================================================================
    await test.step('Step 6 - Inline reply to a message', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.sendMessage('ReplyTargetMessage');
      await pageP.waitForTimeout(800);
      await convP.replyToMessage('This is an inline reply');
      await pageP.waitForTimeout(800);

      const body = await pageP.locator('body').textContent().catch(() => '');
      expect(body).toContain('ReplyTargetMessage');
      expect(body).toContain('This is an inline reply');

      await Promise.all(['user1', 'user2', 'user3'].map(async (key) => {
        const conv = conversations[key];
        await conv.dismissFeatureModal();
        await conv.openConversationByText(GROUP_NAME, 20000);
        const found = await conv.isConversationTextVisible('This is an inline reply', 20000);
        expect(found).toBeTruthy();
      }));
    });

    // =========================================================================
    // STEP 7: Send attachments
    // =========================================================================
    await test.step('Step 7 - Send attachments', async () => {
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
    // STEP 8: Forward message — forward a freshly-sent message (again, the
    // deterministic "most recent message" target) to a 1:1 with user1, then
    // have user1 verify it landed in that separate conversation.
    // =========================================================================
    await test.step('Step 8 - Forward message', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.sendMessage('ForwardTestMessage');
      await pageP.waitForTimeout(800);
      await convP.forwardMessage(USERS.user1.displayName);
      await pageP.waitForTimeout(800);

      const conv1 = conversations.user1;
      await conv1.dismissFeatureModal();
      const opened = await conv1.openConversationByUser(USERS.primary.displayName);
      expect(opened).toBeTruthy();
      const found = await conv1.isConversationTextVisible('ForwardTestMessage', 20000);
      expect(found).toBeTruthy();
    });

    // =========================================================================
    // STEP 9: Message reactions — user2 reacts to a freshly-sent message;
    // primary verifies the reaction is visible.
    // =========================================================================
    await test.step('Step 9 - React to a message', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.sendMessage('ReactionTestMessage');
      await pageP.waitForTimeout(800);

      const conv2 = conversations.user2;
      await conv2.dismissFeatureModal();
      await conv2.openConversationByText(GROUP_NAME, 20000);
      await conv2.reactToMessage('ReactionTestMessage', '+1');

      await convP.openConversationByText(GROUP_NAME, 10000);
      const reacted = await convP.bodyContains('reacted', 15000);
      expect(reacted).toBeTruthy();
    });

    // =========================================================================
    // STEP 10: Delete message — primary sends a throwaway message, deletes
    // it, and confirms it disappears both locally and for another user.
    // =========================================================================
    await test.step('Step 10 - Delete a message', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;
      const deleteText = `DeleteMeTest-${Date.now()}`;

      await convP.openConversationByText(GROUP_NAME, 10000);
      await convP.sendMessage(deleteText);
      await pageP.waitForTimeout(800);
      await convP.deleteMessage(deleteText);

      const goneForPrimary = await convP.verifyMessageGone(deleteText, 20000);
      expect(goneForPrimary).toBeTruthy();

      const conv1 = conversations.user1;
      await conv1.dismissFeatureModal();
      await conv1.openConversationByText(GROUP_NAME, 20000);
      const goneForUser1 = await conv1.verifyMessageGone(deleteText, 20000);
      expect(goneForUser1).toBeTruthy();
    });

    // =========================================================================
    // STEP 11: Share location
    // =========================================================================
    await test.step('Step 11 - Share location', async () => {
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
    // STEPS 12-13: Create poll and vote
    // =========================================================================
    await test.step('Steps 12-13 - Poll and votes', async () => {
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
    // STEPS 14-17: Audio call, screen share, end call — the call must last
    // at least 20 seconds once all participants have joined (not just once
    // primary sees "connected") before it's ended.
    // =========================================================================
    await test.step('Steps 14-17 - Audio call, screen share, end call', async () => {
      const convP = conversations.primary;
      const pageP = pages.primary;

      await convP.openConversationByText(GROUP_NAME, 10000);

      // Fixed 2026-08-20: previously only primary placed the call and nobody
      // else ever joined it, so it stayed on "Connecting..." forever — masked
      // by waitForCallConnected() wrongly reporting "connected" as soon as the
      // End-call button rendered (which happens immediately for an outgoing/
      // ringing call). Now that check waits for the real elapsed-time signal,
      // so the other group members need to actually join for the call to
      // reach that state, same Promise.all-per-user pattern used elsewhere in
      // this test.
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

      // waitForCallConnected already confirmed all participants joined
      // above — this measures from that same connection point, so whatever
      // time the screen-share steps just took already counts toward it.
      const heldFor20Seconds = await convP.waitForCallDuration(20, 40000);
      expect(heldFor20Seconds).toBeTruthy();

      await convP.endCall();
      await pageP.waitForTimeout(2000);
    });

    // =========================================================================
    // STEP 18: Capture the group's Conversation ID (consumed downstream by
    // vaultDashboard.spec.js to scope a vault report to this exact run)
    // =========================================================================
    await test.step('Step 18 - Capture conversation ID', async () => {
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
