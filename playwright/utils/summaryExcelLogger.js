import path from 'path';
import { execFileSync } from 'child_process';

// Playwright test always runs with cwd = the project root (playwright/), so
// plain process.cwd()-relative paths work without needing import.meta.url —
// which, confirmed live, breaks this project's CJS transform outright
// ("exports is not defined in ES module scope") the moment any file uses it.
const WORKBOOK_PATH = path.resolve(process.cwd(), 'testdata/summary-runs.xlsx');
const WRITER_SCRIPT = path.resolve(process.cwd(), 'utils/summaryExcelWriter.cjs');

// The app's generated summary reads as "Summary: ... Action Items: ...", both
// in one block. Splitting on that literal marker keeps them as two columns
// instead of one blob you'd have to scan through.
function splitSummaryAndActionItems(text) {
  const marker = 'Action Items:';
  const idx = text.indexOf(marker);
  if (idx === -1) return { summary: text, actionItems: '' };
  return {
    summary: text.slice(0, idx).trim(),
    actionItems: text.slice(idx + marker.length).trim(),
  };
}

/**
 * Appends one row per completed run to testdata/summary-runs.xlsx, creating
 * the workbook with a header row the first time it's called. Delegates to a
 * plain CommonJS subprocess — see summaryExcelWriter.cjs for why.
 */
export async function appendSummaryRun({ timestamp, groupName, messageCount, summary }) {
  const { summary: summaryOnly, actionItems } = splitSummaryAndActionItems(summary);
  execFileSync('node', [
    WRITER_SCRIPT,
    JSON.stringify({ workbookPath: WORKBOOK_PATH, timestamp, groupName, messageCount, summary: summaryOnly, actionItems }),
  ]);
  return WORKBOOK_PATH;
}
