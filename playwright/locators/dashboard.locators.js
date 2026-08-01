export default class DashboardPageLocator {
  constructor(page) {
    this.page = page;

    // Add/Invite User Buttons and Navigation
    this.AddUserButton = page.getByRole('button', { name: 'Add User' });
    this.UserAndGroups = page.locator('div').filter({ hasText: /^Users & Groups$/ }).first();
    this.InviteUser = page.getByRole('link', { name: 'Invited Users' }).first();
    this.InvitedUserLabel = page.getByText('Invited Users', { exact: true }).first();
    
    // User Form Fields
    this.FirstName = page.getByPlaceholder('First Last');
    this.FirtName = this.FirstName;
    this.Email = page.getByPlaceholder('user@example.com');
    this.InviteButton = page.getByRole('button', { name: 'Invite' });
    this.InviteAnotherUserLabel = page.getByText('Invite another user');
    this.InviteAnotherUserButton = page.getByRole('button', { name: 'Invite another user' });
    
    // Dialog and Modal Actions
    this.DoneButton = page.getByRole('button', { name: 'Done' });
    this.closeButton = page.locator("//span[text() = 'close']");
    this.YesCancelButton = page.locator("//span[text() = 'Yes, cancel']");
    
    // User List Actions
    this.UserTable = page.locator('table');
    this.UserTableRows = page.locator('tbody tr');
    this.ViewUserButton = page.locator('button:has-text("View")').first();
    this.DeleteUserButton = page.locator('button:has-text("Delete")');
    this.EditUserButton = page.locator('button:has-text("Edit")');
    
    // Logout
    this.LogoutButton = page.locator('text=Logout');
  }
}
