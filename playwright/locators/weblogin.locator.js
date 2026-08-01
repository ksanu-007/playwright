export default class WebLoginPageLocator {
    constructor(page) {
        this.page = page;
        this.emailInput = page.locator("//input[@placeholder='Enter email address']");
        this.passwordInput = page.locator("//input[@type='password']");
        this.continueButton = page.locator("(//div[@class='click-ripple'])[2]");
        this.nextButton = page.locator("//button[.//span[text()='Next']]");
        this.doneButton = page.locator("//button[.//span[text()='Done']]");
        this.featureXButton = page.locator(".responsiveModalContainer > div:nth-child(2) > div > div > button");
        this.loginverification = page.locator("//div[text()='How can I help?']");
        
    }
}


