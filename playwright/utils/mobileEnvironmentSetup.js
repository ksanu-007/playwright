import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// =============================================================================
// Self-healing pre-flight for real-device Maestro runs. Wired in as
// playwright.config.js's globalSetup, so it runs once, automatically, before
// ANY `npx playwright test` invocation — no manual steps required.
//
// Exists because three separate, unrelated pieces of environment state were
// each independently found (2026-08-09) to silently go stale between
// sessions and break every iOS/Android orchestration test until manually
// diagnosed and fixed:
//   1. Orphaned `maestro.cli.AppKt` Java processes from earlier
//      crashed/interrupted runs hold onto the Android device connection,
//      causing new runs to fail with a TcpForwarder timeout.
//   2. adb's own port-forward state can go stale independently of the
//      device connection itself.
//   3. The iOS real-device XCTest instrumentation session (started by the
//      community `maestro-ios-device` bridge) silently dies over time even
//      though the bridge *process* itself keeps running — every following
//      `maestro test` call then times out waiting for it, with no clear
//      error pointing at the real cause.
//
// None of these are fixed by reconnecting the physical device — they're
// Mac-side process/cache state, not USB/pairing state. Each check below is
// cheap (a few hundred ms) when the environment is already healthy, so this
// adds negligible overhead to a normal run while eliminating a whole class
// of "why is this failing again" sessions.
// =============================================================================

const IOS_TEAM_ID = process.env.IOS_TEAM_ID || '94GC8KLYG6';
const IOS_DEVICE_UDID = process.env.IOS_DEVICE_UDID || '00008030-000D68C42621802E';
const IOS_DRIVER_PORT = process.env.IOS_DRIVER_PORT || '6001';

// Ensure well-known tool locations are on PATH even if the invoking shell
// never exported them — the exact gap that caused `adb`/`maestro` to go
// "not found" earlier in this project's own history.
function extendPath() {
  const extra = [
    path.join(os.homedir(), 'AndroidSDK', 'platform-tools'),
    path.join(os.homedir(), '.maestro', 'bin'),
  ];
  process.env.PATH = `${extra.join(':')}:${process.env.PATH || ''}`;
}

function sh(cmd, timeout = 15000) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

function spawnDetachedLogged(cmd, args, logPath) {
  const fd = fs.openSync(logPath, 'a');
  const child = spawn(cmd, args, { detached: true, stdio: ['ignore', fd, fd] });
  child.unref();
  return child;
}

async function waitForLogMatch(logPath, pattern, timeoutMs, intervalMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(logPath) && pattern.test(fs.readFileSync(logPath, 'utf-8'))) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

function androidConnected() {
  return /\bdevice\b/.test(sh('adb devices'));
}

function iosConnected() {
  const out = sh('python3 -m pymobiledevice3 usbmux list');
  return out.includes(IOS_DEVICE_UDID);
}

// Fix #1 + #2: orphaned processes and stale adb port-forward state.
function healAndroid() {
  console.log('[mobile-setup] Clearing orphaned Maestro processes and stale adb state...');
  sh('pkill -f "maestro.cli.AppKt"');
  sh('adb kill-server');
  sh('adb start-server');
}

// Fix #3a: the bridge process itself (not its internal XCTest session) —
// only started if genuinely not running. Restarting a HEALTHY bridge is
// unnecessary (its own Xcode DerivedData build cache can take up to ~10min
// to reconstruct) — only the XCTest session below needs a guaranteed-fresh
// start every run.
async function ensureIOSBridge() {
  const running = sh(`pgrep -f "maestro-ios-device --team-id ${IOS_TEAM_ID}"`).trim();
  if (running) return;
  console.log('[mobile-setup] iOS bridge not running — starting it (can take up to 10 min on a cold cache)...');
  const logPath = path.join(os.tmpdir(), 'maestro-ios-device-bridge.log');
  fs.writeFileSync(logPath, '');
  spawnDetachedLogged('maestro-ios-device', ['--team-id', IOS_TEAM_ID, '--device', IOS_DEVICE_UDID, '--driver-host-port', IOS_DRIVER_PORT], logPath);
  const ready = await waitForLogMatch(logPath, /Ready!/, 600000, 5000);
  if (!ready) console.log('[mobile-setup] Warning: bridge did not confirm readiness in time — continuing anyway.');
}

