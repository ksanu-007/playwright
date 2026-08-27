import fs from 'fs';
import os from 'os';
import path from 'path';

// =============================================================================
// Tracks which account is actually logged in on each physical device, on
// disk, across separate Playwright process runs.
//
// Maestro's own in-memory tracking (Maestro._loggedInUser) only survives
// within a single process — iostoweb.spec.js S16 already documents this exact
// gap (an explicit device-side logout has to manually null out
// _loggedInUser, or the wrapper keeps assuming its own user is still active).
// It's blind in the other direction too: a session left over from a
// previous/crashed run, or from a different spec file that logged in as a
// different user, looks IDENTICAL to "already logged in as the user we
// want" to ensure-logged-in.yaml / ios-ensure-logged-in.yaml — both flows
// only check whether ANY session is active, never whose. That silently runs
// the rest of the suite as the wrong account instead of failing loudly.
//
// This file is the shared source of truth both Maestro (utils/maestro.js)
// and MaestroRunner (utils/maestroRunner.js) check before trusting an
// already-active session, so a mismatched account gets logged out before
// automation proceeds, regardless of which wrapper is driving the run.
// =============================================================================
const STATE_FILE = path.join(os.tmpdir(), 'netsfere-mobile-session-state.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

export function getLoggedInUser(platform) {
  return readState()[platform] || null;
}

export function setLoggedInUser(platform, email) {
  const state = readState();
  state[platform] = email;
  writeState(state);
}

export function clearLoggedInUser(platform) {
  setLoggedInUser(platform, null);
}
