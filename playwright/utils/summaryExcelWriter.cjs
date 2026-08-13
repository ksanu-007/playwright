// Plain CommonJS, run as a standalone subprocess (see summaryExcelLogger.js).
// exceljs is CommonJS-only and has no "exports" map; importing it via ESM
// `import` inside Playwright's transformed test files throws "exports is not
// defined in ES module scope" — confirmed live, and this project has never
// imported a bare npm CJS package from an ESM-style file before. Running the
// write here, in a plain `node script.cjs` process, sidesteps that transform
// entirely, since it never touches this file.
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const SHEET_NAME = 'Summaries';
const HEADERS = ['Run Timestamp', 'Conversation Name', 'Message Count', 'Summary', 'Action Items'];

async function main() {
  const { workbookPath, timestamp, groupName, messageCount, summary, actionItems } = JSON.parse(process.argv[2]);

  const workbook = new ExcelJS.Workbook();
  let sheet;

  if (fs.existsSync(workbookPath)) {
    await workbook.xlsx.readFile(workbookPath);
    sheet = workbook.getWorksheet(SHEET_NAME);
  }
  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow(HEADERS);
    sheet.getRow(1).font = { bold: true };
    sheet.columns = [{ width: 22 }, { width: 30 }, { width: 14 }, { width: 90 }, { width: 60 }];
  }

  sheet.addRow([timestamp, groupName, messageCount, summary, actionItems]);

  fs.mkdirSync(path.dirname(workbookPath), { recursive: true });
  await workbook.xlsx.writeFile(workbookPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
