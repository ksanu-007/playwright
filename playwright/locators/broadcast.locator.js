export default class BroadcastPageLocator {
    constructor(page) {
        this.page = page;
        this.BroadcastTab = page.locator('div').filter({ hasText: /^Broadcast$/ }).first();
        this.AddBroadcastButton = page.getByRole('button', { name: 'Add Broadcast Channel' });
        this.EnterBroadcastChannelName = page.locator("//input[@placeholder='Broadcast Channel Name']");
        this.EnterBroadcastChannelDescription = page.locator("//input[@placeholder='Broadcast Channel Description']");
        this.SelectAudienceButton = page.getByRole('button', { name: 'Select Audience' });
        this.SearchGroupInBroadcast = page.locator("//input[@placeholder='Search Groups']");
        this.SelectSearchGroupInBroadcast = page.locator("(//div[contains(@class,'table-responsive')])[1]/table/tbody/tr/td[1]");
        this.SaveChangesAndReturnButton = page.locator("//div[text()='Save Changes and Return']");
        this.AddNewBroadcastButton = page.locator("(//div[@class='click-ripple'])[7]");
        this.SuccessMessage = page.locator('//div[text()="Successfully added Broadcast Channel."]');
        this.closeButton = page.locator("//span[text()='Close']");
        this.AddaFilterButton = page.locator("//span[text()='Add a filter']");
        this.FilterBroadcastChannelName = page.locator("//input[@placeholder='Broadcast Channel Name']");
        this.selectbroadcastchannel = page.locator("//div[contains(@class,'table-responsive')]/table/tbody/tr[1]");
        this.deletebroadcastchannel = page.getByText('Delete Broadcast Channel', { exact: true });

    }
}