// Fix #3b (the actual root cause behind most "iOS driver not ready" /
// NoSuchFileException failures): rebuild the on-device XCTest runner driver
// if `maestro test`'s own expected output directory is missing. `maestro
// test` only triggers this build itself when it auto-picks a device with no
// --device flag — our setup always passes --device explicitly, so that path
// never runs, and once this directory goes missing/stale nothing rebuilds
// it automatically. Confirmed live 2026-08-09: building the same Xcode
// project Maestro already vendors locally, directly into the path it reads
// from, resolves it.
function ensureIOSDriverBuild() {
  const productsDir = path.join(os.homedir(), '.maestro', 'maestro-iphoneos-driver-build', 'driver-iphoneos', 'Build', 'Products');
  if (fs.existsSync(productsDir) && fs.readdirSync(productsDir).length > 0) return;
  console.log('[mobile-setup] iOS driver build missing — building fresh (a few minutes)...');
  const projectPath = path.join(os.homedir(), '.maestro', 'maestro-ios-xctest-runner', 'maestro-driver-ios.xcodeproj');
  const derivedData = path.join(os.homedir(), '.maestro', 'maestro-iphoneos-driver-build', 'driver-iphoneos');
  sh(
    `xcodebuild clean build-for-testing -project "${projectPath}" -derivedDataPath "${derivedData}" ` +
    `-scheme maestro-driver-ios -destination "generic/platform=iOS" DEVELOPMENT_TEAM=${IOS_TEAM_ID}`,
    480000
  );
}

// Fix #3c: always replace any existing XCTest session with a fresh one.
// This is the piece that was observed going silently stale over time (the
// bridge process stays up, but the on-device HTTP instrumentation server it
// forwards to stops responding) — there's no cheap, reliable way to check
// "is the existing session actually healthy" short of a real test
// invocation, so the safe choice is to always start clean rather than trust
// a session that may already be dead.
async function ensureFreshIOSSession() {
  sh('pkill -f "xcodebuild test-without-building.*maestro-driver-ios"');
  const productsDir = path.join(os.homedir(), '.maestro', 'maestro-iphoneos-driver-build', 'driver-iphoneos', 'Build', 'Products');
  const xctestrun = fs.existsSync(productsDir)
    ? fs.readdirSync(productsDir).find(f => f.endsWith('.xctestrun'))
    : null;
  if (!xctestrun) return;
  console.log('[mobile-setup] Starting a fresh iOS XCTest instrumentation session...');
  const logPath = path.join(os.tmpdir(), 'maestro-xctest-session.log');
  fs.writeFileSync(logPath, '');
  spawnDetachedLogged('xcodebuild', [
    'test-without-building',
    '-xctestrun', path.join(productsDir, xctestrun),
    '-destination', `id=${IOS_DEVICE_UDID}`,
  ], logPath);
  const serving = await waitForLogMatch(logPath, /FlyingFox\] starting server port/, 60000, 3000);
  if (!serving) console.log('[mobile-setup] Warning: XCTest session did not confirm it started serving — continuing anyway.');
}

export default async function globalSetup() {
  extendPath();

  const android = androidConnected();
  const ios = iosConnected();
  if (!android && !ios) {
    console.log('[mobile-setup] No mobile devices detected — skipping (web-only run).');
    return;
  }

  console.log('[mobile-setup] Preparing real-device test environment...');
  if (android) healAndroid();
  if (ios) {
    await ensureIOSBridge();
    ensureIOSDriverBuild();
    await ensureFreshIOSSession();
  }
  console.log('[mobile-setup] Environment ready.');
}
