import { expect } from '@playwright/test';
import VaultReportsLocators from '../locators/vaultReports.locators.js';
import JSZip from 'jszip';
import fs from 'fs';

// Minimal RFC4180-ish CSV parser (handles quoted fields, embedded commas,
// and "" as an escaped quote) — the exported report's Message column can
// itself contain commas, so a naive split(',') silently misaligns columns.
function parseCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // skip
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  const header = rows[0] || [];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
}

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

  /** Fills and submits the New Report form scoped to a message keyword search. */
  async createReportByKeyword(reportName, keyword) {
    await this.locators.newReportButton.click({ force: true });
    await this.locators.reportNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.reportNameInput.fill(reportName);
    await this.locators.keywordInput.fill(keyword);
    await this.locators.submitButton.click({ force: true });
    await this.locators.reportNameInput.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /** Fills and submits the New Report form scoped to a single message ID (accepts up to 25, comma-separated). */
  async createReportByMessageId(reportName, messageId) {
    await this.locators.newReportButton.click({ force: true });
    await this.locators.reportNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.reportNameInput.fill(reportName);
    await this.locators.messageIdInput.fill(String(messageId));
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

  /**
   * Selects the report's row (a plain click reveals the Export/Delete/More
   * information toolbar), downloads its Export zip, and returns the parsed
   * rows of the CSV entry inside — one object per message, keyed by the
   * CSV's own header (Id, Time, From, ForwardedFrom, Message, Priority,
   * Type, DeleteTime, ContainerId, ContainerTitle, ContainerType,
   * Participants, reactions). Confirmed live 2026-08-29.
   */
  async getReportMessages(reportName) {
    // Confirmed live 2026-08-29: calling this a second time in the same page
    // session (a different report already selected/exported earlier) leaves
    // the Export toolbar hidden after clicking the new row — re-clicking the
    // Reports nav link isn't enough to reset it. A full page reload is.
    await this.page.reload();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.locators.reportsNavLink.click({ force: true });
    await this.locators.newReportButton.waitFor({ state: 'visible', timeout: 10000 });

    const row = this.locators.reportRow(reportName);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await this.locators.exportButton.waitFor({ state: 'visible', timeout: 10000 });

    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.locators.exportButton.click({ force: true });
    const download = await downloadPromise;

    const path = await download.path();
    const buf = fs.readFileSync(path);
    const zip = await JSZip.loadAsync(buf);
    const csvEntryName = Object.keys(zip.files).find((n) => n.endsWith('.csv'));
    if (!csvEntryName) throw new Error(`getReportMessages: no .csv entry in "${reportName}"'s export zip`);

    const csvText = await zip.files[csvEntryName].async('string');
    return parseCsv(csvText);
  }
}
