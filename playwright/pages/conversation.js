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
    await this.common.click(this.webLoc.featureXButton, { timeout: 3000 }).catch(() => {});
    await this.page.locator('button:has-text("Close"), .close, [class*="close"]').first().click({ timeout: 1500 }).catch(() => {});
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

  // Searches the (already-open) participant picker for `user` and clicks the
  // matching result. Retries a few times with a real polling wait rather than
  // a fixed delay + single isVisible() check — under real network conditions
  // the autocomplete search can occasionally take longer than a short fixed
  // wait to return results, which previously caused silent, intermittent
  // drops when adding several participants in a row (confirmed live: the
  // same fixed-1s-wait code added 2 of 3 users on one run and only 1 of 9 on
  // another, with no error — isVisible() with a timeout does not itself poll,
  // so the only thing standing between "found" and "not found" was whether
  // the fixed wait happened to be long enough that one time).
  async _searchAndSelectParticipant(user, attempts = 3) {
    const input = this.page.locator('.namegenEmailReplace').first();
    for (let attempt = 0; attempt < attempts; attempt++) {
      await input.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await input.click({ force: true }).catch(() => {});
      await input.fill(user, { force: true }).catch(() => {});

      const exact = this.page.locator(`//div[@displayname='${user}']`).first();
      const contains = this.page.locator(`//div[contains(@displayname,'${user}') or contains(text(),'${user}')]`).first();
      const found = await exact.waitFor({ state: 'visible', timeout: 6000 }).then(() => exact).catch(() =>
        contains.waitFor({ state: 'visible', timeout: 2000 }).then(() => contains).catch(() => null)
      );
      if (found) {
        await found.click({ force: true });
        await this.page.waitForTimeout(400);
        return true;
      }
      await input.fill('', { force: true }).catch(() => {});
      await this.page.waitForTimeout(300);
    }
    return false;
  }

  async startGroupConversation(users, groupName = null) {
    await this._dismissOverlay();
    await this.page.locator('[title="Start Conversation"]').click({ force: true });
    await this.page.waitForTimeout(800);
    await this._dismissOverlay();
    const added = [];
    for (const user of users) {
      const ok = await this._searchAndSelectParticipant(user);
      if (ok) added.push(user);
      else console.warn(`startGroupConversation: could not find/select "${user}" after retries`);
    }
    if (added.length < users.length) {
      const missing = users.filter(u => !added.includes(u));
      console.warn(`startGroupConversation: ${missing.length} participant(s) not added: ${missing.join(', ')}`);
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
    return added;
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
      // Fixed 2026-08-10: this fallback reproducibly threw when the
      // conversation list re-rendered between .all() and the loop below
      // (a live-updating list — new incoming messages reorder it mid-loop),
      // leaving a stale element reference that crashes .textContent()/
      // .boundingBox() instead of just skipping that one item. Wrapping each
      // item in its own try/catch keeps one stale row from failing the
      // whole search.
      const items = await this.page.locator('div.scrollbox > div > div').all().catch(() => []);
      for (const item of items) {
        try {
          const t = await item.textContent();
          const r = await item.boundingBox();
          if (t && r && t.includes(title)) {
            await item.click();
            await this.page.waitForTimeout(800);
            return true;
          }
        } catch {
          // stale element from a live list re-render — skip and keep looking
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
    let added = 0;
    for (const u of users) {
      if (await this._searchAndSelectParticipant(u)) added++;
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

    // Fixed 2026-08-20: on a group conversation, "Make Call" only opens a
    // "Select Ring Participants" screen — confirmed live via failure
    // screenshot that the call never actually rang because this second,
    // separate "Place call" button was never clicked, leaving the call
    // stuck on that screen indefinitely. 1:1 conversations ring directly, so
    // this button never appears there and the check is skipped.
    const placeCallBtn = this.page.locator('button[title="Place call"]').first();
    if (await placeCallBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await placeCallBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
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

  // Fixed 2026-08-20: confirmed live that clicking Share Screen genuinely
  // starts sharing (a real screenShare websocket connects and media flows),
  // but the toggled button's title becomes "Stop Screen Share", not "Stop
  // Sharing" — so this never matched and reported sharing as inactive even
  // when it had actually started. Also switched to a real polling loop:
  // Locator.isVisible()'s `timeout` option does not retry, it's a single
  // immediate check, and establishing the screen-share media session
  // (its own websocket handshake) takes a few seconds — the old single
  // check ran before that ever finished.
  async isScreenSharingActive(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.page.locator('button:has-text("Stop Sharing"), button[title*="Stop Screen Share"]').first().isVisible().catch(() => false)) {
        return true;
      }
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async stopScreenShare() {
    const btn = this.page.locator('button:has-text("Stop Sharing"), button[title*="Stop Screen Share"]').first();
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

  // Fixed 2026-08-20: confirmed live that the incoming-call Accept/Decline
  // controls are icon-only buttons carrying a `title` attribute with no
  // visible text content — the has-text() selectors below never matched
  // them, so this always timed out and returned false even while a real
  // "Accept"-titled button was on screen.
  async acceptIncomingCall(timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const sel of [
        'button[title="Answer"]',
        'button[title="Accept"]',
        'button[title="Join"]',
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

  // Fixed 2026-08-20: was checking only for the "End call" button, which
  // renders immediately for an outgoing/ringing call — confirmed live that
  // this reports "connected" while the call header still reads
  // "Connecting..." and the Share Screen control isn't in the DOM yet,
  // causing startScreenShare() to time out looking for a button that
  // hadn't been mounted. #elapsedTimeDisplay holds "Connecting..." while
  // ringing and switches to a real mm:ss once the call is actually
  // connected — waiting on that instead gives startScreenShare() a call
  // that's genuinely live.
  async waitForCallConnected(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const timerText = (await this.page.locator('#elapsedTimeDisplay').first().textContent().catch(() => '')).trim();
      if (/^\d{1,2}:\d{2}$/.test(timerText)) return true;
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

  // Fixed 2026-08-20: confirmed live that the poll card only renders its
  // option text once expanded — collapsed, it shows just the question and
  // "Click or tap to vote" — so this always failed on a real, just-created
  // poll because the option text genuinely wasn't in the DOM yet. votePoll()
  // already expands the card the same way before looking for option text.
  async verifyPollResult(question, expectedOption, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (body.includes(expectedOption) && body.includes(question)) return true;
      if (body.includes(question)) {
        const pollEl = this.page.locator('text=Active Poll').locator('..').first();
        if (await pollEl.isVisible({ timeout: 500 }).catch(() => false)) {
          await pollEl.click({ force: true }).catch(() => {});
        }
      }
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
    await this.dismissFeatureModal();
    const start = Date.now();
    while (Date.now() - start < timeout) {
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

  // Replies to the most recent message (matches this repo's mobile
  // convention of always acting on the just-sent message — see
  // ios-reply-message.yaml's own header note on why acting on an older,
  // possibly-duplicated message text is unreliable). Discovered live
  // 2026-08-10: each message row has a "Reply" element exposed via a
  // `title="Reply"` attribute (NOT aria-label, despite Playwright's own
  // accessibility snapshot reporting it as an accessible name "Reply" —
  // that name is computed FROM the title attribute). Clicking it opens a
  // quote-preview banner ("You / <original text>", with an X to cancel)
  // above the compose textarea; sent reply renders as one bubble containing
  // the quoted preview + the new text, matching the mobile apps' pattern.
  async replyToMessage(replyText) {
    await this._dismissOverlay();
    await this.page.locator('[title="Reply"]').last().click({ force: true });
    await this.page.waitForTimeout(500);
    const ta = this.page.locator('textarea').first();
    await ta.waitFor({ state: 'visible', timeout: 10000 });
    await ta.click({ force: true });
    await ta.fill(replyText);
    await this._dismissOverlay();
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(800);
  }

  // Forwards the most recent message to a conversation matching
  // targetTitle. Discovered live 2026-08-10: clicking a message's
  // `title="Forward"` element opens a full "Select Conversations" screen
  // (CANCEL/FORWARD text buttons top, radio circle per row) — the same
  // picker pattern as iOS/Android's own Forward feature.
  //
  // Fixed 2026-08-10: `getByText(targetTitle).first()` reproducibly
  // selected the PAGE HEADER's own conversation-title text (which also
  // matches targetTitle) instead of a picker row — the header sits above
  // the "Select Conversations" heading, so the click landed on nothing
  // selectable and the picker silently stayed at "0 selected". Filtering
  // matches to those with a Y position below the heading's own bounding box
  // reliably finds an actual list row instead. The row's own text isn't
  // directly clickable (it's not the radio control), so this clicks at a
  // fixed X coordinate (1230px, verified live against the picker's radio
  // column) at the matched row's Y — mouse-coordinate clicking, same
  // fallback class of approach as this repo's mobile point-based taps.
  async forwardMessage(targetTitle) {
    await this._dismissOverlay();
    await this.page.locator('[title="Forward"]').last().click({ force: true });
    const heading = this.page.getByText('Select Conversations', { exact: true }).first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    const headingBox = await heading.boundingBox();
    const matches = await this.page.getByText(targetTitle, { exact: false }).all();
    let rowBox = null;
    for (const m of matches) {
      const box = await m.boundingBox();
      if (box && headingBox && box.y > headingBox.y + headingBox.height) {
        rowBox = box;
        break;
      }
    }
    if (!rowBox) throw new Error(`forwardMessage: no conversation row matching "${targetTitle}" found in the picker`);
    await this.page.mouse.click(1230, rowBox.y + rowBox.height / 2);
    await this.page.waitForTimeout(300);
    await this.page.getByText('Forward', { exact: true }).click({ force: true });
    await this.page.waitForTimeout(800);
  }

  // Verifies a specific message's text has disappeared — used to confirm a
  // deletion synced in from iOS/Android. The Web client has no per-message
  // delete action of its own in this app's UI (confirmed live 2026-08-10 via
  // accessibility snapshot, title-attribute search, hover, and right-click —
  // only Reply/Forward are exposed per message), so Web is verify-only for
  // deletions, never the deleter.
  async verifyMessageGone(text, timeout = 45000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const body = await this.page.locator('body').textContent().catch(() => '');
      if (!body.includes(text)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }
}
