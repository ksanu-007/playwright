import testData from '../utils/testData.json';

export default class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async openArchiving() {
    const baseUrl = testData.appUrl.testUrl.replace('/#/login', '');
    await this.page.goto(`${baseUrl}/#/Archiving`, { waitUntil: 'load', timeout: 30000 });
  }

  async openServicePlans() {
    const baseUrl = testData.appUrl.testUrl.replace('/#/login', '');
    await this.page.goto(`${baseUrl}/#/Service Plans`, { waitUntil: 'load', timeout: 30000 });
  }
}
