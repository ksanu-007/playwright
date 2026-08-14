export default class ArchivingLocators {
  constructor(page) {
    this.page = page;

    this.servicePlanLabel = page.locator('text=/Service Plan|Current Plan|Enterprise/i').first();
    this.upgradeNowButton = page.locator('a').filter({ hasText: /Upgrade Now/i }).or(
      page.getByRole('button', { name: /Upgrade Now/i })
    ).first();
    this.setupVaultButton = page.getByRole('button', { name: /Setup Vault|Access Vault/i });

    this.certificateTextarea = page.locator('textarea').nth(0);
    this.archivingTargetTextarea = page.locator('textarea').nth(1);
    this.vaultAuthKeyTextarea = page.locator('input[type="text"]').nth(0);

    this.enableArchivingRadio = page.locator('input[type="checkbox"]').first();

    this.updateButton = page.getByRole('button', { name: /Update/i });

    this.configPopupClose = page.getByRole('button', { name: /Close|Cancel|x|✕/i }).or(
      page.locator('[class*="close"]').first()
    );

    this.successPopup = page.locator('text=/Successfully updated|success/i').first();
  }
}
