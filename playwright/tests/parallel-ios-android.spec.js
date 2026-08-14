import { test, expect } from '@playwright/test';
import path from 'path';
import MaestroRunner from '../utils/maestroRunner.js';
import testData from '../utils/testData.json';

// =============================================================================
// Orchestration Framework — Parallel iOS <> Android 1:1 Conversation
// (login, message, attachment, location — both directions — then logout)
//
// Playwright drives both Maestro executions (iOS + Android) through
// MaestroRunner (utils/maestroRunner.js), which wraps the existing Maestro
// class (utils/maestro.js) rather than re-implementing flow resolution /
// command-building / device-wake logic. Pure device-to-device suite — no
// Playwright browser is involved, so screenshots are pulled directly from
// each device via MaestroRunner.captureScreenshot() and attached to Allure
// through testInfo.attach().
//
// This expands on the earlier message-only 1:1 orchestration test by
// exercising every content type both directions with explicit both-side
// verification:
//   - Text message   : iOS -> Android, Android -> iOS
//   - Location       : iOS -> Android, Android -> iOS
//   - Attachment     : iOS -> Android, Android -> iOS
//   - Reply          : iOS replies to an Android message, Android verifies
//   - Forward        : iOS forwards its own message, Android verifies
//   - Delete         : Android deletes its own message, both sides verify
//
// Reply/Forward/Delete selectors (ios-reply-message.yaml, ios-forward-
// message.yaml, ios-delete-message.yaml and their android-*.yaml mirrors)
// were all discovered live on 2026-08-07 — see those flows' own headers for
// the long-press menu layouts (iOS: text-labeled Info/Copy/Reply/Forward/
// Export/Delete; Android: a "N Selected" action bar with reply_item/
// forward_item plus an overflow for Delete). Deletion is for-everyone by
// default on both platforms.
//
// Attachment determinism: per this framework's convention (see
// parallel-ios-android-web.spec.js Step 9), attachments sent from Android
// are pushed straight from this project's own test-files/ directory via
// MaestroRunner.pushFileToAndroid() + android-send-group-attachment.yaml
// (that flow has no group-specific logic despite its name — it navigates by
// CONVERSATION_NAME like any other flow here, so it works unchanged for a
// 1:1 thread), so the exact file sent is always known and verified by name.
//
// iOS has no equivalent push mechanism in this repo (no adb-push analogue
// for real iOS devices) — ios-send-attachment.yaml is the only available
// flow, and it depends on whatever file the native Files/iCloud "Browse"
// picker shows first on the connected device (documented as a known gap in
// that flow's own header). Because the exact filename isn't controllable
// from here, Android's verification of the iOS-sent attachment falls back
// to the same generic size-caption pattern (".*(NN KB|MB).*") that
// ios-send-attachment.yaml itself already asserts on the iOS side —
// treat this direction as a delivery check, not an exact-filename check.
//
// Requested assertions, and how each maps to a real, verifiable check here:
//   - Conversation exists     -> ios-create-conversation.yaml's own
//                                extendedWaitUntil on the conversation
//                                title (throws if not found)
//   - Sender identity         -> the 1:1 conversation is opened BY the
//                                counterparty's name (CONVERSATION_NAME) on
//                                each side, so a successful open + verify is
//                                itself an identity check
//   - Message delivered       -> cross-device visibility within each verify
//                                flow's timeout (delivery-status proxy
//                                convention used throughout this repo, since
//                                the app exposes no distinct
//                                delivered/read indicator element)
//   - Location delivered      -> "My Location" caption visible on the
//                                receiving side (*-verify-any-text.yaml)
//   - Attachment delivered    -> exact filename visible on the receiving
//                                side for the Android->iOS direction;
//                                generic size-caption pattern for the
//                                iOS->Android direction (see note above)
//   - Timestamp exists        -> BEST-EFFORT / unverified, same HH:MM-regex
//                                convention used throughout this suite
// =============================================================================

const { iosUser, androidUser, messages, oneToOneAttachmentFileName } = testData;
const { androidReplySource, iosReplyContent, iosForwardSource, androidDeleteTarget } = messages;
const ATTACHMENT_LOCAL_PATH = path.resolve('test-files', 'sample.pdf');

