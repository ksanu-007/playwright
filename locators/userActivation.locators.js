export default class UserActivationLocator {
  constructor(page) {
    this.page = page;

    // Invited Users List
    this.InvitedUsersLink = page.getByRole('link', { name: 'Invited Users' });
    this.InvitedUsersTable = page.locator('table');
    this.UserRows = page.locator('tbody tr');
    this.ViewButton = page.getByRole('button', { name: /View|view/ });
    
    // User Details Modal/Page
    this.UserDetailsModal = page.locator('[role="dialog"]');
    this.UserNameInDetails = page.locator('text=/User Name|Username/');
    this.UserEmailInDetails = page.locator('text=/Email/');
    this.ActivationLinkField = page.locator('input[readonly]');
    this.CopyLinkButton = page.getByRole('button', { name: /Copy|copy/ });
    this.CloseDetailsButton = page.locator('button:has-text("Close")');
    
    // Activation Page (Password Set)
    this.PasswordInput = page.locator('input[type="password"]').first();
    this.ConfirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.ActivateButton = page.getByRole('button', { name: /Activate|activate|Set Password/ });
    this.SuccessMessage = page.locator('text=/Success|Activated|activated successfully/i');
    
    // Navigation
    this.BackButton = page.getByRole('button', { name: /Back|back/ });
    this.BreadcrumbInvitedUsers = page.locator('text=Invited Users');
    
    // Pagination
    this.NextPageButton = page.getByRole('button', { name: 'Next', exact: true });
    this.ShowEntriesSelect = page.locator('select');
  }
}
