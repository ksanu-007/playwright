class LoginPage {
    constructor(page) {
        this.page = page;
        this.usernameInput = page.locator(`//input[@type='email']`);
        this.continueButton = page.locator(`//button[@type='submit']`)
        this.passwordInput = page.locator(`//input[@type='password']`);
        this.loginButton = page.locator(`//button[@type='submit']`);
    }

    async loginNetsfere()
    {
        await this.usernameInput.fill('atg@sanu.netsferetest.org')
        await this.continueButton.click()
        await this.passwordInput.fill('Abcd@1234567')
        await this.loginButton.click()
    }
}

module.exports =  LoginPage ;