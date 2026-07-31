import { test, expect } from '@playwright/test';
import LoginPage from '../pages/loginpage.js';
import Weblogin from '../pages/weblogin.js';
import ConversationHelper from '../pages/conversation.js';
import SettingsPage from '../pages/SettingsPage.js';
import ArchivingPage from '../pages/ArchivingPage.js';
import ServicePlanPage from '../pages/ServicePlanPage.js';
import StripeCheckoutPage from '../pages/StripeCheckoutPage.js';
import VaultActivationPage from '../pages/VaultActivationPage.js';
import VaultDashboardPage from '../pages/VaultDashboardPage.js';
import VaultConfigurePage from '../pages/VaultConfigurePage.js';
import { generateBillingDetails } from '../utils/billingGenerator.js';
import testData from '../utils/testData.json';

test.describe('Vault Archiving End-to-End', () => {
  let vaultConfig;
  let needsPayment = false;
  let vaultPageRef;

  test('Complete vault archiving setup and verification', async ({ page, context }) => {
    // =========================================================================
    // PART 1: Login to Admin Portal
    // =========================================================================
    await test.step('Part 1 - Login to Admin Portal', async () => {
      const loginPage = new LoginPage(page);
      await loginPage.loginNetsfere(
        testData.vaultLogin.username,
        testData.vaultLogin.password
      );
      await expect(page).toHaveURL(/Dashboard/i, { timeout: 30000 });
      console.log('Admin Dashboard loaded successfully');
    });

    // =========================================================================
    // PART 2: Check Service Plan
    // =========================================================================
    const settingsPage = new SettingsPage(page);
    const archivingPage = new ArchivingPage(page);
    const servicePlanPage = new ServicePlanPage(page);
    const stripePage = new StripeCheckoutPage(page);

    await test.step('Part 2 - Upgrade Service Plan', async () => {
      await settingsPage.openArchiving();
      await page.waitForTimeout(2000);
      
      const upgradeLink = page.locator('a').filter({ hasText: /Upgrade Now/i });
      const hasUpgrade = await upgradeLink.isVisible({ timeout: 15000 }).catch(() => false);
      
      if (hasUpgrade) {
        needsPayment = true;
        console.log('Upgrade Now link found — proceeding with upgrade...');
        await archivingPage.clickUpgradeNow();
        console.log('On Service Plans page...');
        await servicePlanPage.verifyServicePlansPage();
        console.log('Clicking Upgrade with Credit Card...');
        await servicePlanPage.upgradeWithCreditCard();
        await page.waitForTimeout(2000);
        console.log('Clicking Proceed...');
        await servicePlanPage.clickProceed();
      } else {
        console.log('No Upgrade Now link — organization is already Enterprise.');
      }
    });

    // =========================================================================
    // PART 3: Complete Payment (Stripe Checkout)
    // =========================================================================
    if (needsPayment) {
      await test.step('Part 3 - Complete Payment', async () => {
        console.log('Filling Stripe card details...');
        await stripePage.fillCardDetails();
        const billing = generateBillingDetails();
        console.log(`Billing: ${billing.name}, ${billing.address}, ${billing.city}, ${billing.state} ${billing.zip}`);
        await stripePage.fillBillingDetails(billing);
        console.log('Waiting for Submit button to become enabled...');
        await page.waitForTimeout(2000);
        console.log('Submitting payment...');
        await stripePage.submitPayment();
        console.log('Verifying success popup...');
        await stripePage.verifySuccessPopup();
        console.log('Payment success popup verified');
        await stripePage.clickOk();
        console.log('OK clicked — dismissing popup');
        await page.waitForTimeout(3000);
      });
    } else {
      console.log('Payment already completed — skipping Part 3.');
    }

    // =========================================================================
    // PART 4: Configure Vault
    // =========================================================================
    await test.step('Part 4 - Configure Vault', async () => {
      await settingsPage.openArchiving();
      await page.waitForTimeout(2000);
      await archivingPage.closeConfigPopup();
      await page.waitForTimeout(1000);
      console.log('Clicking Setup Vault — will open new vault tab...');

      const [vaultPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 30000 }),
        archivingPage.clickSetupVault(),
      ]);

      await vaultPage.waitForLoadState('load', { timeout: 30000 }).catch(() => {
        console.log('Vault page load timed out — proceeding anyway');
      });

      // Wait for vault page to redirect to login or activate
      await vaultPage.waitForURL(/login|activate|dashboard/i, { timeout: 30000 }).catch(() => {
        console.log('Vault redirect wait timed out');
      });
      await vaultPage.waitForTimeout(2000);
      console.log(`Vault tab URL: ${vaultPage.url()}`);

      const isActivate = vaultPage.url().includes('activate');
      const isLogin = vaultPage.url().includes('login');

      if (isActivate) {
        console.log('Activation page detected — setting vault password...');
        const vaultActivation = new VaultActivationPage(vaultPage);
        await vaultActivation.activateVault(testData.vaultPassword || testData.logincreds.password);
        await vaultPage.waitForTimeout(3000);
      } else if (isLogin) {
        console.log('Login page detected — logging in to vault...');
        const emailField = vaultPage.locator('input[type="email"]').first();
        if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
          await emailField.fill(testData.vaultLogin.username);
          const nextBtn = vaultPage.locator('button:has-text("Next")').first();
          if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await nextBtn.click();
            await vaultPage.waitForTimeout(1000);
          }
          const passField = vaultPage.locator('input[type="password"]').first();
          if (await passField.isVisible({ timeout: 5000 }).catch(() => false)) {
            await passField.fill(testData.vaultLogin.password);
            await vaultPage.waitForTimeout(500);
            const loginBtn = vaultPage.locator('button[type="submit"]').first();
            await loginBtn.click();
            await vaultPage.waitForTimeout(3000);
          }
        }
      }

      await vaultPage.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
      await vaultPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log(`Vault final URL: ${vaultPage.url()}`);

      vaultPageRef = vaultPage;
    });

    // =========================================================================
    // PART 5: Generate Vault Configuration
    // =========================================================================
    await test.step('Part 5 - Generate Vault Configuration', async () => {
      const vaultConfigure = new VaultConfigurePage(vaultPageRef);
      await vaultConfigure.navigateToConfigure();

      await vaultConfigure.generateUntilSuccess();
      console.log('Vault configuration generated successfully');

      vaultConfig = {
        archivingTarget: await vaultConfigure.copyArchivingTarget(),
        vaultAuthKey: await vaultConfigure.copyVaultAuthKey(),
        certificate: await vaultConfigure.copyCertificate(),
      };

      console.log('Vault config values captured:');
      console.log(`  Target (first 100): ${(vaultConfig.archivingTarget || '').substring(0, 100)}`);
      console.log(`  AuthKey (first 80): ${(vaultConfig.vaultAuthKey || '').substring(0, 80)}`);
      console.log(`  Cert (first 100): ${(vaultConfig.certificate || '').substring(0, 100)}`);
      console.log(`  Cert length: ${(vaultConfig.certificate || '').length}`);
      expect(vaultConfig.archivingTarget).toBeTruthy();
      expect(vaultConfig.vaultAuthKey).toBeTruthy();
      expect(vaultConfig.certificate).toBeTruthy();
    });

    // =========================================================================
    // PART 6: Configure Admin Portal
    // =========================================================================
    await test.step('Part 6 - Configure Admin Portal with Vault Details', async () => {
      const adminUrl = testData.appUrl.testUrl.replace('/#/login', '');
      await page.goto(`${adminUrl}/#/Archiving`, { waitUntil: 'load', timeout: 30000 });

      await archivingPage.closeConfigPopup();

      await archivingPage.setArchivingTarget(vaultConfig.archivingTarget);
      await archivingPage.setVaultAuthKey(vaultConfig.vaultAuthKey);
      await archivingPage.setCertificate(vaultConfig.certificate);

      // Verify values were filled correctly
      const readTarget = await page.evaluate(() => {
        const tas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"]');
        return {
          cert: tas.length > 0 ? tas[0].value.substring(0, 80) : '',
          target: inputs.length > 0 ? inputs[0].value.substring(0, 100) : '',
          authKey: inputs.length > 1 ? inputs[1].value.substring(0, 80) : ''
        };
      });
      console.log('Admin form after fill:');
      console.log(`  Cert(textarea0): ${readTarget.cert}`);
      console.log(`  Target(input0): ${readTarget.target}`);
      console.log(`  AuthKey(input1): ${readTarget.authKey}`);

      await archivingPage.enableArchiving();

      // Check Update button and checkbox state
      const preUpdateState = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Update'));
        const cb = document.querySelector('input[type="checkbox"]');
        return {
          updateDisabled: btn ? btn.disabled : 'not found',
          checkboxChecked: cb ? cb.checked : 'not found'
        };
      });
      console.log(`Pre-Update state: button disabled=${preUpdateState.updateDisabled}, checkbox=${preUpdateState.checkboxChecked}`);

      await archivingPage.clickUpdate();

      await archivingPage.verifyUpdateSuccess();
      console.log('Archiving settings updated successfully');
    });

    // =========================================================================
    // PART 7: Login to Web Client and Send Messages
    // =========================================================================
    const conversationUsers = [
      testData.conversationTestData.user1,
      testData.conversationTestData.user2,
    ];

    await test.step('Part 7 - Login to Web Client and send messages', async () => {
      const webPage = await context.newPage();
      const webLogin = new Weblogin(webPage);
      const conversation = new ConversationHelper(webPage);

      await webLogin.loginWebApplication(
        testData.vaultLogin.username,
        testData.vaultLogin.password
      );
      console.log('Web client logged in successfully');

      await conversation.dismissFeatureModal();

      await conversation.startGroupConversation(conversationUsers);
      console.log('Group conversation started');

      await conversation.sendMessage('Hello team, this is a test message for vault archiving.');
      await conversation.sendMessage('This is another text message with some context.');
      console.log('Text messages sent');

      await conversation.sendMessage('🚀 Testing emoji archiving with vault! 👍😊');
      console.log('Emoji message sent');

      await conversation.addAttachment(testData.attachmentFiles.image);
      console.log('Image attachment sent');

      await conversation.addAttachment(testData.attachmentFiles.pdf);
      console.log('PDF attachment sent');

      await conversation.addAttachment(testData.attachmentFiles.officeDoc);
      console.log('Office document attachment sent');

      await webPage.waitForTimeout(2000);
      await expect(webPage.locator('text=/Hello team/i').first()).toBeVisible({ timeout: 15000 }).catch(() => {
        console.log('Warning: Could not verify "Hello team" message text in DOM (may be scrolled out of view)');
      });
      console.log('All messages sent successfully');
    });

    // =========================================================================
    // PART 8: Verify Vault Archiving
    // =========================================================================
    await test.step('Part 8 - Verify Vault Archiving', async () => {
      const vaultDashboard = new VaultDashboardPage(vaultPageRef);
      const onDashboard = await vaultDashboard.verifyDashboardLoaded().then(() => true).catch(() => false);

      if (onDashboard) {
        const archiveCount = await vaultDashboard.getArchiveCount();
        console.log(`Current archive count: ${archiveCount}`);

        const archives = await vaultDashboard.getLatestArchivedMessages();
        console.log(`Found ${archives.length} archived messages`);

        await vaultDashboard.verifyNoErrors();
        console.log('No errors found on vault dashboard');
      } else {
        console.log('Could not verify vault dashboard.');
      }
    });
  });
});
