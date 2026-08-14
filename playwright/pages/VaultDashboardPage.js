import { expect } from '@playwright/test';
import VaultDashboardLocators from '../locators/vaultDashboard.locators.js';

export default class VaultDashboardPage {
  constructor(page) {
    this.page = page;
    this.locators = new VaultDashboardLocators(page);
  }

  async verifyDashboardLoaded() {
    await expect(this.locators.dashboardHeading).toBeVisible({ timeout: 15000 });
  }

  async getArchiveCount() {
    const text = await this.locators.archiveCount.textContent().catch(() => '0');
    const numbers = text.match(/\d+/g);
    return numbers ? parseInt(numbers[0], 10) : 0;
  }

  async getLatestArchivedMessages() {
    return await this.locators.latestArchives.all();
  }

  async verifyNoErrors() {
    const errorCount = await this.locators.errorMessages.count().catch(() => 0);
    expect(errorCount).toBe(0);
  }
}
