import { expect } from '@playwright/test';
import VaultReportsLocators from '../locators/vaultReports.locators.js';

export default class VaultReportsPage {
  constructor(page) {
    this.page = page;
    this.locators = new VaultReportsLocators(page);
  }

  async open() {
    await this.locators.reportsNavLink.click({ force: true });
    await this.locators.newReportButton.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Fills and submits the New Report form scoped to a single conversation ID. */
  async createReport(reportName, conversationId) {
    await this.locators.newReportButton.click({ force: true });
    await this.locators.reportNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.reportNameInput.fill(reportName);

    // "Include Messages" is checked by default, which is what makes this
    // field usable — confirmed live rather than assumed, since toggling it
    // off would leave the Conversation ID filter present but inert.
    await this.locators.conversationIdInput.fill(String(conversationId));

    await this.locators.submitButton.click({ force: true });
    await this.locators.reportNameInput.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Polls the report's table row until its Status cell reaches a terminal
   * "Completed" or "Failed" state, since compilation is backend-driven and
   * not instantaneous.
   *
   * Fixed 2026-08-27: originally treated anything OTHER than "Compiling
   * Report..." as done — confirmed live that the status also passes through
   * a distinct "Please wait." transitional state first, which that negative
   * check wrongly accepted as final. Matching the actual terminal states
   * instead of excluding one known transitional one avoids this whole class
   * of bug (there may be others we haven't seen yet).
   */
  async waitForReportCompleted(reportName, timeout = 60000) {
    const row = this.locators.reportRow(reportName);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const text = await row.textContent().catch(() => '');
      if (text && /Completed|Failed/i.test(text)) {
        return text.trim();
      }
      await this.page.waitForTimeout(2000);
    }
    throw new Error(`Report "${reportName}" did not reach a terminal state within ${timeout}ms`);
  }

  /** Reads the row's Id/Status/Message Count/Call Count columns for a completed report. */
  async getReportStats(reportName) {
    const cells = await this.locators.reportRow(reportName).locator('td').allTextContents();
    return {
      id: cells[0]?.trim(),
      reportName: cells[1]?.trim(),
      creationDate: cells[2]?.trim(),
      deletionDate: cells[3]?.trim(),
      status: cells[4]?.trim(),
      messageCount: cells[5]?.trim(),
      callCount: cells[6]?.trim(),
    };
  }

  async verifyReportVisible(reportName) {
    await expect(this.locators.reportRow(reportName)).toBeVisible({ timeout: 10000 });
  }
}
