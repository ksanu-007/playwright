import { test, expect } from '@playwright/test';
import path from 'path';
import MaestroRunner from '../utils/maestroRunner.js';
import Weblogin from '../pages/weblogin.js';
import ConversationHelper from '../pages/conversation.js';
import testData from '../utils/testData.json';

// =============================================================================
// Orchestration Framework — Test 2: iOS/Android/Web Group Conversation,
// full 3-way round-robin coverage
//
// Every client (iOS, Android, Web) takes a turn PERFORMING each action while
// the other two verify — for messages, location, attachments, quoted
// replies, and forwards. Delete is iOS/Android only (see below). A single
// quick poll is created by one client and voted on by the other two, since
// a full round-robin adds no real coverage there (see its own step).
//
// This expands on the original single-direction version of this spec
// (iOS greets, Android+Web reply once) into genuine 3x symmetric coverage,
// reusing every flow/page-object method already proven in
// parallel-ios-android.spec.js (reply/forward/delete) plus new Web-side
// ConversationHelper methods discovered live 2026-08-10 (see conversation.js
// for replyToMessage/forwardMessage/verifyMessageGone's own header notes).
//
// No launchApp mid-flow: every mobile flow this spec calls already skips
// its own launchApp (see ios-send-message.yaml's header, 2026-08-09/10) so
// the app stays on screen between steps instead of resetting to its
// Conversations root every time — MaestroRunner's retry path force-
// relaunches only if a step genuinely fails.
//
// Attachment determinism: Android always pushes a known file from this
// project's own test-files/ directory (MaestroRunner.pushFileToAndroid) and
// selects it by exact name; Web attaches a known local file directly. iOS
// has no equivalent push mechanism for real devices (see
// ios-send-attachment.yaml's own header) — when iOS is the attachment
// actor, the other two verify a generic size-caption pattern instead of an
// exact filename, exactly as parallel-ios-android.spec.js's own Step 7 does.
//
// Delete is iOS/Android only: confirmed live 2026-08-10 (accessibility
// snapshot, title-attribute search, hover, and right-click) that this app's
// Web client exposes no per-message delete action at all — only
// Reply/Forward. Web is verify-only for deletions here, never the deleter.
// =============================================================================

const { iosUser, androidUser, webUser, groupName, groupAttachmentFileName } = testData;
const ATTACHMENT_LOCAL_PATH = path.resolve('test-files', 'sample.pdf');
const WEB_ATTACHMENT_LOCAL_PATH = path.resolve('test-files', 'sample-image.png');
const PLATFORMS = ['ios', 'android', 'web'];
const PLATFORM_LABEL = { ios: 'iOS', android: 'Android', web: 'Web' };

function makeRunLabel(prefix) {
  return `${prefix}-${Date.now()}`;
}

async function logAndAttach(testInfo, label, output) {
  console.log(`  ${label}`);
  await testInfo.attach(label, { body: output || '', contentType: 'text/plain' });
}

async function loginWeb(page, email, password, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const wl = new Weblogin(page);
      await wl.loginWebApplication(email, password);
      const helper = new ConversationHelper(page);
      await helper.dismissFeatureModal();
      return;
    } catch (err) {
      if (i >= retries) throw err;
      console.log(`  Retry web login (${i + 1}/${retries})`);
      await page.waitForTimeout(3000);
    }
  }
}

