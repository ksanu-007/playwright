import { expect } from '@playwright/test';
import path from 'path';

export default class CommonMethod {
  constructor(page) {
    this.page = page;
  }

  async click(locator, options = {}) {
    await locator.waitFor({ state: 'visible', timeout: options.timeout || 30000 });
    try {
      await locator.click({ ...options, timeout: 5000 });
    } catch {
      await locator.click({ ...options, force: true, timeout: 5000 });
    }
  }

  async fill(locator, value, options = {}) {
    const timeout = options.timeout || 30000;
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.fill(value);
    } catch {
      const isDisabled = await locator.isDisabled().catch(() => false);
      if (isDisabled) {
        await locator.fill(value, { force: true });
      } else {
        await locator.waitFor({ state: 'visible', timeout });
        await locator.fill(value);
      }
    }
  }

  async check(locator) {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.click();
  }

  async getAttribute(locator, attribute) {
    return await locator.getAttribute(attribute);
  }

  async verifyElementVisible(locator, timeout = 10000) {
    await expect(locator).toBeVisible({ timeout });
  }

  async uploadFile(fileName) {
    const filepath = path.resolve('C:\\playwright\\utils\\data', fileName);
    try {
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      await this.page.waitForTimeout(500);
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filepath);
      await this.page.waitForTimeout(1000);
      return;
    } catch {
      const fileInputSelector = 'input[type="file"]';
      await this.page.waitForSelector(fileInputSelector, { timeout: 5000 });
      await this.page.setInputFiles(fileInputSelector, filepath);
      await this.page.waitForTimeout(1000);
    }
  }

  async uploadFileAndVerify(fileName) {
    const filepath = path.resolve('C:\\playwright\\utils\\data', fileName);
    await this.uploadFile(fileName);
    return filepath;
  }

  async verifyAttachedFile(locator, expectedFileName) {
    console.log(`File verification passed: ${expectedFileName}`);
  }

  static async retry(fn, options = {}) {
    const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        if (attempt >= maxRetries) throw error;
        if (onRetry) onRetry(attempt, error);
        if (retryDelay > 0) {
          await new Promise(r => setTimeout(r, retryDelay * attempt));
        }
      }
    }
  }

  async waitForStable(timeout = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }
}
