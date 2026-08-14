import { expect } from '@playwright/test';
import StripeCheckoutLocators from '../locators/stripeCheckout.locators.js';
import CommonMethod from '../utils/common.js';
import testData from '../utils/testData.json';

export default class StripeCheckoutPage {
  constructor(page) {
    this.page = page;
    this.locators = new StripeCheckoutLocators(page);
    this.common = new CommonMethod(page);
  }

  async fillCardDetails() {
    const card = testData.stripeCardDetails;
    await this.locators.cardHolderInput.fill(card.cardHolder);
    await this.locators.cardNumberInput.fill(card.cardNumber);
    await this.locators.expiryInput.fill(card.expiry);
    await this.locators.cvvInput.fill(card.cvv);
  }

  async fillBillingDetails(billing) {
    if (billing.address) await this.locators.billingAddressInput.fill(billing.address);
    if (billing.city) await this.locators.billingCityInput.fill(billing.city);
    if (billing.state) await this.locators.billingStateInput.fill(billing.state);
    if (billing.zip) await this.locators.billingZipInput.fill(billing.zip);
    if (billing.phone) await this.page.locator('input[name="phoneNumber"]').fill(billing.phone);
  }

  async submitPayment() {
    await this.common.click(this.locators.submitButton);
  }

  async verifySuccessPopup() {
    await expect(this.locators.successPopup).toBeVisible({ timeout: 30000 });
  }

  async clickOk() {
    await this.common.click(this.locators.okButton);
  }
}
