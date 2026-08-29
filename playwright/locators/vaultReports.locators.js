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
//  - The Keyword field's placeholder is "Enter keyword to search"; the
//    Message ID field's placeholder is "Enter up to 25 message IDs
//    separated by commas" (confirmed live 2026-08-28).
//  - After Submit, the new report appears as a table row with status
//    "Compiling Report: N messages remaining." which later becomes
//    "Completed in HH:MM:SS" once done, with a real Message Count.
export default class VaultReportsLocators {
  constructor(page) {
    this.page = page;

    this.reportsNavLink = page.locator('text=Reports').first();
    this.newReportButton = page.locator('button:has-text("New Report")').first();

    this.reportNameInput = page.locator('input[placeholder="Enter a report name"]').first();
    this.keywordInput = page.locator('input[placeholder="Enter keyword to search"]').first();
    this.conversationIdInput = page.locator('input[placeholder="Enter conversation IDs separated by commas"]').first();
    this.messageIdInput = page.locator('input[placeholder="Enter up to 25 message IDs separated by commas"]').first();

    this.submitButton = page.locator('button:has-text("Submit")').first();
    this.cancelButton = page.locator('button:has-text("Cancel")').first();

    // Confirmed live 2026-08-29: selecting a report row (a plain row click)
    // reveals an Export/Delete/More information toolbar in place of the New
    // Report button. Export downloads a zip containing a CSV, an HTML copy,
    // and a PDF copy of the same report — all sharing the report's slugified
    // name as a filename prefix.
    this.exportButton = page.locator('button:has-text("Export")').first();
  }

  reportRow(reportName) {
    return this.page.locator('tr').filter({ hasText: reportName }).first();
  }
}