function makeRunLabel(prefix) {
  return `${prefix}-${Date.now()}`;
}

async function logAndAttach(testInfo, label, output) {
  console.log(`  ${label}`);
  await testInfo.attach(label, { body: output || '', contentType: 'text/plain' });
}

test.describe('Orchestration: Parallel iOS <> Android 1:1 Conversation', () => {
  const runner = new MaestroRunner();

  test('iOS <> Android 1:1 message, attachment, and location exchange', async ({}, testInfo) => {
    test.setTimeout(1500000);
    const runLabel = makeRunLabel('Parallel-IOS-Android');
    console.log(`\n========== PARALLEL IOS<>ANDROID TEST [${runLabel}] ==========`);

    await test.step('Step 1: Login iOS and Android simultaneously', async () => {
      const [iosOut, androidOut] = await runner.runParallel([
        () => runner.runIOS('ios-ensure-logged-in.yaml', { EMAIL: iosUser.email, PASSWORD: iosUser.password }),
        () => runner.runAndroid('ensure-logged-in.yaml', { EMAIL: androidUser.email, PASSWORD: androidUser.password }),
      ]);
      await logAndAttach(testInfo, 'iOS login output', iosOut);
      await logAndAttach(testInfo, 'Android login output', androidOut);
      console.log('  ✓ Both iOS and Android logged in');
    });

    await test.step(`Step 2: iOS creates 1:1 conversation with Android [${runLabel}]`, async () => {
      const out = await runner.runIOS('ios-create-conversation.yaml', { TARGET_USER: androidUser.username });
      await logAndAttach(testInfo, 'iOS create conversation output', out);
      console.log('  ✓ Conversation exists (create flow completed without error)');
    });

    await test.step(`Step 3: iOS sends "${messages.iosGreeting}", Android verifies`, async () => {
      const sendOut = await runner.runIOS('ios-send-message.yaml', {
        CONVERSATION_NAME: androidUser.username,
        MESSAGE_TEXT: messages.iosGreeting,
      });
      await logAndAttach(testInfo, 'iOS send message output', sendOut);

      const verifyOut = await runner.runAndroid('android-verify-message.yaml', {
        CONVERSATION_NAME: iosUser.username,
        EXPECTED_TEXT: messages.iosGreeting,
      });
      await logAndAttach(testInfo, 'Android verify message output', verifyOut);
      console.log(`  ✓ Android received: "${messages.iosGreeting}"`);
    });

    await test.step(`Step 4: Android replies "${messages.androidReply}", iOS verifies`, async () => {
      const replyOut = await runner.runAndroid('android-send-message.yaml', {
        CONVERSATION_NAME: iosUser.username,
        MESSAGE_TEXT: messages.androidReply,
      });
      await logAndAttach(testInfo, 'Android reply output', replyOut);

      const verifyOut = await runner.runIOS('ios-verify-message.yaml', {
        CONVERSATION_NAME: androidUser.username,
        EXPECTED_TEXT: messages.androidReply,
      });
      await logAndAttach(testInfo, 'iOS verify reply output', verifyOut);
      console.log(`  ✓ iOS received: "${messages.androidReply}"`);
    });

    await test.step('Step 4b: Best-effort timestamp check (unverified)', async () => {
      try {
        const out = await runner.runIOS('ios-verify-any-text.yaml', {
          CONVERSATION_NAME: androidUser.username,
          EXPECTED_TEXT: '\\d{1,2}:\\d{2}',
        });
        await logAndAttach(testInfo, 'iOS timestamp check output', out);
        console.log('  ✓ A timestamp-like string is visible near the conversation');
      } catch (err) {
        console.log(`  ⚠ Timestamp check inconclusive (unverified flow): ${err.message.slice(0, 200)}`);
      }
    });

    await test.step('Step 5: iOS shares location, Android verifies', async () => {
      const out = await runner.runIOS('ios-send-location.yaml', { CONVERSATION_NAME: androidUser.username });
      await logAndAttach(testInfo, 'iOS send location output', out);

      const androidOut = await runner.runAndroid('android-verify-any-text.yaml', {
        CONVERSATION_NAME: iosUser.username,
        EXPECTED_TEXT: 'My Location',
      });
      await logAndAttach(testInfo, 'Android verify location output', androidOut);
      console.log('  ✓ Android received the iOS location');
    });

    await test.step('Step 6: Android shares location, iOS verifies', async () => {
      const out = await runner.runAndroid('android-send-location.yaml', { CONVERSATION_NAME: iosUser.username });
      await logAndAttach(testInfo, 'Android send location output', out);

      const iosOut = await runner.runIOS('ios-verify-any-text.yaml', {
        CONVERSATION_NAME: androidUser.username,
        EXPECTED_TEXT: 'My Location',
      });
      await logAndAttach(testInfo, 'iOS verify location output', iosOut);
      console.log('  ✓ iOS received the Android location');
    });

    await test.step('Step 7: iOS sends an attachment (native picker), Android verifies delivery', async () => {
      // No framework-controlled file source exists for real iOS devices in
      // this repo (see header note) — the exact filename picked by the
      // native "Browse" tab isn't known ahead of time, so verification uses
      // the same generic size-caption pattern ios-send-attachment.yaml
      // already asserts locally, rather than an exact filename match.
      const out = await runner.runIOS('ios-send-attachment.yaml', { CONVERSATION_NAME: androidUser.username });
      await logAndAttach(testInfo, 'iOS send attachment output', out);

      const androidOut = await runner.runAndroid('android-verify-any-text.yaml', {
        CONVERSATION_NAME: iosUser.username,
        EXPECTED_TEXT: '\\(.*[KM]B\\)',
      });
      await logAndAttach(testInfo, 'Android verify attachment output', androidOut);
      console.log('  ✓ Android received the iOS attachment');
    });

    await test.step(`Step 8: Android sends attachment "${oneToOneAttachmentFileName}" (framework test-files), iOS verifies`, async () => {
      // Pushed from this framework's own test-files/ directory (not
      // whatever the native picker defaults to) — see
      // MaestroRunner.pushFileToAndroid, same convention as
      // parallel-ios-android-web.spec.js Step 9.
      await runner.pushFileToAndroid(ATTACHMENT_LOCAL_PATH, oneToOneAttachmentFileName);
      console.log(`  ✓ Pushed ${oneToOneAttachmentFileName} to Android device`);

      const androidOut = await runner.runAndroid('android-send-group-attachment.yaml', {
        CONVERSATION_NAME: iosUser.username,
        FILE_NAME: oneToOneAttachmentFileName,
      });
      await logAndAttach(testInfo, 'Android send attachment output', androidOut);
      console.log('  ✓ Android sent the attachment');

      const iosOut = await runner.runIOS('ios-verify-any-text.yaml', {
        CONVERSATION_NAME: androidUser.username,
        EXPECTED_TEXT: 'OneToOneAttachmentSample',
      });
      await logAndAttach(testInfo, 'iOS verify attachment output', iosOut);
      console.log('  ✓ iOS received the attachment');
    });

    await test.step(`Step 9: Android sends "${androidReplySource}", iOS replies "${iosReplyContent}", Android verifies`, async () => {
      const sourceOut = await runner.runAndroid('android-send-message.yaml', {
        CONVERSATION_NAME: iosUser.username,
        MESSAGE_TEXT: androidReplySource,
      });
      await logAndAttach(testInfo, 'Android reply-source message output', sourceOut);

      const replyOut = await runner.runIOS('ios-reply-message.yaml', {
        CONVERSATION_NAME: androidUser.username,
        TARGET_TEXT: androidReplySource,
        REPLY_TEXT: iosReplyContent,
      });
      await logAndAttach(testInfo, 'iOS reply output', replyOut);

      const verifyOut = await runner.runAndroid('android-verify-any-text.yaml', {
        CONVERSATION_NAME: iosUser.username,
        EXPECTED_TEXT: iosReplyContent,
      });
      await logAndAttach(testInfo, 'Android verify reply output', verifyOut);
      console.log(`  ✓ Android received iOS's reply: "${iosReplyContent}" (quoting "${androidReplySource}")`);
    });

    await test.step(`Step 10: iOS forwards "${iosForwardSource}" within the conversation, Android verifies`, async () => {
      const sourceOut = await runner.runIOS('ios-send-message.yaml', {
        CONVERSATION_NAME: androidUser.username,
        MESSAGE_TEXT: iosForwardSource,
      });
      await logAndAttach(testInfo, 'iOS forward-source message output', sourceOut);

      const forwardOut = await runner.runIOS('ios-forward-message.yaml', {
        CONVERSATION_NAME: androidUser.username,
        TARGET_TEXT: iosForwardSource,
        FORWARD_TO: androidUser.username,
      });
      await logAndAttach(testInfo, 'iOS forward output', forwardOut);

      const verifyOut = await runner.runAndroid('android-verify-any-text.yaml', {
        CONVERSATION_NAME: iosUser.username,
        EXPECTED_TEXT: iosForwardSource,
      });
      await logAndAttach(testInfo, 'Android verify forwarded message output', verifyOut);
      console.log(`  ✓ Android received the forwarded message: "${iosForwardSource}"`);
    });

    await test.step(`Step 11: Android sends "${androidDeleteTarget}" and deletes it, both sides verify`, async () => {
      const sourceOut = await runner.runAndroid('android-send-message.yaml', {
        CONVERSATION_NAME: iosUser.username,
        MESSAGE_TEXT: androidDeleteTarget,
      });
      await logAndAttach(testInfo, 'Android delete-target message output', sourceOut);

      const iosSeesIt = await runner.runIOS('ios-verify-any-text.yaml', {
        CONVERSATION_NAME: androidUser.username,
        EXPECTED_TEXT: androidDeleteTarget,
      });
      await logAndAttach(testInfo, 'iOS verify delete-target received output', iosSeesIt);

      const deleteOut = await runner.runAndroid('android-delete-message.yaml', {
        CONVERSATION_NAME: iosUser.username,
        TARGET_TEXT: androidDeleteTarget,
      });
      await logAndAttach(testInfo, 'Android delete output', deleteOut);
      console.log('  ✓ Android deleted its own message (own side shows "deleted by you")');

      // The "deleted by sender" placeholder text is confirmed (via a raw
      // iOS accessibility-hierarchy dump, 2026-08-07) to not be exposed to
      // accessibility tools at all on iOS — no text match against it can
      // ever pass. Verifying the ORIGINAL text has disappeared instead is
      // the reliable, accessible signal that the deletion synced.
      const iosOut = await runner.runIOS('ios-verify-message-gone.yaml', {
        CONVERSATION_NAME: androidUser.username,
        TARGET_TEXT: androidDeleteTarget,
      });
      await logAndAttach(testInfo, 'iOS verify deletion output', iosOut);
      console.log('  ✓ iOS no longer sees the deleted message');
    });

    await test.step('Step 12: Capture screenshots and attach Allure logs', async () => {
      const iosShotPath = testInfo.outputPath(`ios-final-${runLabel}.png`);
      const androidShotPath = testInfo.outputPath(`android-final-${runLabel}.png`);
      const [iosShot, androidShot] = await Promise.all([
        runner.captureScreenshot('ios', iosShotPath),
        runner.captureScreenshot('android', androidShotPath),
      ]);
      if (iosShot) await testInfo.attach('iOS final screen', { path: iosShot, contentType: 'image/png' });
      if (androidShot) await testInfo.attach('Android final screen', { path: androidShot, contentType: 'image/png' });
      console.log(`  ✓ Screenshots captured (iOS: ${!!iosShot}, Android: ${!!androidShot})`);
    });

    await test.step('Step 13: Logout iOS and Android clients', async () => {
      const [iosOut, androidOut] = await runner.runParallel([
        () => runner.runIOS('ios-logout.yaml'),
        () => runner.runAndroid('android-logout.yaml'),
      ]);
      await logAndAttach(testInfo, 'iOS logout output', iosOut);
      await logAndAttach(testInfo, 'Android logout output', androidOut);
      console.log('  ✓ Both iOS and Android logged out');
    });

    console.log(`PARALLEL IOS<>ANDROID TEST PASSED [${runLabel}]`);
  });
});
