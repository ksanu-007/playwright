export default class SettingsLocators {
  constructor(page) {
    this.page = page;
    this.settingsLink = page.getByRole('button', { name: /Settings/i });
    this.archivingLink = page.getByRole('link', { name: /Archiving/i });
  }
}
