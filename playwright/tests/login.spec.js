import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import DashboardPage from '../pages/dashboardpage.js';
import UserActivationPage from '../pages/userActivation.js';
import testData from '../utils/testData.json';

const START_INDEX = testData.userRange.startIndex ?? 151;
const END_INDEX = testData.userRange.endIndex ?? 300;
const USER_COUNT = END_INDEX - START_INDEX + 1;

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Session: ${testData.userRange.baseUserId}${START_INDEX} to ${testData.userRange.baseUserId}${END_INDEX}`);
  console.log(`${'='.repeat(60)}`);
  await page.goto(testData.appUrl.testUrl, { waitUntil: 'load', timeout: 60000 });
  await loginPage.loginNetsfere();
});

test.afterEach(async ({ page }) => {
  console.log('Cleaning up session...');
  try {
    await page.locator('text=Logout').click({ timeout: 5000 }).catch(() => {});
  } catch {}
  console.log(`${'='.repeat(60)}\n`);
});

test('Add and activate invited users', async ({ page }) => {
  test.setTimeout(18000000);

  const dashboardPage = new DashboardPage(page);
  const userActivation = new UserActivationPage(page);

  const allResults = {
    addResults: [],
    activationResults: [],
    startTime: Date.now(),
    retryCount: 0,
  };

  // ================================
  // PHASE 1: ADD USERS
  // ================================
  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASE 1: ADD USERS');
  console.log(`${'='.repeat(60)}`);
  console.log(`Range: ${testData.userRange.baseUserId}${START_INDEX} to ${testData.userRange.baseUserId}${END_INDEX}`);
  console.log(`Total users to add: ${USER_COUNT}\n`);

  await dashboardPage.navigateToAddUser();

  const addResults = await dashboardPage.addUsersSequentially(
    testData.userRange.baseUserId,
    testData.userRange.emailDomain,
    START_INDEX,
    END_INDEX
  );

  allResults.addResults = addResults;

  const added = addResults.filter(r => r.success && !r.skipped).length;
  const skippedExisting = addResults.filter(r => r.skipped).length;
  const addFailed = addResults.filter(r => !r.success).length;
  const totalAddAttempts = addResults.reduce((sum, r) => sum + r.attempts, 0);
  allResults.retryCount += totalAddAttempts - addResults.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('ADD PHASE RESULTS');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Added:     ${added}`);
  console.log(`  Existed:   ${skippedExisting}`);
  console.log(`  Failed:    ${addFailed}`);
  console.log(`  Attempts:  ${totalAddAttempts}`);
  console.log(`${'='.repeat(60)}\n`);

  // ================================
  // PHASE 2: ACTIVATE USERS
  // ================================
  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASE 2: ACTIVATE USERS');
  console.log(`${'='.repeat(60)}`);

  const activationResults = await userActivation.activateAllInvitedUsers(
    testData.logincreds.password,
    added,
    (progress) => {
      if (progress.type === 'activation') {
        allResults.activationResults.push(progress);
      }
    }
  );

  allResults.activationResults = activationResults;
  const activationRetries = activationResults.reduce((sum, r) => sum + (r.attempts > 1 ? r.attempts - 1 : 0), 0);
  allResults.retryCount += activationRetries;

  // ================================
  // FINAL REPORT
  // ================================
  const totalTime = ((Date.now() - allResults.startTime) / 1000).toFixed(1);
  const activated = activationResults.filter(r => r.success).length;
  const activationFailed = activationResults.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL REPORT');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Range:           ${testData.userRange.baseUserId}${START_INDEX} - ${testData.userRange.baseUserId}${END_INDEX}`);
  console.log(`  Total Users:     ${USER_COUNT}`);
  console.log(`  Execution Time:  ${totalTime}s`);
  console.log(`  ────────────────────────────`);
  console.log(`  Added:           ${added}`);
  console.log(`  Already Existed: ${skippedExisting}`);
  console.log(`  Add Failures:    ${addFailed}`);
  console.log(`  ────────────────────────────`);
  console.log(`  Activated:       ${activated}`);
  console.log(`  Activation Fail: ${activationFailed}`);
  console.log(`  ────────────────────────────`);
  console.log(`  Retry Attempts:  ${allResults.retryCount}`);
  console.log(`${'='.repeat(60)}`);

  if (addFailed > 0) {
    console.log(`\nAdd failures:`);
    addResults.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.username}: ${r.error?.substring(0, 80)}`);
    });
  }

  if (activationFailed > 0) {
    console.log(`\nActivation failures:`);
    activationResults.filter(r => !r.success).forEach((r, i) => {
      if (i < 10) console.log(`  - Row ${r.rowIndex}: ${r.error?.substring(0, 80)}`);
    });
    if (activationFailed > 10) console.log(`  ... and ${activationFailed - 10} more`);
  }

  if (addFailed > 0 || activationFailed > 0) {
    console.log(`\nWARNING: Some operations failed. Review logs above.`);
  }

  expect(activationFailed).toBe(0);
});

test('Activate all existing invited users', async ({ page }) => {
  test.setTimeout(7200000);

  const userActivation = new UserActivationPage(page);

  const activationResults = await userActivation.activateAllInvitedUsers(
    testData.logincreds.password
  );

  const failureCount = activationResults.filter(r => !r.success).length;
  const successCount = activationResults.filter(r => r.success).length;
  console.log(`\nActivation complete: ${successCount} success, ${failureCount} failure`);

  expect(failureCount).toBe(0);
});