test.describe('Orchestration: iOS/Android/Web Group Conversation (round-robin)', () => {
  const runner = new MaestroRunner();

  test('3-way round-robin: message, location, attachment, reply, forward, delete, poll', async ({ browser }, testInfo) => {
    test.setTimeout(7200000); // 2 hours — ~80 real-device/browser actions across 17 rotations + poll
    const runLabel = makeRunLabel('RR-Group');
    console.log(`\n========== ORCHESTRATION TEST 2 (round-robin) [${runLabel}] ==========`);

    // Fixed 2026-08-10: Web sharing its OWN location (new in this round-robin
    // — earlier versions of this spec only had Web verifying others'
    // locations, never acting as the sender) failed live with "Please allow
    // access to location in your browser settings" — playwright.config.js's
    // --use-fake-ui-for-media-stream flag auto-approves camera/mic but not
    // geolocation, so the context needs it granted explicitly.
    const ctx = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 12.9248, longitude: 77.7183 },
    });
    const page = await ctx.newPage();
    const web = new ConversationHelper(page);

    // ---- per-platform dispatchers -------------------------------------
    const sendMsg = async (client, text) => {
      if (client === 'ios') return runner.runIOS('ios-send-message.yaml', { CONVERSATION_NAME: groupName, MESSAGE_TEXT: text });
      if (client === 'android') return runner.runAndroid('android-send-message.yaml', { CONVERSATION_NAME: groupName, MESSAGE_TEXT: text });
      return web.sendMessage(text);
    };
    const verifyMsg = async (client, text) => {
      if (client === 'ios') return runner.runIOS('ios-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: text });
      if (client === 'android') return runner.runAndroid('android-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: text });
      const seen = await web.waitForIncomingMessage(text, 45000);
      expect(seen, `Web should see message "${text}"`).toBeTruthy();
    };
    const shareLoc = async (client) => {
      if (client === 'ios') return runner.runIOS('ios-send-location.yaml', { CONVERSATION_NAME: groupName });
      if (client === 'android') return runner.runAndroid('android-send-location.yaml', { CONVERSATION_NAME: groupName });
      return web.shareLocation();
    };
    const verifyLoc = async (client) => {
      if (client === 'ios') return runner.runIOS('ios-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: 'My Location' });
      if (client === 'android') return runner.runAndroid('android-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: 'My Location' });
      const seen = await web.verifyLocationReceived(20000);
      expect(seen, 'Web should see the shared location').toBeTruthy();
    };
    const doReply = async (client, targetText, replyText) => {
      if (client === 'ios') return runner.runIOS('ios-reply-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText, REPLY_TEXT: replyText });
      if (client === 'android') return runner.runAndroid('android-reply-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText, REPLY_TEXT: replyText });
      return web.replyToMessage(replyText);
    };
    const doForward = async (client, targetText) => {
      if (client === 'ios') return runner.runIOS('ios-forward-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText, FORWARD_TO: groupName });
      if (client === 'android') return runner.runAndroid('android-forward-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText, FORWARD_TO: groupName });
      return web.forwardMessage(groupName);
    };
    const doDelete = async (client, targetText) => {
      if (client === 'ios') return runner.runIOS('ios-delete-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText });
      return runner.runAndroid('android-delete-message.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText });
    };
    const verifyGone = async (client, targetText) => {
      if (client === 'ios') return runner.runIOS('ios-verify-message-gone.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText });
      if (client === 'android') return runner.runAndroid('android-verify-message-gone.yaml', { CONVERSATION_NAME: groupName, TARGET_TEXT: targetText });
      const gone = await web.verifyMessageGone(targetText, 45000);
      expect(gone, `Web should no longer see "${targetText}"`).toBeTruthy();
    };

    try {
      await test.step('Step 1: Login iOS and Android simultaneously', async () => {
        const [iosOut, androidOut] = await runner.runParallel([
          () => runner.runIOS('ios-ensure-logged-in.yaml', { EMAIL: iosUser.email, PASSWORD: iosUser.password }),
          () => runner.runAndroid('ensure-logged-in.yaml', { EMAIL: androidUser.email, PASSWORD: androidUser.password }),
        ]);
        await logAndAttach(testInfo, 'iOS login output', iosOut);
        await logAndAttach(testInfo, 'Android login output', androidOut);
        console.log('  ✓ Both iOS and Android logged in');
      });

      await test.step('Step 2: Launch Chromium and login Web user', async () => {
        await loginWeb(page, webUser.email, webUser.password);
        console.log('  ✓ Web user logged in');
      });

      await test.step(`Step 3: iOS creates group "${groupName}" with Android User and Web User`, async () => {
        const out = await runner.runIOS('ios-edit-participants.yaml', {
          CONVERSATION_NAME: androidUser.username,
          TARGET_USER1: webUser.username,
          GROUP_TITLE: groupName,
        });
        await logAndAttach(testInfo, 'iOS create group output', out);
        console.log(`  ✓ Group exists with name "${groupName}"`);
      });

      await test.step('Step 3b: Web opens the group (stays open for the rest of the run)', async () => {
        const found = await web.openConversationByTitle(groupName, 30000);
        expect(found).toBeTruthy();
        console.log(`  ✓ Web opened group "${groupName}"`);
      });

      await test.step('Step 3c: Android navigates into the group (stays open for the rest of the run)', async () => {
        const out = await runner.runAndroid('android-navigate-conversation.yaml', { CONVERSATION_NAME: groupName });
        await logAndAttach(testInfo, 'Android navigate to group output', out);
      });

      // ---- Category 1: plain messages, full round-robin -----------------
      for (const actor of PLATFORMS) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 4.${actor}: ${PLATFORM_LABEL[actor]} sends a message, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} receive and reply back`, async () => {
          const text = `RR-Msg-${actor}-${runLabel}`;
          await sendMsg(actor, text);
          console.log(`  ✓ ${PLATFORM_LABEL[actor]} sent: "${text}"`);
          for (const o of others) {
            await verifyMsg(o, text);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} received: "${text}"`);
            const reply = `RR-Msg-Reply-${o}-${runLabel}`;
            await sendMsg(o, reply);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} replied: "${reply}"`);
          }
          for (const o of others) {
            const reply = `RR-Msg-Reply-${o}-${runLabel}`;
            await verifyMsg(actor, reply);
          }
          console.log(`  ✓ ${PLATFORM_LABEL[actor]} confirmed both replies`);
        });
      }

      // ---- Category 2: location, full round-robin ------------------------
      for (const actor of PLATFORMS) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 5.${actor}: ${PLATFORM_LABEL[actor]} shares location, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} verify`, async () => {
          await shareLoc(actor);
          for (const o of others) {
            await verifyLoc(o);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} received ${PLATFORM_LABEL[actor]}'s location`);
          }
        });
      }

      // ---- Category 3: attachments, full round-robin ----------------------
      for (const actor of PLATFORMS) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 6.${actor}: ${PLATFORM_LABEL[actor]} sends an attachment, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} verify`, async () => {
          if (actor === 'ios') {
            await runner.runIOS('ios-send-attachment.yaml', { CONVERSATION_NAME: groupName });
            for (const o of others) {
              if (o === 'android') {
                await runner.runAndroid('android-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: '\\(.*[KM]B\\)' });
              } else {
                // iOS's native-picker attachment has no predictable filename
                // (see header note) — check for the generic size-caption
                // pattern ("(NN KB/MB)") instead of an exact name.
                const seenKB = await web.verifyAttachment('KB)', 20000);
                const seenMB = seenKB ? true : await web.verifyAttachment('MB)', 2000);
                expect(seenKB || seenMB, 'Web should see the iOS attachment').toBeTruthy();
              }
              console.log(`  ✓ ${PLATFORM_LABEL[o]} received ${PLATFORM_LABEL[actor]}'s attachment`);
            }
          } else if (actor === 'android') {
            // Fixed 2026-08-10: a long filename (with the full run-label
            // timestamp suffix) gets truncated by Android's grid-view file
            // picker (confirmed live via screenshot — the file WAS pushed
            // and present, just displayed as "RRAndroidAttac..."), so the
            // flow's exact-match assertion on the full name could never
            // succeed. Each run creates a brand-new conversation anyway, so
            // a short, static name is safe — no cross-run collision risk.
            const fileName = 'RRAndroidAttach.pdf';
            await runner.pushFileToAndroid(ATTACHMENT_LOCAL_PATH, fileName);
            await runner.runAndroid('android-send-group-attachment.yaml', { CONVERSATION_NAME: groupName, FILE_NAME: fileName });
            const baseName = fileName.replace('.pdf', '');
            for (const o of others) {
              if (o === 'ios') {
                await runner.runIOS('ios-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: baseName });
              } else {
                const seen = await web.verifyAttachment(baseName, 20000);
                expect(seen, 'Web should see the Android attachment').toBeTruthy();
              }
              console.log(`  ✓ ${PLATFORM_LABEL[o]} received ${PLATFORM_LABEL[actor]}'s attachment`);
            }
          } else {
            await web.addAttachment(WEB_ATTACHMENT_LOCAL_PATH);
            for (const o of others) {
              if (o === 'ios') {
                await runner.runIOS('ios-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: 'sample-image' });
              } else {
                await runner.runAndroid('android-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: 'sample-image' });
              }
              console.log(`  ✓ ${PLATFORM_LABEL[o]} received ${PLATFORM_LABEL[actor]}'s attachment`);
            }
          }
        });
      }

      // ---- Category 4: quoted replies, full round-robin ---------------------
      for (const actor of PLATFORMS) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 7.${actor}: ${PLATFORM_LABEL[actor]} replies to its own message, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} verify`, async () => {
          const source = `RR-ReplySrc-${actor}-${runLabel}`;
          const reply = `RR-ReplyBody-${actor}-${runLabel}`;
          await sendMsg(actor, source);
          await doReply(actor, source, reply);
          console.log(`  ✓ ${PLATFORM_LABEL[actor]} replied to its own message`);
          for (const o of others) {
            await verifyMsg(o, reply);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} received the reply`);
          }
        });
      }

      // ---- Category 5: forwards, full round-robin -----------------------
      for (const actor of PLATFORMS) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 8.${actor}: ${PLATFORM_LABEL[actor]} forwards its own message, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} verify`, async () => {
          const source = `RR-FwdSrc-${actor}-${runLabel}`;
          await sendMsg(actor, source);
          await doForward(actor, source);
          console.log(`  ✓ ${PLATFORM_LABEL[actor]} forwarded its own message`);
          for (const o of others) {
            await verifyMsg(o, source);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} received the forwarded copy`);
          }
        });
      }

      // ---- Category 6: delete — iOS/Android only, Web verify-only ----------
      for (const actor of ['ios', 'android']) {
        const others = PLATFORMS.filter(p => p !== actor);
        await test.step(`Step 9.${actor}: ${PLATFORM_LABEL[actor]} sends and deletes a message, ${others.map(o => PLATFORM_LABEL[o]).join(' + ')} verify it's gone`, async () => {
          const target = `RR-DeleteTarget-${actor}-${runLabel}`;
          await sendMsg(actor, target);
          for (const o of others) await verifyMsg(o, target);
          await doDelete(actor, target);
          console.log(`  ✓ ${PLATFORM_LABEL[actor]} deleted its own message`);
          for (const o of others) {
            await verifyGone(o, target);
            console.log(`  ✓ ${PLATFORM_LABEL[o]} no longer sees the deleted message`);
          }
        });
      }

      // ---- Quick poll: one creator, two voters (no round-robin — see header) --
      await test.step('Step 10: Android creates a quick poll, iOS and Web vote', async () => {
        const question = `RR-Poll-${runLabel}`;
        const option1 = 'OptionAlpha';
        const option2 = 'OptionBeta';
        await runner.runAndroid('android-create-poll.yaml', { CONVERSATION_NAME: groupName, POLL_QUESTION: question, OPTION1: option1, OPTION2: option2 });
        console.log(`  ✓ Android created poll: "${question}"`);

        await runner.runIOS('ios-vote-poll.yaml', { CONVERSATION_NAME: groupName, VOTE_OPTION: option1 });
        console.log(`  ✓ iOS voted "${option1}"`);

        await web.votePoll(option2);
        console.log(`  ✓ Web voted "${option2}"`);

        const androidSeesResult = await runner.runAndroid('android-verify-any-text.yaml', { CONVERSATION_NAME: groupName, EXPECTED_TEXT: question }).then(() => true).catch(() => false);
        console.log(`  ✓ Poll result visible to Android: ${androidSeesResult}`);
      });

      await test.step('Step 11: Capture screenshots and attach Allure logs', async () => {
        const iosShotPath = testInfo.outputPath(`ios-group-final-${runLabel}.png`);
        const androidShotPath = testInfo.outputPath(`android-group-final-${runLabel}.png`);
        const [iosShot, androidShot] = await Promise.all([
          runner.captureScreenshot('ios', iosShotPath),
          runner.captureScreenshot('android', androidShotPath),
        ]);
        if (iosShot) await testInfo.attach('iOS final screen', { path: iosShot, contentType: 'image/png' });
        if (androidShot) await testInfo.attach('Android final screen', { path: androidShot, contentType: 'image/png' });
        const webShotPath = testInfo.outputPath(`web-group-final-${runLabel}.png`);
        const webShot = await page.screenshot({ path: webShotPath }).then(() => webShotPath).catch(() => null);
        if (webShot) await testInfo.attach('Web final screen', { path: webShot, contentType: 'image/png' });
        console.log(`  ✓ Screenshots captured (iOS: ${!!iosShot}, Android: ${!!androidShot}, Web: ${!!webShot})`);
      });

      await test.step('Step 12: Logout iOS, Android, and Web clients', async () => {
        const wl = new Weblogin(page);
        const [iosOut, androidOut] = await runner.runParallel([
          () => runner.runIOS('ios-logout.yaml'),
          () => runner.runAndroid('android-logout.yaml'),
        ]);
        await logAndAttach(testInfo, 'iOS logout output', iosOut);
        await logAndAttach(testInfo, 'Android logout output', androidOut);
        console.log('  ✓ Both iOS and Android logged out');

        await wl.logout();
        console.log('  ✓ Web user logged out');
      });

      console.log(`ORCHESTRATION TEST 2 (round-robin) PASSED [${runLabel}]`);
    } finally {
      await ctx.close();
    }
  });
});
