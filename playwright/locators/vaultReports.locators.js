// Selectors captured live from the app (saims12@sanu.netsferetest.org,
// vault.netsferetest.com/#/app/reports):
//  - "Reports" nav item takes you to a table of previously generated reports
//    (columns: Id, Report Name, Creation Date, Deletion Date, Status,
//    Message Count, Call Count) plus a "New Report" button.
//  - "New Report" opens a form: Report Name / Time Zone / Expiration Date,
//    a Common Search Criteria section (Start/End Date, Participants), a
//    Messages Search Criteria section ("Include Messages" toggle — checked
//    by default — Keyword, Conversation ID, Message ID), and a Call Logs
//    Search Criteria section ("Include Call Logs" toggle).
//  - The Conversation ID field's placeholder is literally "Enter
//    conversation IDs separated by commas" and accepts a plain numeric id.
//  - After Submit, the new report appears as a table row with status
//    "Compiling Report: N messages remaining." which later becomes
//    "Completed in HH:MM:SS" once done, with a real Message Count.
export default class VaultReportsLocators {
  constructor(page) {
    this.page = page;

    this.reportsNavLink = page.locator('text=Reports').first();
    this.newReportButton = page.locator('button:has-text("New Report")').first();

    this.reportNameInput = page.locator('input[placeholder="Enter a report name"]').first();
    this.conversationIdInput = page.locator('input[placeholder="Enter conversation IDs separated by commas"]').first();

    this.submitButton = page.locator('button:has-text("Submit")').first();
    this.cancelButton = page.locator('button:has-text("Cancel")').first();
  }

  reportRow(reportName) {
    return this.page.locator('tr').filter({ hasText: reportName }).first();
  }
}
