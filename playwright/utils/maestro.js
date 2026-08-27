import { execSync, spawn } from 'child_process';
import path from 'path';
import { getLoggedInUser, setLoggedInUser, clearLoggedInUser } from './sessionState.js';

// Windows dev machines resolve the Maestro CLI via %LOCALAPPDATA%; macOS/Linux
// installs (including iOS, which only runs on macOS) put `maestro` on PATH.
// MAESTRO_BIN lets either be overridden explicitly.
const MAESTRO = process.env.MAESTRO_BIN
  || (process.platform === 'win32'
    ? `${process.env.LOCALAPPDATA}\\maestro\\maestro\\bin\\maestro.bat`
    : 'maestro');
const FLOWS_DIR = path.resolve('mobile-automation', 'flows');
const DEFAULT_PASSWORD = 'Abcd@1234567';
// Official Maestro doesn't support real iOS devices at all (Simulators only).
// Real-device runs go through the devicelab-dev/maestro-ios-device community
// patch instead: a separate bridge process (`maestro-ios-device --team-id
// <id> --device <udid>`, started outside this test run and left running)
// that `maestro test` then targets via --driver-host-port/--device, in place
// of the normal single-process Android/Simulator invocation.
const IOS_DRIVER_PORT = process.env.IOS_DRIVER_PORT || '6001';
// Falls back to this project's known real device — without a default here,
// an unset env var silently disables all real-device iOS flags below (see
// mobileEnvironmentSetup.js header for how this was found: iOS runs picked
// up the wrong device entirely with no explicit error).
const IOS_DEVICE_UDID = process.env.IOS_DEVICE_UDID || '00008030-000D68C42621802E';
// Undocumented `maestro test` flag (not listed in `maestro test --help`, found
// live via `strings` on maestro-cli-2.1.0.jar's RealIOSDeviceDriver/
// DriverBuilder classes) required for real iOS devices: without it, `maestro
// test` skips building/extracting the on-device XCTest runner driver into
// ~/.maestro/maestro-iphoneos-driver-build and crashes with a
// NoSuchFileException walking that (nonexistent) directory instead of a
// clear "team ID required" error. Confirmed live 2026-08-07 — adding this
// flag was the actual fix, not any bridge/DerivedData rebuild.
const IOS_TEAM_ID = process.env.IOS_TEAM_ID || '94GC8KLYG6';

class Maestro {
  constructor({ platform = 'android' } = {}) {
    this._loggedInUser = null;
    this.platform = platform;
  }

  get isLoggedIn() {
    return this._loggedInUser !== null;
  }

  _flowPath(name) {
    return name.includes(path.sep) ? name : path.resolve(FLOWS_DIR, name);
  }

  _buildCmd(flowPath, env) {
    const parts = [`"${MAESTRO}"`];
    if (this.platform === 'ios' && IOS_DEVICE_UDID) {
      parts.push(`--driver-host-port ${IOS_DRIVER_PORT}`, `--device ${IOS_DEVICE_UDID}`);
    }
    parts.push('test');
    // `--apple-team-id` is a `test`-subcommand option (undocumented — not in
    // `maestro test --help` — confirmed live via manual CLI invocation), so
    // it must come after 'test', unlike --driver-host-port/--device above.
    if (this.platform === 'ios' && IOS_DEVICE_UDID) {
      parts.push(`--apple-team-id ${IOS_TEAM_ID}`);
    }
    for (const [k, v] of Object.entries(env)) {
      parts.push(`--env ${k}="${v}"`);
    }
    parts.push(`"${flowPath}"`);
    return parts.join(' ');
  }

  _wakeDevice() {
    if (this.platform !== 'android') return; // adb has no iOS/simulator equivalent
    try {
      execSync('adb shell input keyevent 224', { timeout: 5000, encoding: 'utf-8', shell: true });
      execSync('adb shell input keyevent KEYCODE_WAKEUP', { timeout: 5000, encoding: 'utf-8', shell: true });
      execSync('adb shell wm dismiss-keyguard', { timeout: 5000, encoding: 'utf-8', shell: true });
    } catch {}
  }

