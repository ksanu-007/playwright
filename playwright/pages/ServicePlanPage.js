import { expect } from '@playwright/test';
import ServicePlanLocators from '../locators/servicePlan.locators.js';
import CommonMethod from '../utils/common.js';

export default class ServicePlanPage {
  constructor(page) {
    this.page = page;
    this.locators = new ServicePlanLocators(page);
    this.common = new CommonMethod(page);
  }

  async verifyServicePlansPage() {
    await expect(this.locators.servicePlansHeading).toBeVisible({ timeout: 15000 });
  }

  async upgradeWithCreditCard() {
    await this.common.click(this.locators.upgradeWithCreditCard);
  }

  async clickProceed() {
    await this.common.click(this.locators.proceedButton);
  }
}
