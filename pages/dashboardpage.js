import { test, expect } from '@playwright/test';
import commonMethod from "../utils/common.js";
import { dashboardpage } from '../locators/dashboard.locators.js';
import { Locator } from '@playwright/test';

const dashboardpagelocators = new dashboardpage();
const commonMethod = new commonMethod();

export default class dashboardpage {
    constructor(page) {
        this.page = page;
    }
    async enterUserDetails(username, email) {
       for (let i = 21; i < 23; i++) {
        await commonMethod.fill(dashboardpagelocators.FirtName, username + i);
        await commonMethod.fill(dashboardpagelocators.Email, username + i + email);
        await commonMethod.click(dashboardpagelocators.InviteButton);
        await this.verifyInviteAnotherUserLabel();
        await commonMethod.click(dashboardpagelocators.InviteAnotherUserButton);
    };
    }

    async verifyInviteAnotherUserLabel() {
        await expect(dashboardpagelocators.InviteAnotherUserLabel).toBeVisible();

    }
    async verifyDashboardScreen(){
        await expect(this.page).toHaveURL('https://admin.netsferetest.com/#/Dashboard');
    }
}




