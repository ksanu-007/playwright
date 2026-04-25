
import DashboardPageLocator from '../locators/dashboard.locators.js';
import commonMethod from '../utils/common.js';
import { expect } from '@playwright/test';
<<<<<<< HEAD
=======
import LoginPageLocators from '../locators/login.locators.js';
import testData from '../utils/testData.json';
import test from 'node:test';
>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)


export default class DashboardPage {
  constructor(page) {
    this.page = page;
<<<<<<< HEAD
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
=======
    this.loginPageLocators = new LoginPageLocators(page);
    this.dashboardpagelocators = new DashboardPageLocator(page);
    this.common = new commonMethod(page);
  }
  async enterUserDetails(username, email) {
    const users = [];
    const pwd = [];
    for (let i = 150; i < 160; i++) {
      const name = username + i;
      const usename = await this.common.fill(this.dashboardpagelocators.FirtName, name);
      const user_name = await this.dashboardpagelocators.FirtName.inputValue();
      console.log(user_name);
      users.push(user_name);
      console.log("users array: ", users);
      await this.common.fill(this.dashboardpagelocators.Email, username + i + email);
      const user_password = await this.dashboardpagelocators.Email.inputValue();
      console.log(user_password);
      pwd.push(user_password);
      await this.common.click(this.dashboardpagelocators.InviteButton);
      await this.verifyInviteAnotherUserLabel()
      await this.common.click(this.dashboardpagelocators.InviteAnotherUserButton);
    };
    await this.common.click(this.dashboardpagelocators.InviteUserCloseButton);
    await this.common.click(this.dashboardpagelocators.YesCancelButton);
    for (let j = 0; j < users.length; ) {
      for (let k = 0; k < pwd.length; k++) {
        const search_username = users[j];
        const activatepassword = pwd[k];
        await this.common.fill(this.dashboardpagelocators.InputUserName, search_username);
        await this.page.waitForTimeout(10000);
        await this.common.click(this.dashboardpagelocators.CheckBox);
        await this.common.click(this.dashboardpagelocators.ViewUserDetails);
        await this.common.click(this.dashboardpagelocators.CopyActivationLink);
        const link = await this.dashboardpagelocators.ActivationLinkInput.inputValue();
        console.log("Activation Link:", link);
        await this.page.goto(link);
        await this.page.waitForTimeout(10000);
        await this.common.fill(this.loginPageLocators.passwordInput, testData.logincreds.password);
        await this.common.fill(this.loginPageLocators.confirmPasswordInput, testData.logincreds.password);
        await this.common.click(this.dashboardpagelocators.ActivationCheckBox);
        await this.common.click(this.dashboardpagelocators.ActivateButton);
        await this.common.verifyElementVisible(this.dashboardpagelocators.HelpButton);
        await this.page.goto(testData.logincreds.dashboardUrl);
        console.log("users", j++);
      }
    }
  }

  async verifyInviteAnotherUserLabel() {
    await expect(this.dashboardpagelocators.InviteAnotherUserLabel).toBeVisible();


  }
  async verifyDashboardScreen() {
    await expect(this.page).toHaveURL('https://admin.netsferetest.com/#/Dashboard');
  }
>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)
}




<<<<<<< HEAD
=======

>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)
