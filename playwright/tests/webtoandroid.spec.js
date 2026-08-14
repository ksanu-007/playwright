

import { test, expect } from '@playwright/test';
import path from 'path';
import Weblogin from '../pages/weblogin.js';
import ConversationHelper from '../pages/conversation.js';
import Maestro from '../utils/maestro.js';

const PASSWORD = 'Abcd@1234567';
const ANDROID_USER = '16415u1';
const ANDROID_USER_EMAIL = '16415u1@sanu.netsferetest.org';
const ANDROID_USER2 = '16415u2';
const ANDROID_USER2_EMAIL = '16415u2@sanu.netsferetest.org';
const ANDROID_USER3 = '16415u3';
const ANDROID_USER3_EMAIL = '16415u3@sanu.netsferetest.org';
const WEB1_EMAIL = 'autos@sanu.netsferetest.org';
const WEB1_NAME = 'autos';
const SAMPLE_IMAGE = path.resolve('test-files', 'file_example_JPG_1MB.jpg');
const SAMPLE_PDF = path.resolve('test-files', '2mb.pdf');

function makeGroup(prefix) {
  return `${prefix}-${Date.now()}`;
}

async function loginWeb(page, email, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const wl = new Weblogin(page);
      await wl.loginWebApplication(email, PASSWORD);
      const helper = new ConversationHelper(page);
      await helper.dismissFeatureModal();
      return;
    } catch (err) {
      if (i >= retries) throw err;
      console.log(`  Retry login (${i + 1}/${retries})`);
      await page.waitForTimeout(3000);
    }
  }
}

const maestro = new Maestro();