  _runSync(flowPath, env = {}, retries = 1) {
    this._wakeDevice();
    const cmd = this._buildCmd(flowPath, env);
    const flowName = path.basename(flowPath);
    const envLabel = Object.keys(env).join(',');
    console.log(`  Maestro: ${flowName}${envLabel ? ' ' + envLabel : ''}`);
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return execSync(cmd, { cwd: process.cwd(), timeout: 360000, encoding: 'utf-8', shell: true });
      } catch (e) {
        if (attempt >= retries) {
          console.error(`  Maestro FAILED: ${flowName} — ${(e.message || '').slice(0, 300)}`);
          throw e;
        }
        console.log(`  Maestro retry ${attempt + 1}/${retries}: ${flowName}`);
        this._wakeDevice();
      }
    }
  }

  // Logs the device out (idempotent — the underlying *-logout.yaml flows are
  // already no-ops when nothing's logged in) and clears both the in-memory
  // and on-disk "who's logged in" bookkeeping so the next ensureLoggedIn()
  // doesn't mistake this device for still holding a session.
  logout() {
    const flow = this.platform === 'ios' ? 'ios-logout.yaml' : 'android-logout.yaml';
    try {
      this._runSync(this._flowPath(flow), {});
    } catch (e) {
      console.log(`  Maestro (${this.platform}): logout failed (continuing) — ${(e.message || '').slice(0, 150)}`);
    }
    this._loggedInUser = null;
    clearLoggedInUser(this.platform);
  }

  ensureLoggedIn(email) {
    // this._loggedInUser only reflects what THIS process has done — a
    // session left over from a previous/crashed run, or from a different
    // spec file's user, is invisible to it. The on-disk state (checked here
    // via getLoggedInUser) survives across processes, so it's the only
    // reliable signal that some OTHER user is already active on the device
    // and needs logging out before we trust ensure-logged-in.yaml's own
    // "is anyone logged in at all" check.
    const activeUser = getLoggedInUser(this.platform);
    if (activeUser && activeUser !== email) {
      console.log(`  Maestro (${this.platform}): wrong user logged in (${activeUser}) — logging out before switching to ${email}`);
      this.logout();
    }
    if (this._loggedInUser !== email || activeUser !== email) {
      const flow = this.platform === 'ios' ? 'ios-ensure-logged-in.yaml' : 'ensure-logged-in.yaml';
      console.log(`  Maestro (${this.platform}): login as ${email}`);
      this._runSync(this._flowPath(flow), { EMAIL: email, PASSWORD: DEFAULT_PASSWORD });
      this._loggedInUser = email;
      setLoggedInUser(this.platform, email);
    }
  }

  runSync(flowName, env = {}) {
    const userEmail = env.ANDROID_USER || env.EMAIL || this._loggedInUser;
    if (userEmail) this.ensureLoggedIn(userEmail);
    if (!env.PASSWORD) env.PASSWORD = DEFAULT_PASSWORD;
    return this._runSync(this._flowPath(flowName), env);
  }

  runAsync(flowName, env = {}) {
    const userEmail = env.ANDROID_USER || env.EMAIL || this._loggedInUser;
    if (userEmail) this.ensureLoggedIn(userEmail);
    if (!env.PASSWORD) env.PASSWORD = DEFAULT_PASSWORD;
    this._wakeDevice();
    const flowPath = this._flowPath(flowName);
    const cmd = this._buildCmd(flowPath, env);
    const flowNameShort = path.basename(flowPath);
    console.log(`  Maestro (async): ${flowNameShort} ${Object.keys(env).join(',')}`);
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, { cwd: process.cwd(), shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      proc.stdout.on('data', d => stdout += d.toString());
      proc.stderr.on('data', d => stdout += d.toString());
      proc.on('error', reject);
      proc.on('close', code => {
        if (code === 0 || (!stdout.includes('FAILED') && !stdout.includes('Error'))) resolve(stdout);
        else reject(new Error(`Maestro async failed: ${flowNameShort} (exit ${code})`));
      });
    });
  }
}

export default Maestro;
export { MAESTRO, FLOWS_DIR, DEFAULT_PASSWORD };
