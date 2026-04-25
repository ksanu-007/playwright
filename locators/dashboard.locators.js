export default class DashboardPageLocator {
  constructor(page) {
    this.page = page;

    this.AddUserButton = page.getByRole('button', { name: 'Add User' });
    this.UserAndGroups = page.locator('div').filter({ hasText: /^Users & Groups$/ }).first();
    this.InviteUser = page.getByRole('link', { name: 'Invited Users' });
    this.InvitedUserLabel = page.getByText('Invited Users', { exact: true }).first();
    this.FirtName = page.getByPlaceholder('First Last');
    this.Email = page.getByPlaceholder('user@example.com');
    this.InviteButton = page.getByRole('button', { name: 'Invite' });
    this.InviteAnotherUserLabel = page.getByText('Invite another user');
    this.InviteAnotherUserButton = page.getByRole('button', { name: 'Invite another user' });
    this.DoneButton = page.getByRole('button', { name: 'Done' });
<<<<<<< HEAD
    this.LogoutButton = page.locator('text=Logout');
=======
    this.InviteUserCloseButton = page.locator(`span:has-text("close")`);
    this.LogoutButton = page.locator('text=Logout');

    this.CancelButton = page.getByRole('button', { name: 'Cancel' });
    this.YesCancelButton = page.getByRole('button', { name: 'Yes, Cancel' });

    this.InputUserName = page.getByPlaceholder('Jane Doe');
    this.CheckBox = page.locator("(//i[contains(@class,'fa-square')])[2]");

    this.ViewUserDetails = page.getByText('View User Details');
    this.CopyActivationLink = page.getByRole('button', { name: 'copy', exact: true });
    this.ActivationLinkInput = page.locator("//input[contains(@value,'#activate')]");

    this.ActivationCheckBox = page.locator('//form[2]/div[5]/div[1]');
    this.ActivateButton = page.locator("//button[@type='submit']")
    this.HelpButton = page.locator('//span[text()="How can I help?"]')

    this.displayName = page.locator("(//table[contains(@class, 'table table-striped')]/tbody/tr/td[3])");
    
>>>>>>> efb2ebc (git ignore commit message/MCP Implemented code)
  }
}
