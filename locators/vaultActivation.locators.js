export default class VaultActivationLocators {
  constructor(page) {
    this.page = page;
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.activateButton = page.getByRole('button', { name: /Activate|Set Password/i });
    this.createPasswordHeading = page.locator('text=/Activate Account|Create Password/i').first();
  }
}
