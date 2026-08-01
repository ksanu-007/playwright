import testData from '../utils/testData.json';

export default class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('input[type="email"]');
    this.continueButton = page.locator('button[type="submit"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
  }

  async loginNetsfere(email, password) {
    const loginEmail = email || `${testData.logincreds.name}${testData.logincreds.email}`;
    const loginPassword = password || testData.logincreds.password;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this._attemptLogin(loginEmail, loginPassword);
        return;
      } catch (e) {
        if (attempt >= 2) throw e;
        console.log(`Login attempt ${attempt + 1} failed, retrying...`);
        await this.page.goto('about:blank', { waitUntil: 'load', timeout: 15000 }).catch(() => {});
      }
    }
  }

  async _attemptLogin(email, password) {
    await this.page.goto(testData.appUrl.testUrl, { waitUntil: 'load', timeout: 30000 });
    await this.page.waitForTimeout(2000);

    await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.usernameInput.fill(email);
    await this.continueButton.click();
    await this.passwordInput.fill(password);
    await Promise.all([
      this.loginButton.click(),
      this.page.waitForURL('**/Dashboard**', { timeout: 60000 }).catch(() => {}),
    ]);

    const url = this.page.url();
    if (url.includes('Dashboard') || url.includes('Invited')) return;
    const errEl = this.page.locator('text=Invalid').first();
    const errText = await errEl.isVisible({ timeout: 2000 }).catch(() => false)
      ? await errEl.textContent() : '';
    throw new Error(errText ? `Login failed: ${errText}` : `Login failed - still on ${url}`);
  }
}
