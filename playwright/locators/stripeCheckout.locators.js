export default class StripeCheckoutLocators {
  constructor(page) {
    this.page = page;

    this.cardHolderInput = page.locator('input[placeholder="First Last"]').first();

    this.cardNumberInput = page.locator('input[placeholder="0000-0000-0000-0000"]').first();

    this.expiryInput = page.locator('input[placeholder="MM/YY"]').first();

    this.cvvInput = page.locator('input[placeholder="123"]').first();

    this.billingAddressInput = page.locator('input[name="address"]').first();

    this.billingCityInput = page.locator('input[name="city"]').first();

    this.billingStateInput = page.locator('input[name="province"]').first();

    this.billingZipInput = page.locator('input[name="zip"]').first();

    this.submitButton = page.getByRole('button', { name: /Submit/i });

    this.successPopup = page.locator('text=/successfully changed your service plan/i').first();
    this.okButton = page.getByRole('button', { name: /Close|OK|ok/i });
  }
}
