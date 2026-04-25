export default class LoginPage {
    constructor(page) {
        this.page = page;
        this.usernameInput = page.locator(`//input[@type='email']`);
        this.continueButton = page.locator(`//button[@type='submit']`)
        this.passwordInput = page.locator(`//input[@type='password']`);
        this.loginButton = page.locator(`//button[@type='submit']`);
<<<<<<< HEAD
=======
        this.confirmPasswordInput = page.locator(`//input[@placeholder='Confirm Password']`);
        this.CheckBoxForActivateUser = page.locator('//form[2]/div[5]/div[1]');
        this.ActivateButton = page.getByRole('button', { name: 'Activate' });
>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)
    }

    async loginNetsfere()
    {
        // we have to pass the data as parameters
<<<<<<< HEAD
        await this.usernameInput.fill('atg@sanu.netsferetest.org')
        await this.continueButton.click()
        await this.passwordInput.fill('Abcd@1234567')
        await this.loginButton.click()
=======
        await this.usernameInput.fill('playo@sanu.netsferetest.org')
        await this.continueButton.click()
        await this.passwordInput.fill('Abcd@1234567')
        await this.continueButton.click()
>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)
        // await this.page.pause()
    }
}
