
import DashboardPageLocator from '../locators/dashboard.locators.js';
import commonMethod from '../utils/common.js';
import { expect } from '@playwright/test';


export default class DashboardPage {
  constructor(page) {
    this.page = page;
    this.dashboardpagelocators = new DashboardPageLocator(page);
    this.common = new commonMethod(page);
  }
    async enterUserDetails(username, email) {
       for (let i = 108; i < 110; i++) {
        await this.common.fill(this.dashboardpagelocators.FirtName, username + i);
        await this.common.fill(this.dashboardpagelocators.Email, username + i + email);
        await this.common.click(this.dashboardpagelocators.InviteButton);
        await this.verifyInviteAnotherUserLabel();
        await this.common.click(this.dashboardpagelocators.InviteAnotherUserButton);
    };
    }

    async verifyInviteAnotherUserLabel() {
        await expect(this.dashboardpagelocators.InviteAnotherUserLabel).toBeVisible();

    }
    async verifyDashboardScreen(){
        await expect(this.page).toHaveURL('https://admin.netsferetest.com/#/Dashboard');
    }
}




