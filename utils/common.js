// import { Page, expect } from '@playwright/test';
// import { test } from '@playwright/test';
// import { Locator } from '@playwright/test';
// import dashboardPage from "../pages/dashboardpage.js";

export default class commonMethod {
    constructor(page) {
        this.page = page;
    }

    //click operation
    async click(locator) {
       console.log("Locator to be clicked: ", locator);
        await locator.click();
    }
    //fill operation
    async fill(locator, value) {
        console.log("Locator to be filled: ", locator, " with value: ", value);
        await locator.fill(value);
    }
}

