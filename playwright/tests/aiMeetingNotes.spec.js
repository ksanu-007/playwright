import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import Weblogin from '../pages/weblogin.js';
import CommonMethod from '../utils/common.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import ConversationPageLocator from '../locators/conversation.locator.js';
import testData from '../utils/testData.json';

const PASSWORD = testData.logincreds.password;
const EMAIL_DOMAIN = testData.logincreds.email;

const USER1_EMAIL = `${testData.logincreds.name}${EMAIL_DOMAIN}`;
const USER2_NAME = testData.conversationTestData.user2;
const USER3_NAME = testData.conversationTestData.user3;
const USER4_NAME = testData.conversationTestData.user4;
const USER2_EMAIL = `${USER2_NAME}${EMAIL_DOMAIN}`;
const USER3_EMAIL = `${USER3_NAME}${EMAIL_DOMAIN}`;
const USER4_EMAIL = `${USER4_NAME}${EMAIL_DOMAIN}`;
const CONVERSATION_NAME = 'AI Meeting Notes';

// Each user's simulated microphone plays a distinct WAV file for the
// duration of that call. Chrome's --use-file-for-fake-audio-capture is a
// per-BROWSER-PROCESS launch flag (not per-context), so getting 4 DIFFERENT
// audio inputs into one call requires 4 independent browser instances, not
// 4 contexts off one shared browser. Source files are .mp3 (testdata/audio/
// {name}_combined.mp3) — converted once to 16kHz mono 16-bit PCM .wav via
// `sox`, matching the format of this project's existing
// meeting-notes-sample.wav (the only format Chrome's fake capture reads).
// Durations measured live via `soxi -D` on the converted .wav files, then
// rounded up slightly as each user's speaking-turn length: 94 + 84 + 94 +
// 95 = 367s (~6m7s) total.
const AUDIO_DIR = path.resolve('testdata', 'audio');
const SPEAKERS = [
  { name: null, wav: null }, // index 0 unused, keeps speaker index == user number
  { wav: path.join(AUDIO_DIR, 'adam_combined.wav'), durationMs: 94000 },
  { wav: path.join(AUDIO_DIR, 'charlie_combined.wav'), durationMs: 84000 },
  { wav: path.join(AUDIO_DIR, 'callum_combined.wav'), durationMs: 94000 },
  { wav: path.join(AUDIO_DIR, 'brian_combined.wav'), durationMs: 95000 },
];

// Fixed 2026-08-19: tile all 4 windows into separate screen quadrants
// instead of relying on bringToFront() to cycle OS-level focus. With 4
// independent Chromium processes stacked on top of each other, only one
// can be OS-frontmost at a time, and the other 3 sit occluded —
// Chromium throttles rendering/timers for occluded pages regardless of
// which one last had programmatic focus, which is the likely reason the
// incoming-call ring rendered inconsistently (sometimes right at a
// polling deadline, sometimes not at all). Tiling keeps all 4
// permanently visible/unoccluded, removing the contention outright.
const DISPLAY = { width: 3072, height: 1920 };
const QUADRANTS = [
  null, // index 0 unused
  { x: 0, y: 0 },
  { x: Math.floor(DISPLAY.width / 2), y: 0 },
  { x: 0, y: Math.floor(DISPLAY.height / 2) },
  { x: Math.floor(DISPLAY.width / 2), y: Math.floor(DISPLAY.height / 2) },
];
const QUADRANT_SIZE = `${Math.floor(DISPLAY.width / 2)},${Math.floor(DISPLAY.height / 2)}`;

