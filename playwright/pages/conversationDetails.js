import ConversationDetailsPageLocator from '../locators/conversationDetails.locator.js';

export default class ConversationDetailsPage {
  constructor(page) {
    this.page = page;
    this.locators = new ConversationDetailsPageLocator(page);
  }

  async _dismissOverlay() {
    await this.page.evaluate(() => {
      document.querySelectorAll('.responsiveModalContainer [style*="pointer-events"], .responsiveModalContainer [class*="overlay"]')
        .forEach(el => el.style.pointerEvents = 'none');
    }).catch(() => {});
  }

  /** Opens the Conversation Details panel for the currently-open conversation. */
  async open() {
    await this._dismissOverlay();
    if (await this.locators.detailsPanelHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
    if (await this.locators.infoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.locators.infoButton.click({ force: true });
    }
    await this.locators.detailsPanelHeading.waitFor({ state: 'visible', timeout: 10000 });
  }

  /** Returns the participant count shown as "<n> People in this conversation". */
  async getParticipantCount() {
    const text = await this.locators.participantCountLabel.textContent({ timeout: 10000 }).catch(() => '');
    const match = text.match(/(\d+)\s+People/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Clicks Summarize, which expands the "Generate <period> Summary" row options. */
  async clickSummarize() {
    await this._dismissOverlay();
    const alreadyExpanded = await this.locators.oneDaySummaryOption.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (alreadyExpanded) return;

    const summarizeVisible = await this.locators.summarizeAction.isVisible({ timeout: 5000 }).catch(() => false);
    if (!summarizeVisible) {
      // A summary was already requested earlier in this session — the Actions
      // row reads "Summary Pending" instead of "Summarize" while it generates.
      const pendingVisible = await this.locators.summaryPendingLabel.isVisible({ timeout: 3000 }).catch(() => false);
      if (pendingVisible) return;
    }
    await this.locators.summarizeAction.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.summarizeAction.click({ force: true });
  }

  /** Requests the 1-day summary (the app's real options are 1/2/4-week or 1-day). */
  async generateOneDaySummary() {
    await this.clickSummarize();
    await this.locators.oneDaySummaryOption.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.oneDaySummaryOption.first().click({ force: true });
  }

  /**
   * Waits for the AI-generated summary to finish and returns its text.
   * Generation is backend/AI-driven and can legitimately take well over a
   * minute even for a small conversation, so this polls rather than using a
   * short fixed wait.
   */
  async waitForSummary(timeout = 180000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const stillGenerating = await this.locators.summaryGeneratingIndicator.isVisible({ timeout: 500 }).catch(() => false);
      if (!stillGenerating) {
        const text = await this.getSummaryText();
        if (text && text.replace(/\s+/g, ' ').trim().length > 20) {
          return text.replace(/\s+/g, ' ').trim();
        }
      }
      await this.page.waitForTimeout(3000);
    }
    throw new Error(`Summary was not generated within ${timeout}ms`);
  }

  async getSummaryText() {
    if (await this.locators.summaryBubble.isVisible({ timeout: 1000 }).catch(() => false)) {
      return this.locators.summaryBubble.innerText().catch(() => '');
    }
    return '';
  }

  async isSummaryVisible() {
    return this.locators.summaryBubble.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Confirms the summary card is scoped to the 1-day period that was requested. */
  async isOneDayPeriod() {
    return this.locators.oneDaySummaryPeriodLabel.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async backToConversation() {
    if (await this.locators.backToConversationButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.locators.backToConversationButton.click({ force: true });
    }
  }
}
