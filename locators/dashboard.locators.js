import { Locator, Page } from "@playwright/test";
import { expect } from '@playwright/test';

export class dashboardpagelocator {
  constructor(page) {
    this.page = page;
    
      const AddUser=this.AddUserButton=page.getByRole('button', { name: 'Add User' });
      const UserAndGroups=page.locator('div').filter({ hasText: /^Users & Groups$/ }).first();
      const InviteUser=page.getByRole('link', { name: 'Invited Users' });
      const InvitedUserLabel=page.getByText('Invited Users', { exact: true }).first();
      const FirtName= page.getByPlaceholder('First Last');
      const Email=page.getByPlaceholder('user@example.com');
      const InviteButton= page.getByRole('button', { name: 'Invite' })
      const InviteAnotherUserLabel=page.getByText('Invite another user');
      const InviteAnotherUserButton=page.getByRole('button', { name: 'Invite another user' });
      const DoneButton=page.getByRole('button', { name: 'Done' });
      const LogoutButton=page.getByRole('button', { name: 'Logout' });
      
    }
}
module.exports=dashboardpagelocator;