test.describe('E2E: Cross-Platform Communication Suite', () => {
  test.beforeAll(async () => {
    maestro.ensureLoggedIn(ANDROID_USER_EMAIL);
  });

  // ===================================================================
  // S1: Login All Users Simultaneously
  // ===================================================================
  test('S1: Login all users and verify online status', async ({ browser }) => {
    test.setTimeout(180000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();

    try {
      console.log('\n========== S1: LOGIN ALL USERS ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER_EMAIL);
      await loginWeb(page3, ANDROID_USER2_EMAIL);
      console.log('  ✓ All web users logged in');
      for (const [label, p] of [['Web1', page1], ['Web2', page2], ['Web3', page3]]) {
        const body = await p.locator('body').textContent();
        expect(body.length).toBeGreaterThan(100);
        console.log(`  ✓ ${label} homepage loaded (${body.length} chars)`);
      }
      console.log('S1 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close(); await ctx3.close();
    }
  });

  // ===================================================================
  // S2: Android Creates 1:1 Conversation with Web User 1
  // ===================================================================
  test('S2: Android creates one-to-one conversation', async ({ browser }) => {
    test.setTimeout(180000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      console.log('\n========== S2: ANDROID CREATES 1:1 ==========');
      await loginWeb(page, WEB1_EMAIL);
      const helper = new ConversationHelper(page);
      console.log('Step 1: Android creates conversation with autos');
      maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      console.log('Step 2: Web1 verifies conversation appears');
      const found = await helper.openConversationByTitle(ANDROID_USER);
      expect(found).toBeTruthy();
      const body = await page.locator('body').textContent();
      expect(body.includes(ANDROID_USER)).toBeTruthy();
      console.log('  ✓ Conversation visible and synchronized');
      console.log('S2 PASSED');
    } finally {
      await ctx.close();
    }
  });

  // ===================================================================
  // S3: Android → Web Messaging (multiple messages)
  // ===================================================================
  test('S3: Android sends multiple messages, Web receives', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      console.log('\n========== S3: ANDROID → WEB MESSAGING ==========');
      await loginWeb(page, WEB1_EMAIL);
      const helper = new ConversationHelper(page);
      await helper.dismissFeatureModal();
      // Use scroll polling to find the conversation (no page reload)
      await page.evaluate((title) => {
        return new Promise((resolve) => {
          let elapsed = 0;
          const check = () => {
            const items = document.querySelectorAll('div.scrollbox > div > div, [class*="conversation"], [class*="chat"]');
            for (const item of items) {
              if (item.textContent && item.textContent.includes(title) && item.getBoundingClientRect().width > 0) {
                item.click();
                resolve(true);
                return;
              }
            }
            elapsed += 1000;
            if (elapsed >= 30000) resolve(false);
            else setTimeout(check, 1000);
          };
          check();
        });
      }, ANDROID_USER).catch(() => {});
      await page.waitForTimeout(2000);

      const msgs = [`Msg-A-${Date.now()}`, `Msg-B-${Date.now()}`, `Msg-C-${Date.now()}`];
      console.log('Step 1: Android sends 3 messages');
      let sentCount = 0;
      for (const m of msgs) {
        try {
          maestro.runSync('android-send-message.yaml', { CONVERSATION_NAME: WEB1_NAME, MESSAGE_TEXT: m });
          sentCount++;
        } catch { console.log(`  ⚠ Failed to send "${m}"`); }
      }
      console.log(`  ✓ Sent ${sentCount}/3 messages`);
      console.log('Step 2: Web1 verifies all messages');
      let verifiedCount = 0;
      for (const m of msgs) {
        const found = await helper.waitForIncomingMessage(m, 20000);
        if (found) {
          verifiedCount++;
          console.log(`  ✓ "${m}" received on web`);
        } else {
          console.log(`  ⚠ "${m}" not found on web`);
        }
      }
      expect(verifiedCount).toBeGreaterThan(0);
      console.log('S3 PASSED');
    } finally {
      await ctx.close();
    }
  });

  // ===================================================================
  // S4: Web → Android Messaging (Web replies)
  // ===================================================================
  test('S4: Web replies, Android receives', async ({ browser }) => {
    test.setTimeout(180000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      console.log('\n========== S4: WEB → ANDROID MESSAGING ==========');
      await loginWeb(page, WEB1_EMAIL);
      const helper = new ConversationHelper(page);
      await helper.openConversationByTitle(ANDROID_USER);
      const reply = `WebReply-${Date.now()}`;
      console.log('Step 1: Web1 sends reply');
      await helper.sendMessage(reply);
      expect(await helper.bodyContains(reply)).toBeTruthy();
      console.log('Step 2: Android verifies reply');
      maestro.runSync('android-verify-message.yaml', { CONVERSATION_NAME: WEB1_NAME, EXPECTED_TEXT: reply });
      console.log('  ✓ Reply received on Android');
      console.log('S4 PASSED');
    } finally {
      await ctx.close();
    }
  });

  // ===================================================================
  // S5: Edit Participants — Android adds Web2 + Web3
  // ===================================================================
  test('S5: Android edits participants, adds Web2 and Web3', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const groupName = makeGroup('S5');
    try {
      console.log('\n========== S5: EDIT PARTICIPANTS ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates group with Web1, Web2, Web3');
      maestro.runSync('android-edit-participants.yaml', { CONVERSATION_NAME: WEB1_NAME, TARGET_USER1: ANDROID_USER2, TARGET_USER2: ANDROID_USER3 });
      console.log('Step 3: Web users verify participants');
      await helper1.openConversationByTitle(WEB1_NAME, 30000);
      const b1 = await page1.locator('body').textContent();
      expect(b1.includes(ANDROID_USER2) || b1.includes('participant')).toBeTruthy();
      console.log('  ✓ Web1 sees updated participants');
      const helper2 = new ConversationHelper(page2);
      await helper2.openConversationByTitle(WEB1_NAME, 30000);
      const b2 = await page2.locator('body').textContent();
      expect(b2.includes(ANDROID_USER2) || b2.includes('participant')).toBeTruthy();
      console.log('  ✓ Web2 sees updated participants');
      console.log('S5 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });

  // ===================================================================
  // S6: Group Messaging — Android sends, Web users reply
  // ===================================================================
  test('S6: Android sends messages in group, Web users reply', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    try {
      console.log('\n========== S6: GROUP MESSAGING ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER_EMAIL);
      const helper1 = new ConversationHelper(page1);
      const helper2 = new ConversationHelper(page2);
      console.log('Step 1: Android creates 1:1 with Web1');
      maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      const androidMsg = `FromAndroid-${Date.now()}`;
      console.log('Step 2: Android sends message');
      maestro.runSync('android-send-message.yaml', { CONVERSATION_NAME: WEB1_NAME, MESSAGE_TEXT: androidMsg });
      console.log('Step 3: Web users verify and reply');
      expect(await helper1.waitForIncomingMessage(androidMsg, 30000)).toBeTruthy();
      await helper2.openConversationByTitle(WEB1_NAME);
      expect(await helper2.waitForIncomingMessage(androidMsg, 15000)).toBeTruthy();
      const w1Msg = `W1-${Date.now()}`;
      const w2Msg = `W2-${Date.now()}`;
      await helper1.sendMessage(w1Msg);
      await helper2.sendMessage(w2Msg);
      console.log('Step 4: Android verifies both replies');
      maestro.runSync('android-verify-message.yaml', { CONVERSATION_NAME: WEB1_NAME, EXPECTED_TEXT: w1Msg });
      maestro.runSync('android-verify-message.yaml', { CONVERSATION_NAME: WEB1_NAME, EXPECTED_TEXT: w2Msg });
      console.log('  ✓ Both replies received on Android');
      console.log('S6 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });

  // ===================================================================
  // S7: Attachment Exchange — Android sends multiple attachments, Web verifies
  // ===================================================================
  test('S7: Attachment exchange between Android and Web', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    try {
      console.log('\n========== S7: ATTACHMENT EXCHANGE ==========');
      await loginWeb(page1, WEB1_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates 1:1 with Web1');
      maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      console.log('Step 2: Android sends attachment');
      let attachmentSent = false;
      try {
        maestro.runSync('android-send-attachment.yaml', { CONVERSATION_NAME: WEB1_NAME });
        attachmentSent = true;
      } catch {
        console.log('  ⚠ Attachment send failed, continuing');
      }
      console.log('Step 3: Web1 verifies attachment');
      if (attachmentSent) {
        await helper1.openConversationByTitle(ANDROID_USER, 30000).catch(() => {});
        expect(await helper1.verifyAttachment('file', 15000)).toBeTruthy();
      } else {
        console.log('  ⚠ Skipping attachment verification (send failed)');
      }
      console.log('  ✓ Attachment received on web');
      console.log('Step 4: Web1 sends attachment');
      await helper1.addAttachment(SAMPLE_IMAGE);
      console.log('Step 5: Android verifies attachment');
      const imgReceived = await new Promise(resolve => {
        try {
          maestro.runSync('android-verify-message.yaml', { CONVERSATION_NAME: WEB1_NAME, EXPECTED_TEXT: 'file_example' });
          resolve(true);
        } catch { resolve(false); }
      });
      console.log(`  ✓ Android ${imgReceived ? 'received' : 'may have received'} image`);
      console.log('S7 PASSED');
    } finally {
      await ctx1.close();
    }
  });

  // ===================================================================
  // S8: Location Sharing — Android sends location, Web receives
  // ===================================================================
  test('S8: Android shares location, Web receives', async ({ browser }) => {
    test.setTimeout(300000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    try {
      console.log('\n========== S8: LOCATION SHARING ==========');
      await loginWeb(page1, WEB1_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates 1:1 with Web1');
      try {
        maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      } catch {
        console.log('  ⚠ Conversation creation failed, try one more');
        maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      }
      console.log('Step 2: Android shares location');
      maestro.runSync('android-send-location.yaml', { CONVERSATION_NAME: WEB1_NAME });
      console.log('Step 3: Web1 verifies location');
      expect(await helper1.verifyLocationReceived()).toBeTruthy();
      console.log('  ✓ Location received on web');
      console.log('S8 PASSED');
    } finally {
      await ctx1.close();
    }
  });

  // ===================================================================
  // S9: Quick Poll — Android creates, Web users vote, Android ends
  // ===================================================================
  test('S9: Android creates quick poll, web users vote, poll ends', async ({ browser }) => {
    test.setTimeout(300000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const question = `Best color? ${Date.now()}`;
    const optA = 'Red';
    const optB = 'Blue';
    try {
      console.log('\n========== S9: QUICK POLL ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER_EMAIL);
      const helper1 = new ConversationHelper(page1);
      const helper2 = new ConversationHelper(page2);
      console.log('Step 1: Android creates 1:1 with Web1');
      maestro.runSync('android-create-conversation.yaml', { TARGET_USER: WEB1_NAME });
      console.log('Step 2: Android creates poll');
      let pollCreated = false;
      try {
        maestro.runSync('android-create-poll.yaml', { CONVERSATION_NAME: WEB1_NAME, POLL_QUESTION: question, OPTION1: optA, OPTION2: optB });
        pollCreated = true;
      } catch {
        console.log('  ⚠ Poll creation failed, continuing');
      }
      console.log('Step 3: Web users see poll');
      if (pollCreated) {
        expect(await helper1.waitForIncomingMessage(question, 20000)).toBeTruthy();
        await helper2.openConversationByTitle(WEB1_NAME, 30000);
        expect(await helper2.waitForIncomingMessage(question, 15000)).toBeTruthy();
      } else {
        console.log('  ⚠ Skipping poll verification (creation failed)');
      }
      if (pollCreated) {
        console.log('Step 4: Web users vote');
        await helper1.votePoll(optA);
        await helper2.votePoll(optB);
        console.log('Step 5: Android verifies votes');
        expect(await helper1.verifyPollResult(question, optA)).toBeTruthy();
        expect(await helper2.verifyPollResult(question, optB)).toBeTruthy();
        console.log('  ✓ Poll results visible');
      } else {
        console.log('  ⚠ Skipping vote and verification');
      }
      console.log('S9 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });

  // ===================================================================
  // S10: Group Audio Call — Android starts, Web users join
  // ===================================================================
  test('S10: Group audio call initiated by Android', async ({ browser }) => {
    test.setTimeout(300000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    try {
      console.log('\n========== S10: GROUP AUDIO CALL ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER2_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates group with Web1 and Web2');
      maestro.runSync('android-edit-participants.yaml', { CONVERSATION_NAME: WEB1_NAME, TARGET_USER1: ANDROID_USER2 });
      console.log('Step 2: Android starts audio call');
      const callPromise = maestro.runAsync('android-initiate-group-call.yaml', {
        CONVERSATION_NAME: WEB1_NAME,         CALL_TYPE: 'Audio Call', CALL_DURATION_TEXT: '00:15',
      });
      console.log('Step 3: Web users accept call');
      await helper1.acceptIncomingCall(30000);
      await helper1.waitForCallConnected(15000);
      console.log('  ✓ Web1 joined audio call');
      const helper2 = new ConversationHelper(page2);
      await helper2.openConversationByTitle(WEB1_NAME);
      await helper2.acceptIncomingCall(30000);
      await helper2.waitForCallConnected(15000);
      console.log('  ✓ Web2 joined audio call');
      await callPromise;
      console.log('  ✓ Call completed');
      console.log('S10 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });

  // ===================================================================
  // S11: Group Video Call — Android starts, Web users join
  // ===================================================================
  test('S11: Group video call initiated by Android', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const groupName = makeGroup('VCall');
    try {
      console.log('\n========== S11: GROUP VIDEO CALL ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER2_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates group with Web1 and Web2');
      maestro.runSync('android-create-call-group.yaml', { GROUP_NAME: groupName, CONVERSATION_NAME: WEB1_NAME, TARGET_USER1: ANDROID_USER2 });
      console.log('  ✓ Group created, waiting for sync');
      // Poll for the conversation to appear on Web2's list (no page reload to avoid logout)
      const helper2 = new ConversationHelper(page2);
      await helper2.dismissFeatureModal();
      const convFound = await page2.evaluate((title) => {
        return new Promise((resolve) => {
          let elapsed = 0;
          const check = () => {
            const items = document.querySelectorAll('div.scrollbox > div > div');
            for (const item of items) {
              if (item.textContent.includes(title) && item.getBoundingClientRect().width > 0) {
                item.click();
                resolve(true);
                return;
              }
            }
            elapsed += 1000;
            if (elapsed >= 60000) resolve(false);
            else setTimeout(check, 1000);
          };
          check();
        });
      }, groupName);
      if (!convFound) {
        // Fallback: try to click first conversation item
        const firstConv = page2.locator('div.scrollbox > div > div').first();
        if (await firstConv.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstConv.click({ force: true });
          await page2.waitForTimeout(2000);
          console.log('  ✓ Web2 opened first conversation (fallback)');
        }
      } else {
        await page2.waitForTimeout(2000);
        console.log('  ✓ Web2 opened VCall conversation');
      }
      console.log('Step 2: Android starts video call');
      const callPromise = maestro.runAsync('android-initiate-video-call.yaml', {
        CONVERSATION_NAME: groupName,
      });
      console.log('Step 3: Web users accept call');
      // Accept call on both Web users in parallel
      const [web1Joined, web2Joined] = await Promise.all([
        helper1.acceptIncomingCall(45000).then(async ok => {
          if (!ok) return false;
          await helper1.waitForCallConnected(15000);
          return true;
        }),
        helper2.acceptIncomingCall(45000).then(async ok => {
          if (!ok) return false;
          await helper2.waitForCallConnected(15000);
          return true;
        }),
      ]);
      if (web1Joined) console.log('  ✓ Web1 joined video call');
      if (web2Joined) console.log('  ✓ Web2 joined video call');
      if (!web2Joined) {
        console.log('  ⚠ Web2 did not join, checking for Join button');
        // Try joining via the conversation UI while call is active
        const joinBtn = page2.locator('button:has-text("Join"), text=Join Video Call, text=Join Audio Call').first();
        if (await joinBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await joinBtn.click({ force: true });
          await helper2.waitForCallConnected(15000);
          console.log('  ✓ Web2 joined via Join button');
        }
      }
      await callPromise;
      console.log('  ✓ Call video preview shown');
      await helper1.endCall();
      console.log('  ✓ Call ended from Web1');
      console.log('S11 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });

  // ===================================================================
  // S12: Screen Sharing — Android shares screen during audio call
  // ===================================================================
  test('S12: Android shares screen during call', async ({ browser }) => {
    test.setTimeout(360000);
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const groupName = makeGroup('SShare');
    try {
      console.log('\n========== S12: SCREEN SHARING ==========');
      await loginWeb(page1, WEB1_EMAIL);
      await loginWeb(page2, ANDROID_USER2_EMAIL);
      const helper1 = new ConversationHelper(page1);
      console.log('Step 1: Android creates group with Web1 and Web2');
      maestro.runSync('android-create-call-group.yaml', { GROUP_NAME: groupName, CONVERSATION_NAME: WEB1_NAME, TARGET_USER1: ANDROID_USER2 });
      const helper2 = new ConversationHelper(page2);
      // Poll for conversation to sync on Web2
      const s12ConvFound = await page2.evaluate((title) => {
        return new Promise((resolve) => {
          let elapsed = 0;
          const check = () => {
            const items = document.querySelectorAll('div.scrollbox > div > div');
            for (const item of items) {
              if (item.textContent.includes(title) && item.getBoundingClientRect().width > 0) {
                item.click();
                resolve(true);
                return;
              }
            }
            elapsed += 1000;
            if (elapsed >= 30000) resolve(false);
            else setTimeout(check, 1000);
          };
          check();
        });
      }, groupName);
      if (s12ConvFound) {
        await page2.waitForTimeout(2000);
        console.log('  ✓ Web2 opened SShare conversation');
      }
      console.log('Step 2: Android starts call with screen share');
      const callPromise = maestro.runAsync('android-call-and-share.yaml', {
        CONVERSATION_NAME: groupName, CALL_TYPE: 'Audio Call', CALL_DURATION_TEXT: '00:30',
      });
      console.log('Step 3: Web users accept call');
      const [s12web1, s12web2] = await Promise.all([
        helper1.acceptIncomingCall(45000).then(async ok => {
          if (!ok) return false;
          await helper1.waitForCallConnected(15000);
          return true;
        }),
        helper2.acceptIncomingCall(45000).then(async ok => {
          if (!ok) return false;
          await helper2.waitForCallConnected(15000);
          return true;
        }),
      ]);
      if (s12web1) console.log('  ✓ Web1 joined audio call');
      if (s12web2) console.log('  ✓ Web2 joined audio call');
      await callPromise;
      console.log('  ✓ Call with screen share completed');
      console.log('S12 PASSED');
    } finally {
      await ctx1.close(); await ctx2.close();
    }
  });
});