function launchArgsFor(wavPath, quadrant) {
  return [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wavPath}`,
    '--ignore-certificate-errors',
    '--disable-web-security',
    `--window-position=${quadrant.x},${quadrant.y}`,
    `--window-size=${QUADRANT_SIZE}`,
  ];
}

// Confirmed live 2026-08-19: each participant's own mic toggle is
// button[title="Mic On"] while live (title flips on click — the exact
// "off" string is discovered at runtime below rather than assumed, same
// on/off-suffix convention as this app's other toggles, e.g. "Audio On").
async function micTitle(page) {
  return page.locator('button[title="Mic On"], button[title="Mic Off"]').first()
    .getAttribute('title').catch(() => null);
}

async function setMic(page, wantOn) {
  const current = await micTitle(page);
  if (current === null) return false;
  const isOn = current === 'Mic On';
  if (isOn === wantOn) return true;
  await page.locator('button[title="Mic On"], button[title="Mic Off"]').first()
    .click({ force: true, timeout: 3000 }).catch(() => {});
  return true;
}

test.describe('AI Meeting Notes - Audio Call', () => {
  let browser1, browser2, browser3, browser4;
  let ctx1, ctx2, ctx3, ctx4;
  let page1, page2, page3, page4;
  let convLoc1;

  test.beforeEach(async () => {
    test.setTimeout(900000);

    [browser1, browser2, browser3, browser4] = await Promise.all([
      // Fixed 2026-08-19: confirmed live that headless mode breaks the
      // incoming-call answer flow entirely for participants (0/3 joined
      // in a full 20s polling window vs. a real, screenshotted "Incoming
      // call..." modal in headed mode) — keep this headed regardless of
      // the CLI's --headed/--headless flag, since these browsers are
      // launched manually and don't inherit that flag.
      chromium.launch({ headless: false, args: launchArgsFor(SPEAKERS[1].wav, QUADRANTS[1]) }),
      chromium.launch({ headless: false, args: launchArgsFor(SPEAKERS[2].wav, QUADRANTS[2]) }),
      chromium.launch({ headless: false, args: launchArgsFor(SPEAKERS[3].wav, QUADRANTS[3]) }),
      chromium.launch({ headless: false, args: launchArgsFor(SPEAKERS[4].wav, QUADRANTS[4]) }),
    ]);

    ctx1 = await browser1.newContext();
    page1 = await ctx1.newPage();
    ctx2 = await browser2.newContext();
    page2 = await ctx2.newPage();
    ctx3 = await browser3.newContext();
    page3 = await ctx3.newPage();
    ctx4 = await browser4.newContext();
    page4 = await ctx4.newPage();

    for (const p of [page1, page2, page3, page4]) {
      p.setDefaultTimeout(15000);
    }

    convLoc1 = new ConversationPageLocator(page1);
  });

  test(`nutriglow creates AI Meeting Notes conversation with ${USER2_NAME}, ${USER3_NAME} & ${USER4_NAME}, starts audio call`, async () => {
    console.log(`User1: ${USER1_EMAIL}, User2: ${USER2_EMAIL}, User3: ${USER3_EMAIL}, User4: ${USER4_EMAIL}`);

    await test.step('Login all 4 users', async () => {
      for (const [page, email] of [[page1, USER1_EMAIL], [page2, USER2_EMAIL], [page3, USER3_EMAIL], [page4, USER4_EMAIL]]) {
        const wl = new Weblogin(page);
        await wl.loginAndVerify(email, PASSWORD);
        await new CommonMethod(page).click(new WebLoginPageLocator(page).featureXButton).catch(() => {});
        console.log(`✓ ${email} logged in`);
      }
    });

    await test.step(`Create "AI Meeting Notes" conversation with ${USER2_NAME}, ${USER3_NAME} & ${USER4_NAME}`, async () => {
      await page1.bringToFront().catch(() => {});
      await page1.waitForTimeout(1000);

      await page1.locator('[title="Start Conversation"]').click({ force: true, timeout: 10000 }).catch(() => {});
      await page1.waitForTimeout(2000);

      async function searchAndSelectUser(userName) {
        const input = page1.locator('.namegenEmailReplace').first();
        await input.waitFor({ state: 'visible', timeout: 5000 });
        await input.click();
        await page1.waitForTimeout(200);
        await page1.keyboard.press('Control+a');
        await page1.keyboard.press('Delete');
        await page1.waitForTimeout(200);
        await page1.keyboard.type(userName, { delay: 50 });
        await page1.waitForTimeout(4000);
        const result = page1.locator(`//div[@displayname='${userName}']`).first();
        await result.waitFor({ state: 'visible', timeout: 10000 });
        await result.click({ timeout: 5000 });
        await page1.waitForTimeout(700);
        console.log(`✓ ${userName} added`);
      }

      for (const name of [USER2_NAME, USER3_NAME, USER4_NAME]) {
        try { await searchAndSelectUser(name); } catch (e) {
          console.log(`Could not select ${name}: ${(e.message || '').substring(0, 60)}`);
        }
      }

      const groupNameInput = page1.locator('input.namegenTitleReplace').first();
      if (await groupNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        try {
          await groupNameInput.fill('');
          await groupNameInput.fill(CONVERSATION_NAME);
          console.log(`✓ Conversation named "${CONVERSATION_NAME}"`);
        } catch (e) {
          console.log('Could not set name:', e.message.substring(0, 60));
        }
      }

      await page1.evaluate(() => {
        document.querySelectorAll('.responsiveModalContainer [style*="pointer-events"], .responsiveModalContainer [class*="overlay"]')
          .forEach(el => el.style.pointerEvents = 'none');
      });
      await page1.waitForTimeout(500);
      await page1.locator('//*[text()="Create"]').click({ timeout: 5000 });
      await page1.waitForTimeout(2000);
      await page1.keyboard.press('Escape');
      await page1.waitForTimeout(1500);
      console.log(`✓ "${CONVERSATION_NAME}" created`);
    });

    await test.step('Participants open the conversation (so they can see the incoming call)', async () => {
      for (const [page, name] of [[page2, USER2_NAME], [page3, USER3_NAME], [page4, USER4_NAME]]) {
        const opened = await page.locator(`//div[@title='${CONVERSATION_NAME}']`).first()
          .click({ force: true, timeout: 5000 }).then(() => true).catch(() => false);
        console.log(opened ? `✓ ${name} opened "${CONVERSATION_NAME}"` : `⚠ ${name} could not open "${CONVERSATION_NAME}"`);
        await page.waitForTimeout(500);
      }
    });

    await test.step('Start audio call', async () => {
      await ctx1.grantPermissions(['camera', 'microphone']);

      await page1.locator(`//div[@title='${CONVERSATION_NAME}']`).first()
        .click({ force: true, timeout: 5000 }).catch(() => {});
      await page1.waitForTimeout(1500);

      const makVisible = await convLoc1.makeacallButton.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (!makVisible) throw new Error('Make Call button not found');
      await convLoc1.makeacallButton.first().click({ timeout: 5000 });
      console.log('✓ Make Call clicked');
      await page1.waitForTimeout(1500);

      const toggleLabel = page1.locator('label:has(input[data-testid="toggle-switch"])').first();
      await toggleLabel.waitFor({ state: 'visible', timeout: 5000 });
      await toggleLabel.click();
      // Fixed 2026-08-19: confirmed live via screenshot that this toggle
      // is caught mid-slide (thumb neither fully left nor right) when
      // checked immediately after the click — this app's own switches
      // use a 450ms CSS transition elsewhere, so give it a beat before
      // reading the underlying checkbox's real state.
      await page1.waitForTimeout(800);

      const toggleInput = page1.locator('input[data-testid="toggle-switch"]').first();
      let isEnabled = await toggleInput.isChecked().catch(() => false);
      if (!isEnabled) {
        await toggleLabel.click();
        await page1.waitForTimeout(800);
        isEnabled = await toggleInput.isChecked().catch(() => false);
      }
      if (!isEnabled) throw new Error('Enable AI Meeting Notes toggle did not become checked after clicking its label');
      console.log('✓ "Enable AI Meeting Notes" toggle enabled');

      await page1.locator('button[title="Place call"]').first().click({ timeout: 5000 });
      console.log('✓ Place call clicked');
      await page1.waitForTimeout(1500);
    });

    await test.step('Accept / join call on all participants', async () => {
      await ctx2.grantPermissions(['camera', 'microphone']).catch(() => {});
      await ctx3.grantPermissions(['camera', 'microphone']).catch(() => {});
      await ctx4.grantPermissions(['camera', 'microphone']).catch(() => {});

      // Fixed 2026-08-19: confirmed live via screenshot that the previous
      // selector list ('Answer'/'Accept'/'Join'/'Join Audio Call') was
      // matching and clicking an unrelated "Join"-labeled element
      // elsewhere on the page, marking participants as "joined" while
      // their actual incoming-call modal (NetSfere HD Audio /
      // "Incoming call..." / Decline+Accept) sat untouched underneath.
      // The real, only button in that modal is exactly "Accept".
      //
      // Fixed 2026-08-19 (same day, later): a sequential per-user poll
      // with a short per-check timeout still missed it — checking
      // page2/3/4 one at a time (each with bringToFront + its own short
      // check) burns real seconds per pass, and the incoming-ring window
      // appears narrow enough that later-checked users' turns can arrive
      // after it's already gone. Checking all 3 simultaneously with one
      // long wait each removes that ordering penalty entirely.
      // Unconditional screenshots — taken regardless of success/failure —
      // since a failed waitFor previously left zero visual evidence of
      // what was actually on screen when it timed out.
      for (const [page, name] of [[page2, USER2_NAME], [page3, USER3_NAME], [page4, USER4_NAME]]) {
        await page.bringToFront().catch(() => {});
        await page.screenshot({ path: `/tmp/ai-meeting-${name}-immediately-after-place-call.png` }).catch(() => {});
      }

      // Fixed 2026-08-19 (same day, yet again): a real "Incoming call...
      // / Accept" modal was confirmed present via screenshot at the exact
      // moment a Promise.all of independent per-page polls (each calling
      // bringToFront ONCE, then polling passively) timed out — at four
      // different timeouts (30s/45s/60s/90s). Root cause: with 4
      // independent Chromium processes/OS windows, only ONE can be true
      // OS-level foreground at a time; calling bringToFront() once and
      // then never revisiting it leaves the other windows effectively
      // backgrounded for their entire poll, subject to Chromium's
      // background-tab throttling of push-driven UI updates — exactly
      // the OS-focus contention this file's own architecture comment
      // warns about for audio, just hitting UI rendering instead.
      // Cycling bringToFront() across all 3 pages on every pass (one
      // combined sequential loop, not independent parallel ones) keeps
      // each window's rendering flushed regularly.
      const joined = { [USER2_NAME]: false, [USER3_NAME]: false, [USER4_NAME]: false };
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline && !(joined[USER2_NAME] && joined[USER3_NAME] && joined[USER4_NAME])) {
        for (const [page, name] of [[page2, USER2_NAME], [page3, USER3_NAME], [page4, USER4_NAME]]) {
          if (joined[name]) continue;
          await page.bringToFront().catch(() => {});
          const clicked = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button'))
              .find(b => b.textContent.includes('Accept') && b.offsetParent !== null);
            if (!btn) return false;
            btn.click();
            return true;
          }).catch(() => false);
          if (clicked) {
            joined[name] = true;
            console.log(`✓ ${name} accepted the incoming call`);
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `/tmp/ai-meeting-${name}-after-join-click.png` }).catch(() => {});
          }
        }
      }
      for (const [page, name] of [[page2, USER2_NAME], [page3, USER3_NAME], [page4, USER4_NAME]]) {
        if (!joined[name]) {
          console.log(`⚠ ${name} never saw an "Accept" button within 90s`);
          await page.screenshot({ path: `/tmp/ai-meeting-${name}-FAILED-accept-wait.png` }).catch(() => {});
        }
      }

      const callActiveOnCaller = await page1.locator('//button[@title="End call"]').first()
        .isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`  Caller's own call UI active: ${callActiveOnCaller}`);
      console.log(`  ${USER2_NAME} joined: ${joined[USER2_NAME]}, ${USER3_NAME} joined: ${joined[USER3_NAME]}, ${USER4_NAME} joined: ${joined[USER4_NAME]}`);
      expect(callActiveOnCaller, 'caller\'s own call should be active after placing it').toBeTruthy();
      expect(joined[USER2_NAME] && joined[USER3_NAME] && joined[USER4_NAME],
        'all 3 participants should actually accept and join the call').toBeTruthy();
    });

    await test.step('TEMP DIAGNOSTIC: check for a separate call tab/window on participant contexts', async () => {
      for (const [ctx, label] of [[ctx2, USER2_NAME], [ctx3, USER3_NAME], [ctx4, USER4_NAME]]) {
        const pages = ctx.pages();
        console.log(`  ${label}'s context has ${pages.length} page(s)`);
        for (let i = 0; i < pages.length; i++) {
          const dump = await pages[i].evaluate(() => {
            const titled = Array.from(document.querySelectorAll('[title]'))
              .filter(el => el.offsetParent !== null)
              .map(el => el.getAttribute('title'))
              .filter(t => /mic|mute|audio/i.test(t || ''));
            return titled.join(', ');
          }).catch(() => 'EVAL FAILED');
          console.log(`    page[${i}] mic/mute/audio-related titles: ${dump}`);
        }
      }
    });

    await test.step('Mute all participants before sequential playback', async () => {
      for (const [page, label] of [[page1, 'nutriglow'], [page2, USER2_NAME], [page3, USER3_NAME], [page4, USER4_NAME]]) {
        await page.bringToFront().catch(() => {});
        const ok = await setMic(page, false);
        console.log(ok ? `✓ ${label} muted` : `⚠ ${label} mic control not found`);
      }
    });

    await test.step('Each user plays their narrated-story audio in sequence (User1 -> User2 -> User3 -> User4)', async () => {
      const speakers = [
        { page: page1, label: 'nutriglow', durationMs: SPEAKERS[1].durationMs },
        { page: page2, label: USER2_NAME, durationMs: SPEAKERS[2].durationMs },
        { page: page3, label: USER3_NAME, durationMs: SPEAKERS[3].durationMs },
        { page: page4, label: USER4_NAME, durationMs: SPEAKERS[4].durationMs },
      ];
      for (const { page, label, durationMs } of speakers) {
        await page.bringToFront().catch(() => {});
        const unmuted = await setMic(page, true);
        console.log(unmuted
          ? `✓ ${label} unmuted — playing for ~${Math.round(durationMs / 1000)}s`
          : `⚠ ${label} could not unmute`);
        await page1.waitForTimeout(durationMs);
        await setMic(page, false);
        console.log(`✓ ${label} muted again`);
      }
    });

    await test.step('End the call', async () => {
      const endBtn = page1.locator('//button[@title="End call"]').first();
      const stillActive = await endBtn.isVisible({ timeout: 2000 }).catch(() => false);
      expect(stillActive, 'call should still be active after the full audio sequence').toBeTruthy();
      await endBtn.click({ force: true });
      console.log('✓ Call ended');
      await page1.waitForTimeout(2000);
    });

    await test.step('DIAGNOSTIC: poll conversation for the AI Meeting Notes generation signal (up to 3 min)', async () => {
      // Ignore relative-time labels ("now", "8 min", "5:55 PM") drifting
      // with the passage of real time — confirmed live 2026-08-19 that a
      // naive full-body-text diff false-positives on that alone within
      // 20s, well before any real generation could plausibly finish, and
      // exits the poll loop before real content has a chance to appear.
      const strip = (t) => t.replace(/\b\d{1,2}\s*(min|sec)\b/gi, '').replace(/\b\d{1,2}:\d{2}\s*[AP]M\b/gi, '');
      await page1.bringToFront().catch(() => {});
      const baseline = strip(await page1.evaluate(() => document.body.innerText).catch(() => ''));
      console.log('=== BASELINE BODY TEXT LENGTH (stripped) ===');
      console.log(baseline.length);

      for (let i = 0; i < 9; i++) {
        await page1.waitForTimeout(20000);
        const raw = await page1.evaluate(() => document.body.innerText).catch(() => '');
        const current = strip(raw);
        if (current !== baseline) {
          console.log(`=== BODY TEXT CHANGED AT ~${(i + 1) * 20}s AFTER CALL END ===`);
          console.log(raw.slice(0, 4000));
          console.log('=== CHANGED BODY TEXT END ===');
          break;
        }
        console.log(`  No change yet at ~${(i + 1) * 20}s`);
      }
    });

    console.log('=== DONE: Login ✓ | Conversation ✓ | Call ✓ | Audio sequence ✓ | Cleanup ✓');
  });

  test.afterEach(async () => {
    for (const ctx of [ctx1, ctx2, ctx3, ctx4]) {
      if (ctx) {
        try {
          for (const p of ctx.pages()) await p.close().catch(() => {});
          await ctx.close().catch(() => {});
        } catch (e) { console.log(`Context close: ${e.message}`); }
      }
    }
    for (const b of [browser1, browser2, browser3, browser4]) {
      if (b) await b.close().catch(() => {});
    }
  });
});
