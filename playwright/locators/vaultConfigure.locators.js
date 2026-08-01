export default class VaultConfigureLocators {
  constructor(page) {
    this.page = page;
    this.configureLink = page.getByRole('link', { name: /Configure/i }).or(
      page.locator('a').filter({ hasText: /Configure/i }).first()
    );
    this.generateButton = page.getByRole('button', { name: /Generate/i });
    this.submitButton = page.getByRole('button', { name: /Submit/i });
    this.greenTick = page.locator('#targetHostTextInput').first();
    this.archivingTargetReadonly = page.locator('#targetHostTextInput').first();
    this.vaultAuthKeyReadonly = page.locator('#authVaultKeyTextInput').first();
    this.certificateReadonly = page.locator('#certifcateTextArea').first();
  }
}
