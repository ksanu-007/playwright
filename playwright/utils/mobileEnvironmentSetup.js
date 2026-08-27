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
//
// Fixed 2026-08-18: a free Apple Developer account's automatic-signing
// provisioning profiles expire after about a week — confirmed live when
// a build that had sat untouched since creation failed every session
// with "This provisioning profile has expired" (0xe8008011), even though
// the Products directory still existed and this check let it slide.
// -allowProvisioningUpdates lets xcodebuild silently mint a fresh profile
// from the signed-in Apple ID instead of just failing, and a 6-day
// staleness check (safely inside the ~7-day expiry window) now forces a
// rebuild before that failure has a chance to happen.
function ensureIOSDriverBuild() {
  const productsDir = path.join(os.homedir(), '.maestro', 'maestro-iphoneos-driver-build', 'driver-iphoneos', 'Build', 'Products');
  const isStale = () => {
    const ageMs = Date.now() - fs.statSync(productsDir).mtimeMs;
    return ageMs > 6 * 24 * 60 * 60 * 1000;
  };
  if (fs.existsSync(productsDir) && fs.readdirSync(productsDir).length > 0 && !isStale()) return;
  console.log('[mobile-setup] iOS driver build missing or stale (>=6 days old, provisioning profile may have expired) — building fresh (a few minutes)...');
  const projectPath = path.join(os.homedir(), '.maestro', 'maestro-ios-xctest-runner', 'maestro-driver-ios.xcodeproj');
  const derivedData = path.join(os.homedir(), '.maestro', 'maestro-iphoneos-driver-build', 'driver-iphoneos');
  sh(`rm -rf "${derivedData}"`);
  sh(
    `xcodebuild clean build-for-testing -project "${projectPath}" -derivedDataPath "${derivedData}" ` +
    `-scheme maestro-driver-ios -destination "generic/platform=iOS" DEVELOPMENT_TEAM=${IOS_TEAM_ID} -allowProvisioningUpdates`,
    480000
  );
}

// Fix #3c: replace the existing XCTest session with a fresh one, UNLESS the
// current one already responds. This used to unconditionally kill+rebuild
// every run ("no cheap, reliable way to check if the existing session is
// healthy") — confirmed live 2026-08-18 that this was actively harmful, not
// just occasionally wasteful: on a real device, EVERY fresh
// `xcodebuild test-without-building` invocation re-installs the XCTest
// runner app, and iOS treats each fresh install as untrusted regardless of
// whether the identical build was already trusted moments earlier —
// forcing a manual re-trust (Settings -> General -> VPN & Device
// Management) on every single `npx playwright test` run. The health check
// below (a real, bounded-time request to the driver's own HTTP port) is
// the "short of a real test invocation" this comment used to say didn't
// exist — skip the kill+rebuild entirely when it already responds.
// A live session doesn't speak plain HTTP GET on "/" — it resets the
// connection immediately (curl exit 56), which is actually the healthy
// signal: confirmed live 2026-08-18, a real response (even a reset) comes
// back in ~20ms. A genuinely dead port instead either refuses the
// connection outright (exit 7) or hangs until curl's own timeout (exit 28)
// — those two are the only cases treated as unhealthy.
//
// Fixed 2026-08-18 (same day, later): the curl check alone is not
// sufficient — confirmed live after a multi-hour idle gap that the
// BRIDGE process (maestro-ios-device) can still be listening on this
// port and still return curl exit 56 even after the underlying
// `xcodebuild test-without-building` process (the actual on-device
// XCTest session) has died completely, with zero matching processes
// left. That state passed this check as "healthy" and then failed every
// real command with "Unable to launch app". Requiring the xcodebuild
// process to actually be alive closes that gap.
async function isIOSSessionHealthy() {
  const xctestRunning = sh(`pgrep -f "xcodebuild test-without-building.*maestro-driver-ios"`).trim();
  if (!xctestRunning) return false;
  try {
    execSync(`curl -s -o /dev/null --max-time 5 http://localhost:${IOS_DRIVER_PORT}/`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch (e) {
    const code = e.status;
    return code !== 7 && code !== 28;
  }
}

async function ensureFreshIOSSession() {
  if (await isIOSSessionHealthy()) {
    console.log('[mobile-setup] Existing iOS XCTest session already responds — reusing it.');
    return;
  }
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
  if (process.env.SKIP_MOBILE_SETUP === '1') {
    console.log('[mobile-setup] Skipped (SKIP_MOBILE_SETUP=1 — web-only invocation).');
    return;
  }

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
