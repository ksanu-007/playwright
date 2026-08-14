export default class VaultDashboardLocators {
  constructor(page) {
    this.page = page;
    this.dashboardHeading = page.locator('text=/Dashboard|Vault Dashboard/i').first();
    this.archiveCount = page.locator('[class*="stat"]').or(
      page.locator('text=/Archive|Archived/i')
    ).first();
    this.latestArchives = page.locator('table tbody tr').or(
      page.locator('[class*="archive-list"] tr')
    );
    this.errorMessages = page.locator('text=/Error|Failed|Exception|Alert/i');
  }
}
