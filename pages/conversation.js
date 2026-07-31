import WebLoginPageLocator from '../locators/weblogin.locator.js';
import ConversationPageLocator from '../locators/conversation.locator.js';
import CommonMethod from '../utils/common.js';

export default class ConversationHelper {
  constructor(page) {
    this.page = page;
    this.webLoc = new WebLoginPageLocator(page);
    this.convLoc = new ConversationPageLocator(page);
    this.common = new CommonMethod(page);
  }

  async _dismissOverlay() {
    await this.page.evaluate(() => {
      document.querySelectorAll('.responsiveModalContainer [style*="pointer-events"], .responsiveModalContainer [class*="overlay"]')
        .forEach(el => el.style.pointerEvents = 'none');
    }).catch(() => {});
  }

  async _waitForTextarea(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const hasCreateBtn = await this.page.locator('//*[text()="Create"]').first().isVisible({ timeout: 500 }).catch(() => false);
      if (hasCreateBtn) {
        await this.page.waitForTimeout(500);
        continue;
      }
      const ta = this.page.locator('textarea').first();
      if (await ta.isVisible({ timeout: 500 }).catch(() => false)) return ta;
      await this.page.waitForTimeout(500);
    }
    throw new Error('Conversation textarea not visible and Create dialog closed');
  }

  async dismissFeatureModal() {
    await this.common.click(this.webLoc.featureXButton).catch(() => {});
    await this.page.locator('button:has-text("Close"), .close, [class*="close"]').first().click({ timeout: 2000 }).catch(() => {});
  }

  async startConversation(targetUser) {
    await this._dismissOverlay();
    await this.page.locator('[title="Start Conversation"]').click({ force: true });
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    const input = this.page.locator('.namegenEmailReplace');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(targetUser);
    await this.page.waitForTimeout(1000);
    const result = this.page.locator(`//div[@displayname='${targetUser}']`).first();
    if (await result.isVisible({ timeout: 5000 }).catch(() => false)) {
      await result.click({ force: true });
    } else {
      const genericMatch = this.page.locator(`//div[contains(text(),'${targetUser}')]`).first();
      if (await genericMatch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await genericMatch.click({ force: true });
      }
    }
    await this.page.waitForTimeout(500);
    await this._dismissOverlay();
    await this.page.locator('//*[text()="Create"]').click({ force: true, timeout: 5000 }).catch(() => {});
    await this._waitForTextarea();
  }

  async startGroupConversation(users, groupName = null) {
    await this._dismissOverlay();
    await this.page.locator('[title="Start Conversation"]').click({ force: true });
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    for (const user of users) {
      const input = this.page.locator('.namegenEmailReplace').first();
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.click({ force: true });
      await input.fill(user, { force: true });
      await this.page.waitForTimeout(1000);
      const result = this.page.locator(`//div[@displayname='${user}']`).first();
      if (await result.isVisible({ timeout: 5000 }).catch(() => false)) {
        await result.click({ force: true });
        await this.page.waitForTimeout(400);
      } else {
        const genericMatch = this.page.locator(`//div[contains(text(),'${user}')]`).first();
        if (await genericMatch.isVisible({ timeout: 5000 }).catch(() => false)) {
          await genericMatch.click({ force: true });
          await this.page.waitForTimeout(400);
        }
      }
    }
    if (groupName) {
      const nameInput = this.page.locator('input.namegenTitleReplace').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('', { force: true });
        await nameInput.fill(groupName, { force: true });
      }
    }
    await this._dismissOverlay();
    await this.page.waitForTimeout(500);
    await this.page.getByText('Create', { exact: true }).click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(800);
    await this._waitForTextarea();
  }

  async sendMessage(text) {
    await this._dismissOverlay();
    const ta = await this._waitForTextarea();
    await ta.click({ force: true });
    await ta.fill(text);
    await this._dismissOverlay();
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async bodyContains(text, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(text)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async waitForMessage(text, timeout = 30000) {
    const msg = this.page.locator(`//div[contains(@class,"message") and contains(text(),'${text}')]`).last();
    await msg.waitFor({ state: 'visible', timeout });
    return msg;
  }

  async waitForIncomingMessage(text, timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(text)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async verifyMessagePresent(text) {
    const found = await this.waitForIncomingMessage(text, 15000);
    if (!found) throw new Error(`Message "${text}" not found`);
  }

  async verifyMessagesFromUser(userName, ...messages) {
    const body = await this.page.locator('body').textContent().catch(() => '');
    for (const msg of messages) {
      if (!body.includes(msg)) {
        throw new Error(`Expected message "${msg}" from ${userName} not found`);
      }
    }
  }

  async openConversationByTitle(title, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await this.dismissFeatureModal();
      const byTitle = this.page.locator(`//div[@title='${title}']`).first();
      if (await byTitle.isVisible({ timeout: 1000 }).catch(() => false)) {
        await byTitle.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }
      const byDisplay = this.page.locator(`//div[@displayname='${title}']`).first();
      if (await byDisplay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await byDisplay.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }
      const items = await this.page.locator('div.scrollbox > div > div').all();
      for (const item of items) {
        const t = await item.textContent();
        const r = await item.boundingBox();
        if (t && r && t.includes(title)) {
          await item.click();
          await this.page.waitForTimeout(800);
          return true;
        }
      }
      await this.page.waitForTimeout(800);
    }
    return false;
  }

  async openConversationByUser(targetUser) {
    const conv = this.page.locator(`//div[@displayname='${targetUser}']`).first();
    if (await conv.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conv.click({ force: true });
      await this.page.waitForTimeout(800);
      return true;
    }
    const items = await this.page.locator(`//div[contains(text(),'${targetUser}')]`).all();
    for (const item of items) {
      if (await item.isVisible().catch(() => false)) {
        await item.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }
    }
    return false;
  }

  async addParticipants(users) {
    await this._dismissOverlay();
    const ep = this.page.locator('//div[text()="Edit Participant(s)"]');
    if (await ep.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ep.click({ force: true });
    } else {
      await this.page.locator('//i[@class="fa fa-ellipsis-v"]').first().click({ force: true });
      await this.page.waitForTimeout(500);
      await this._dismissOverlay();
      await this.page.locator('//div[contains(text(),"Edit Participant")]').click({ force: true });
    }
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    const input = this.page.locator('.namegenEmailReplace').first();
    let added = 0;
    for (const u of users) {
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.fill(u);
        await this.page.waitForTimeout(800);
        const r = this.page.locator(`(//div[contains(@displayname,'${u}')])[1]`);
        if (await r.isVisible({ timeout: 3000 }).catch(() => false)) {
          await r.click({ force: true });
          added++;
        }
      }
    }
    const save = this.page.locator('//span[text() = "Save"]');
    if (await save.isVisible({ timeout: 1500 }).catch(() => false)) {
      await save.click({ force: true });
      await this.page.waitForTimeout(800);
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    return added;
  }

  async addAttachment(filePath) {
    await this._dismissOverlay();
    await this.page.locator('//span[contains(@class,"ion-plus-circled")]').click({ force: true });
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    const fileInput = this.page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(filePath);
    } else {
      const fcp = this.page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      for (const sel of [
        '(//div[contains(@class, "chat-options-slat-title")])[1]',
        '//div[contains(text(),"Device")]',
        '//div[contains(text(),"Document")]',
        '//div[contains(text(),"Gallery")]',
      ]) {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.click({ force: true });
          break;
        }
      }
      const fc = await fcp;
      if (fc) {
        await fc.setFiles(filePath);
      } else if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fileInput.setInputFiles(filePath);
      }
    }
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    const sendBtn = this.page.locator('//span[text()="Send"]');
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click({ force: true });
    }
    await this.page.waitForTimeout(800);
  }

  async startAudioCall() {
    await this._dismissOverlay();
    await this.page.waitForTimeout(500);
    const btn = this.page.getByRole('button', { name: /Make Call/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.evaluate(el => el.click());
    await this.page.waitForTimeout(1000);
    await this._dismissOverlay();
  }

  async startScreenShare() {
    await this._dismissOverlay();
    const btn = this.page.locator('button[title*="Share Screen"], button:has-text("Share Screen"), [aria-label*="Share Screen"]').first();
    await btn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click({ force: true, timeout: 5000 });
      await this.page.waitForTimeout(800);
    }
  }

  async isScreenSharingActive() {
    return await this.page.locator('[class*="screen-share"], [class*="sharing"], button[title*="Stop Sharing"]').first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  async stopScreenShare() {
    const btn = this.page.locator('button[title*="Stop Sharing"], button:has-text("Stop Sharing")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async isVideoActive() {
    return await this.page.locator('video, [class*="video-stream"], [class*="local-video"]').first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getCallTimerText() {
    return await this.page.locator('[class*="timer"], [class*="call-timer"], span:has-text(":")').first().textContent().catch(() => '');
  }

  async getParticipantCount() {
    const text = await this.page.locator('[class*="participant"], [class*="member-count"]').first().textContent().catch(() => '');
    const nums = text.match(/\d+/g);
    return nums ? parseInt(nums[0], 10) : 0;
  }

  async startVideoCall() {
    await this._dismissOverlay();
    const btn = this.page.locator('button[title="Make Video Call"], button:has-text("Video Call")').first();
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(800);
  }

  async acceptIncomingCall(timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const sel of [
        'button:has-text("Answer")',
        'button:has-text("Accept")',
        'button:has-text("Join")',
        'text=Join Audio Call',
        'text=Join Video Call',
        'button:has-text("Join Video")',
      ]) {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
          await btn.click({ force: true, timeout: 2000 });
          await this.page.waitForTimeout(500);
          return true;
        }
      }
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async waitForCallConnected(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const endBtn = this.page.getByRole('button', { name: /End/i }).first();
      if (await endBtn.isVisible({ timeout: 500 }).catch(() => false)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async endCall() {
    const btn = this.page.getByRole('button', { name: /End/i }).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click({ force: true });
      await this.page.waitForTimeout(500);
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async shareLocation() {
    await this.page.locator('//span[contains(@class,"ion-plus-circled")]').click({ force: true });
    await this.page.waitForTimeout(800);
    await this.page.locator('//div[text() = "Share Location"]').click({ force: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.waitForTimeout(1000);
      const errorOk = this.page.locator('//button[text()="OK"]').first();
      if (await errorOk.isVisible({ timeout: 2000 }).catch(() => false)) {
        await errorOk.click({ force: true });
        await this.page.waitForTimeout(500);
        await this.page.locator('//div[text() = "Share Location"]').click({ force: true });
      } else {
        const sendBtn = this.page.locator('//span[text()="Send"]').first();
        if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await sendBtn.click({ force: true });
          await this.page.waitForTimeout(800);
          return;
        }
      }
    }
    throw new Error('Could not share location after 3 attempts');
  }

  async closeConversation() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async waitForUserOnline(userName, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes('Online') || body.includes('online')) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async createPoll(question, option1, option2) {
    await this._dismissOverlay();
    await this.page.locator('//span[contains(@class,"ion-plus-circled")]').click({ force: true });
    await this.page.waitForTimeout(500);
    await this.page.locator('//div[text()="Create Poll"]').click({ force: true });
    await this.page.waitForTimeout(500);
    await this.page.locator('[placeholder="Enter poll question"]').fill(question);
    await this.page.locator('[placeholder="Answer 1"]').fill(option1);
    await this.page.locator('[placeholder="Answer 2"]').fill(option2);
    await this.page.waitForTimeout(500);
    await this.page.getByText('Create', { exact: true }).click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(800);
  }

  async votePoll(optionText) {
    const pollEl = this.page.locator('text=Active Poll').locator('..').first();
    if (await pollEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pollEl.click({ force: true });
      await this.page.waitForTimeout(500);
    }
    const optionEl = this.page.locator(`//*[contains(@class,"poll") and contains(text(),'${optionText}')]`).first();
    if (await optionEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await optionEl.click({ force: true });
    } else {
      await this.page.locator(`text="${optionText}"`).first().click({ force: true, timeout: 3000 }).catch(() => {});
    }
    await this.page.waitForTimeout(500);
  }

  async verifyPollResult(question, expectedOption, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(expectedOption) && body.includes(question)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async verifyLocationReceived(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes('My Location') || body.includes('Location') || body.includes('map')) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async verifyAttachment(fileName, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(fileName)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async reloadUntilVisible(conversationTitle, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await this.openConversationByTitle(conversationTitle);
      if (found) return true;
      await this.page.reload();
      await this.page.waitForTimeout(1000);
    }
    return false;
  }

  async openConversationByText(text, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await this.dismissFeatureModal();

      const convoLink = this.page.locator('text=Conversations').first();
      if (await convoLink.isVisible({ timeout: 500 }).catch(() => false)) {
        await convoLink.click({ force: true });
        await this.page.waitForTimeout(500);
      }

      const displayMatch = this.page.locator(`//div[@displayname='${text}']`).first();
      if (await displayMatch.isVisible({ timeout: 1000 }).catch(() => false)) {
        await displayMatch.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }

      const titleExact = this.page.locator(`//div[@title='${text}']`).first();
      if (await titleExact.isVisible({ timeout: 1000 }).catch(() => false)) {
        await titleExact.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }
      const titleContains = this.page.locator(`//div[contains(@title, '${text}')]`).first();
      if (await titleContains.isVisible({ timeout: 1000 }).catch(() => false)) {
        await titleContains.click({ force: true });
        await this.page.waitForTimeout(800);
        return true;
      }

      const anyMatch = this.page.locator(`//*[contains(text(),'${text}')]`).first();
      if (await anyMatch.isVisible({ timeout: 1000 }).catch(() => false)) {
        const tag = await anyMatch.evaluate(el => el.tagName).catch(() => '');
        const role = await anyMatch.getAttribute('role').catch(() => '');
        if (tag === 'DIV' || tag === 'LI' || tag === 'SPAN' || role) {
          await anyMatch.click({ force: true });
          await this.page.waitForTimeout(800);
          return true;
        }
      }

      await this.page.waitForTimeout(800);
    }
    const htmlDump = await this.page.evaluate(() => {
      const sel = document.querySelector('[class*="conversation"]') || document.querySelector('[class*="scroll"]') || document.querySelector('[class*="chat"]') || document.querySelector('[class*="message"]');
      if (!sel) return 'no matching element found';
      return sel.outerHTML.substring(0, 2000);
    }).catch(() => 'eval error');
    console.log(`DEBUG openConversationByText("${text}"): ${htmlDump.substring(0, 500)}`);
    return false;
  }

  async waitForNotification(text, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(text)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async sendTextMessage(text) {
    await this._dismissOverlay();
    const ta = this.page.locator('textarea').first();
    await ta.waitFor({ state: 'visible', timeout: 10000 });
    await ta.click({ force: true });
    await ta.fill(text);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(800);
  }

  async isConversationTextVisible(text, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(text)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }
}
