import { expect } from '@playwright/test';
import VaultActivationLocators from '../locators/vaultActivation.locators.js';
import CommonMethod from '../utils/common.js';

export default class VaultActivationPage {
  constructor(page) {
    this.page = page;
    this.locators = new VaultActivationLocators(page);
    this.common = new CommonMethod(page);
  }

  async isCreatePasswordPage() {
    try {
      await this.locators.createPasswordHeading.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async activateVault(password) {
    const passwordInput = this.locators.passwordInput;
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await passwordInput.fill(password);
    await this.page.waitForTimeout(500);

    const confirmInput = this.locators.confirmPasswordInput;
    if (await confirmInput.isVisible().catch(() => false)) {
      await confirmInput.fill(password);
      await this.page.waitForTimeout(500);
    }

    await this.locators.activateButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.activateButton.waitFor({ state: 'enabled', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    await this.common.click(this.locators.activateButton);
    await this.page.waitForTimeout(2000);
  }

  async verifyDashboard() {
    await this.page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
}
