import { Page, expect } from '@playwright/test';
import { test } from '@playwright/test';
import { Locator } from '@playwright/test';
import dashboardPage from "../pages/dashboardpage.js";

export default class commonMethod {
    constructor(page) {
        this.page = page;
    }

    //click operation
    async click(locator) {
        await this.page.click(locator);
    }
    //fill operation
    async fill(locator, value) {
        await this.page.fill(locator, value);
    }
}