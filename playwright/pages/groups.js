import GroupsPageLocator from '../locators/groups.locator.js';
import DashboardPageLocator from '../locators/dashboard.locators.js';
import CommonMethod from '../utils/common.js';

export default class GroupsPage {
  constructor(page) {
    this.page = page;
    this.locators = new GroupsPageLocator(page);
    this.dashboardLocators = new DashboardPageLocator(page);
    this.common = new CommonMethod(page);
  }

  async navigateToGroups() {
    await this.common.click(this.dashboardLocators.UserAndGroups);
    await this.page.waitForTimeout(1000);
    await this.common.click(this.locators.GroupsTab);
    await this.page.waitForTimeout(1000);
  }

  async createGroup(groupName, shortName) {
    await this.common.click(this.locators.AddGroupButton);
    await this.page.waitForTimeout(1000);
    await this.common.fill(this.locators.GroupNameInput, groupName);
    await this.common.fill(this.locators.GroupDescriptionInput, shortName);
    await this.page.waitForTimeout(500);
  }

  async clickEditMembers() {
    await this.common.click(this.locators.EditMembersButton);
    await this.page.waitForTimeout(2000);
  }

  async setShowEntries(value) {
    const select = this.page.locator('select').nth(3);
    await select.selectOption(value);
    await this.page.waitForTimeout(1000);
  }

  async selectMembersByRange(startUserId, endUserId) {
    const totalSelected = await this.page.evaluate(({ start, end }) => {
      const rows = document.querySelectorAll('table tbody tr');
      let selected = 0;
      rows.forEach(row => {
        // Display name is in the 2nd td (index 1)
        const nameCell = row.querySelector('td:nth-child(2)');
        if (nameCell) {
          const text = nameCell.textContent.trim();
          const match = text.match(/16415u(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num >= start && num <= end) {
              const checkbox = row.querySelector('i.fa-square');
              if (checkbox) {
                checkbox.click();
                selected++;
              }
            }
          }
        }
      });
      return selected;
    }, { start: startUserId, end: endUserId });

    return totalSelected;
  }

  async selectAllMembersOnPage() {
    const selected = await this.page.evaluate(() => {
      const checkboxes = document.querySelectorAll('i.fa-square.fa-fw');
      checkboxes.forEach(cb => cb.click());
      return checkboxes.length;
    });
    return selected;
  }

  async filterMembersByDisplayName(text) {
    const input = this.page.locator('//input[@placeholder="Jane Doe"]');
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(text);
      await this.page.waitForTimeout(2000);
      return true;
    }
    return false;
  }

  async resetMemberFilter() {
    const reset = this.page.locator('text=Reset Search');
    if (await reset.isVisible({ timeout: 1000 }).catch(() => false)) {
      await reset.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async selectMembersByRowRange(startIndex, count) {
    const selected = await this.page.evaluate(({ start, cnt }) => {
      const rows = document.querySelectorAll('table tbody tr');
      let selected = 0;
      for (let i = start; i < rows.length && i < start + cnt; i++) {
        const checkbox = rows[i].querySelector('i.fa-square');
        if (checkbox) {
          checkbox.click();
          selected++;
        }
      }
      return selected;
    }, { start: startIndex, cnt: count });
    return selected;
  }

  async getVisibleMemberCount() {
    return this.page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  }

  async clickSave() {
    await this.common.click(this.locators.SaveButton);
    await this.page.waitForTimeout(1000);
  }

  async clickAdd() {
    await this.common.click(this.locators.AddButton);
    await this.page.waitForTimeout(2000);
  }

  async verifySuccessMessage() {
    await this.common.verifyElementVisible(this.locators.SuccessMessage);
  }

  async closeDialog() {
    await this.common.click(this.locators.closeButton).catch(() => {});
    await this.page.waitForTimeout(1000);
  }


}
