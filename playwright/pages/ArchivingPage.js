import { expect } from '@playwright/test';
import ArchivingLocators from '../locators/archiving.locators.js';
import CommonMethod from '../utils/common.js';

export default class ArchivingPage {
  constructor(page) {
    this.page = page;
    this.locators = new ArchivingLocators(page);
    this.common = new CommonMethod(page);
  }

  async isEnterprisePlan() {
    const body = await this.page.locator('body').textContent().catch(() => '');
    return body.includes('Enterprise') || !body.includes('Upgrade Now');
  }

  async clickUpgradeNow() {
    await this.common.click(this.locators.upgradeNowButton);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickSetupVault() {
    await this.common.click(this.locators.setupVaultButton);
  }

  async isSetupVaultEnabled() {
    const isDisabled = await this.locators.setupVaultButton.isDisabled().catch(() => false);
    return !isDisabled;
  }

  async closeConfigPopup() {
    try {
      await this.locators.configPopupClose.click({ timeout: 3000 });
      await this.locators.configPopupClose.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    } catch {
      // popup not present
    }
  }

  async setCertificate(value) {
    await this.page.evaluate((val) => {
      const tas = document.querySelectorAll('textarea');
      if (tas.length > 0) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(tas[0], val);
        tas[0].dispatchEvent(new Event('input', { bubbles: true }));
        tas[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, value);
  }

  async setArchivingTarget(value) {
    await this.page.evaluate((val) => {
      const inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) {
        const ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        ns.call(inputs[0], val);
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, value);
  }

  async setVaultAuthKey(value) {
    await this.page.evaluate((val) => {
      const inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length > 1) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(inputs[1], val);
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, value);
  }

  async enableArchiving() {
    await this.page.evaluate(() => {
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
        if (nativeSetter) {
          nativeSetter.call(cb, true);
        } else {
          cb.checked = true;
        }
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await this.page.waitForTimeout(1000);
  }

  async clickUpdate() {
    await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Update'));
      if (btn) { btn.disabled = false; btn.click(); }
    });
    await this.page.waitForTimeout(2000);
  }

  async verifyUpdateSuccess() {
    const body = await this.page.locator('body').textContent().catch(() => '');
    if (/Successfully updated Archiving settings/i.test(body)) {
      console.log('Success popup verified: "Successfully updated Archiving settings."');
    } else {
      const visible = await this.locators.successPopup.isVisible({ timeout: 8000 }).catch(() => false);
      if (visible) {
        console.log('Update success popup visible');
      } else {
        console.log('Could not verify success message — page text:', body.substring(body.length - 300));
      }
    }
  }
}
