import { test, expect } from '@playwright/test';
import Weblogin from '../pages/weblogin.js';
import ConversationHelper from '../pages/conversation.js';
import ConversationDetailsPage from '../pages/conversationDetails.js';
import WebLoginPageLocator from '../locators/weblogin.locator.js';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';
import { generateConversationPlan } from '../utils/messageGenerator.js';
import { appendSummaryRun } from '../utils/summaryExcelLogger.js';

// ---------------------------------------------------------------------------
// Configuration — every knob below is overridable via env var so one spec
// covers the full 50-5000 message range without editing this file.
//   MESSAGE_COUNT=5000 MESSAGE_DELAY_MS=200 GROUP_NAME="AI Discussion" \
//     SUMMARY_TIMEOUT=240000 npx playwright test AIConversationSummary.spec.js
// ---------------------------------------------------------------------------
const CFG = testData.AIConversationSummary;

function readIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number, got "${raw}"`);
  return value;
}

const MESSAGE_COUNT = readIntEnv('MESSAGE_COUNT', CFG.defaultMessageCount);
const MESSAGE_DELAY_MS = readIntEnv('MESSAGE_DELAY_MS', CFG.defaultMessageDelayMs);
const SUMMARY_TIMEOUT = readIntEnv('SUMMARY_TIMEOUT', CFG.defaultSummaryTimeoutMs);
const GROUP_NAME = process.env.GROUP_NAME || `${CFG.groupNamePrefix} ${Date.now()}`;
const CHECKPOINT_INTERVAL = CFG.checkpointInterval;
const TOPIC_BLOCK_SIZE = CFG.topicBlockSize;

const PASSWORD = testData.logincreds.password;
const EMAIL_DOMAIN = testData.logincreds.email;

// 10 users sourced from the framework's existing conversation test data
// (nutriglow1..nutriglow10), not hardcoded credentials.
const USERS = Array.from({ length: 10 }, (_, i) => {
  const username = testData.conversationTestData[`user${i + 1}`];
  return {
    label: `User${String(i + 1).padStart(2, '0')}`,
    username,
    email: `${username}${EMAIL_DOMAIN}`,
  };
});

test.describe('High-volume group conversation with AI summary', () => {
  test('10 users exchange messages round-robin and the owner generates a 1-day summary', async ({ browser }, testInfo) => {
    if (MESSAGE_COUNT < CFG.minMessageCount || MESSAGE_COUNT > CFG.maxMessageCount) {
      throw new Error(
        `MESSAGE_COUNT must be between ${CFG.minMessageCount} and ${CFG.maxMessageCount}, got ${MESSAGE_COUNT}`
      );
    }

    const dynamicTimeout = Math.max(
      1_800_000,
      MESSAGE_COUNT * (MESSAGE_DELAY_MS + 800) + SUMMARY_TIMEOUT + 600_000
    );
    test.setTimeout(dynamicTimeout);

    console.log(`Config: MESSAGE_COUNT=${MESSAGE_COUNT} MESSAGE_DELAY_MS=${MESSAGE_DELAY_MS} `
      + `SUMMARY_TIMEOUT=${SUMMARY_TIMEOUT} GROUP_NAME="${GROUP_NAME}"`);

    const sessions = []; // { user, context, page, helper }
    const messageFailures = [];
    const executionLog = [];
    const log = (line) => { console.log(line); executionLog.push(`[${new Date().toISOString()}] ${line}`); };

    try {
      await test.step(`Launch ${USERS.length} independent browser sessions`, async () => {
        for (const user of USERS) {
          const context = await browser.newContext();
          const page = await context.newPage();
          sessions.push({ user, context, page, helper: new ConversationHelper(page) });
        }
        expect(sessions).toHaveLength(USERS.length);
        log(`Launched ${sessions.length} browser contexts, one per user.`);
      });

      await test.step('Login all 10 users', async () => {
        await Promise.all(sessions.map((s, i) => test.step(`Login ${s.user.label} (${s.user.email})`, async () => {
          // A stagger keeps 10 real browsers from all hammering the login
          // page's render in the same instant — that simultaneous spike is
          // what pushes the app's post-login "How can I help?" placeholder
          // past Weblogin's fixed 10s wait, confirmed live via repeated runs.
          // Headed mode multiplies this badly (10 real GPU-composited windows
          // instead of 10 lightweight headless processes), so the stagger
          // needs to be wide enough to cover that too — 1.5s apart spreads
          // the full batch across ~13.5s instead of ~3.6s.
          await s.page.waitForTimeout(i * 1500);

          const webLogin = new Weblogin(s.page);
          const maxAttempts = 5;
          let lastErr;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              await webLogin.loginAndVerify(s.user.email, PASSWORD);
              await new CommonMethod(s.page).click(new WebLoginPageLocator(s.page).featureXButton).catch(() => {});
              log(`${s.user.label} logged in.`);
              return;
            } catch (err) {
              lastErr = err;
              console.warn(`${s.user.label} login attempt ${attempt}/${maxAttempts} failed: ${err.message.split('\n')[0]}`);
              // Back off with growing patience — a slow network spike needs
              // more recovery time than a one-off UI timing glitch does.
              await s.page.waitForTimeout(2000 * attempt);
            }
          }
          const shot = await s.page.screenshot().catch(() => null);
          if (shot) await testInfo.attach(`login-failure-${s.user.label}`, { body: shot, contentType: 'image/png' });
          throw new Error(`Login failed for ${s.user.label} (${s.user.email}) after ${maxAttempts} attempts: ${lastErr.message}`);
        })));
      });

      const owner = sessions[0];
      const otherUsernames = sessions.slice(1).map((s) => s.user.username);

      await test.step(`Owner (${owner.user.label}) creates the group with all 10 users`, async () => {
        const added = await owner.helper.startGroupConversation(otherUsernames, GROUP_NAME);
        const missing = otherUsernames.filter((u) => !added.includes(u));
        expect(missing, `participants not added to the group: ${missing.join(', ') || 'none'}`).toHaveLength(0);
        log(`Group "${GROUP_NAME}" created by ${owner.user.label} with ${added.length} other participants.`);
      });

      await test.step('Verify group name and participant count', async () => {
        const body = await owner.page.locator('body').textContent();
        expect(body).toContain(GROUP_NAME);

        const details = new ConversationDetailsPage(owner.page);
        await details.open();
        const participantCount = await details.getParticipantCount();
        expect(participantCount).toBe(sessions.length);
        log(`Verified group "${GROUP_NAME}" with ${participantCount} participants.`);
      });

      await test.step('Open the group conversation on all other 9 sessions', async () => {
        const results = await Promise.all(sessions.slice(1).map((s) => s.helper.reloadUntilVisible(GROUP_NAME, 30000)));
        results.forEach((found, i) => expect(found, `${sessions[i + 1].user.label}: group conversation "${GROUP_NAME}" visible`).toBeTruthy());
        log('All 10 sessions have the group conversation open and ready.');
      });

      const plan = generateConversationPlan(MESSAGE_COUNT, TOPIC_BLOCK_SIZE);
      log(`Generated ${plan.length} realistic messages across ${new Set(plan.map((m) => m.topic)).size} topics.`);

      await test.step(`Send ${MESSAGE_COUNT} messages round-robin across 10 users`, async () => {
        for (let i = 0; i < plan.length; i++) {
          const msg = plan[i];
          const sender = sessions[i % sessions.length];

          try {
            await sender.helper.sendMessage(msg.text);
            if (MESSAGE_DELAY_MS > 0) await sender.page.waitForTimeout(MESSAGE_DELAY_MS);
          } catch (err) {
            const failure = { index: msg.index, user: sender.user.label, topic: msg.topic, text: msg.text, error: err.message };
            messageFailures.push(failure);
            console.error(
              `Message ${failure.index} failed | User: ${failure.user} | Topic: ${failure.topic} | Error: ${failure.error}`
            );
          }

          if (msg.index % CHECKPOINT_INTERVAL === 0) {
            console.log(`Messages sent: ${msg.index}/${MESSAGE_COUNT}`);
            const composerVisible = await sender.page.locator('textarea').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (!composerVisible) {
              console.warn(`Checkpoint warning: composer not visible for ${sender.user.label} at message ${msg.index}`);
            }
          }
        }

        log(`Finished sending. ${plan.length - messageFailures.length}/${plan.length} messages sent successfully.`);

        if (messageFailures.length > 0) {
          await testInfo.attach('message-send-failures', {
            body: JSON.stringify(messageFailures, null, 2),
            contentType: 'application/json',
          });
        }
        // Real-time delivery can lag briefly on a remote client; a small
        // failure rate from transient UI timing is tolerated, not a hard 0.
        expect(messageFailures.length, `Too many message failures: ${messageFailures.length}/${plan.length}`)
          .toBeLessThan(Math.max(1, plan.length * 0.02));
      });

      await test.step('Spot-check real-time delivery of the last messages', async () => {
        // Pick a recipient offset far enough from the last few senders (round
        // robin) that it's guaranteed not to be one of the senders being checked.
        const lastSenderIndex = (plan.length - 1) % sessions.length;
        const recipient = sessions[(lastSenderIndex + 5) % sessions.length];
        const lastMessages = plan.slice(-3);
        for (const msg of lastMessages) {
          const delivered = await recipient.helper.waitForIncomingMessage(msg.text, 30000);
          expect(delivered, `message ${msg.index} visible on ${recipient.user.label}`).toBeTruthy();
        }
        log('Confirmed the last 3 messages synced to another participant in real time.');
      });

      let summaryText = '';

      await test.step('Owner opens Conversation Details', async () => {
        const details = new ConversationDetailsPage(owner.page);
        await details.open();
        log(`${owner.user.label} opened Conversation Details.`);
      });

      await test.step('Owner clicks Summarize and requests the 1-day summary', async () => {
        const details = new ConversationDetailsPage(owner.page);
        await details.generateOneDaySummary();
        log('Requested "Generate 1 day Summary".');
      });

      await test.step(`Wait for summary generation to complete (timeout ${SUMMARY_TIMEOUT}ms)`, async () => {
        const details = new ConversationDetailsPage(owner.page);
        try {
          summaryText = await details.waitForSummary(SUMMARY_TIMEOUT);
        } catch (err) {
          const shot = await owner.page.screenshot().catch(() => null);
          if (shot) await testInfo.attach('summary-generation-failure', { body: shot, contentType: 'image/png' });
          await testInfo.attach('summary-failure-context', {
            body: `URL: ${owner.page.url()}\nError: ${err.message}`,
            contentType: 'text/plain',
          });
          throw err;
        }
        log(`Summary generated (${summaryText.length} chars).`);
      });

      await test.step('Validate the summary is meaningful and reflects the 1-day period', async () => {
        const details = new ConversationDetailsPage(owner.page);
        expect(await details.isSummaryVisible()).toBeTruthy();
        expect(summaryText.length).toBeGreaterThan(20);
        expect(/generating|please wait|failed|error/i.test(summaryText)).toBeFalsy();
        expect(await details.isOneDayPeriod(), 'summary card confirms the 1-day period').toBeTruthy();

        await testInfo.attach('conversation-summary-text', { body: summaryText, contentType: 'text/plain' });
      });

      await test.step('Log summary to testdata/summary-runs.xlsx', async () => {
        const workbookPath = await appendSummaryRun({
          timestamp: new Date().toISOString(),
          groupName: GROUP_NAME,
          messageCount: MESSAGE_COUNT,
          summary: summaryText,
        });
        log(`Appended run to ${workbookPath}`);
      });

    } finally {
      await test.step('Capture final screenshot and execution log', async () => {
        if (sessions[0]) {
          const shot = await sessions[0].page.screenshot({ fullPage: false }).catch(() => null);
          if (shot) await testInfo.attach('final-state', { body: shot, contentType: 'image/png' });
        }
        await testInfo.attach('execution-log', { body: executionLog.join('\n'), contentType: 'text/plain' });
      });

      await test.step('Close all 10 browser contexts', async () => {
        for (const s of sessions) {
          await s.context.close().catch(() => {});
        }
      });
    }
  });
});
