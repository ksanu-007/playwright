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
    this.LogoutButton = page.getByRole('button', { name: 'Logout' });
  }
}
