export default class ServicePlanLocators {
  constructor(page) {
    this.page = page;
    this.servicePlansHeading = page.getByRole('heading', { name: /Service Plans/i }).or(
      page.locator('text=/Service Plans/i').first()
    );
    this.upgradeWithCreditCard = page.getByRole('button', { name: /Upgrade with Credit Card/i });
    this.proceedButton = page.getByRole('button', { name: /Proceed/i });
  }
}
