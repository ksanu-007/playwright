import VaultConfigureLocators from '../locators/vaultConfigure.locators.js';
import CommonMethod from '../utils/common.js';

export default class VaultConfigurePage {
  constructor(page) {
    this.page = page;
    this.locators = new VaultConfigureLocators(page);
    this.common = new CommonMethod(page);
  }

  async navigateToConfigure() {
    await this.common.click(this.locators.configureLink);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async generateUntilSuccess() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const genBtn = this.locators.generateButton;
      if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await genBtn.click();
        await this.page.waitForTimeout(2000);
      }

      const submitBtn = this.locators.submitButton;
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await this.page.waitForTimeout(2000);
      }

      const targetValue = await this.locators.archivingTargetReadonly.inputValue().catch(() => '');
      const authValue = await this.locators.vaultAuthKeyReadonly.inputValue().catch(() => '');
      if (targetValue && authValue) {
        console.log(`Config values present (attempt ${attempt + 1}): ${targetValue.substring(0, 40)}...`);
        return;
      }
    }
  }

  async copyArchivingTarget() {
    const el = this.locators.archivingTargetReadonly;
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return await el.inputValue().catch(() => el.textContent());
  }

  async copyVaultAuthKey() {
    const el = this.locators.vaultAuthKeyReadonly;
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return await el.inputValue().catch(() => el.textContent());
  }

  async copyCertificate() {
    const el = this.locators.certificateReadonly;
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return await el.inputValue().catch(() => el.textContent());
  }
}
