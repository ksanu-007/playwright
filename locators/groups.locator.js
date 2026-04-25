export default class GroupsPageLocator {
  constructor(page) {
    this.page = page;   
    this.GroupsTab = page.getByRole('link', { name: 'Groups' });
    this.AddGroupButton = page.getByRole('button', { name: 'Add Group' });
    this.GroupNameInput = page.locator("//input[@placeholder='Group Name']");
    this.GroupDescriptionInput = page.locator("//input[@placeholder='Shorter Name for your Group when abbreviated']");
    this.EditMembersButton = page.getByRole('button', { name: 'Edit Members' });
    this.SelectMembersCheckBox = page.locator("(//i[contains(@class,'fa-square')])[1]");
    this.SaveButton = page.getByText('Save');
    this.EditOwnersButton = page.getByRole('button', { name: 'Edit Owners' });
    this.SelectOwnersCheckBox = page.locator("(//i[contains(@class,'fa-square')])[1]");
    this.SaveButton = page.getByText('Save');
    this.AddButton = page.getByRole('button', { name: 'Add' });
    this.SuccessMessage = page.getByText('Successfully added group.');
    this.closeButton = page.getByRole('button', { name: 'Close' });

  }
}