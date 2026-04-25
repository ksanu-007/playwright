export default class LoginPageLocators {
  constructor(page) {
    this.page = page;
    this.passwordInput = page.getByPlaceholder('Enter Password');
    this.confirmPasswordInput = page.getByPlaceholder('Confirm Password');
    this.CheckBoxForActivateUser = page.locator("//input[@type='checkbox']");
    this.ActivateButton = page.getByRole('button', { name: 'Activate' });
  }
}