import { exec } from 'child_process';
import path from 'path';
import Maestro, { DEFAULT_PASSWORD } from './maestro.js';

// =============================================================================
// MaestroRunner — orchestration layer on top of the existing Maestro class
// (utils/maestro.js). It does NOT re-implement flow-path resolution, command
// building, or device-wake logic — it reuses Maestro's own (already-verified
// live) internals for all of that, and only adds what the orchestration layer
// itself needs on top:
//   - a child_process.exec()-based Promise wrapper around a single flow run
//   - runIOS(flowName, env) / runAndroid(flowName, env)
//   - runParallel([...]) — Promise.all over multiple runIOS/runAndroid calls
//   - a best-effort device screenshot helper for Allure attachments
//
// Deliberately does NOT auto-trigger Maestro's own ensureLoggedIn()
// login-caching (unlike Maestro.runSync/runAsync) — orchestration specs drive
// login explicitly as their own Step 1 (often via runParallel), so silently
// re-running a login flow underneath would just double-run it (the same
// redundancy iostoweb.spec.js S16 already documents and avoids by hand).
// =============================================================================
class MaestroRunner {
  constructor() {
    this.ios = new Maestro({ platform: 'ios' });
    this.android = new Maestro({ platform: 'android' });
  }

  _instance(platform) {
    return platform === 'ios' ? this.ios : this.android;
  }

  // Best-effort, fire-and-forget dismissal of the stray iOS "Apple Account
  // Verification" system dialog — run unconditionally before EVERY iOS flow
  // (not just on retry), since it was confirmed live 2026-08-10 to
  // reappear on nearly every single launch during a stretch of device
  // re-auth expiry, not just occasionally as first seen 2026-08-07. A
  // guard against recursing into itself; swallows its own errors so a
  // dismiss failure never masks the real flow's result.
  async _dismissIOSDialogsIfNeeded(maestro, flowName) {
    if (maestro.platform !== 'ios' || flowName === 'ios-dismiss-system-dialogs.yaml') return;
    try {
      await this._execOnce(maestro, 'ios-dismiss-system-dialogs.yaml', {});
    } catch {}
  }

  async _execOnce(maestro, flowName, env) {
    await this._dismissIOSDialogsIfNeeded(maestro, flowName);
    const fullEnv = { ...env };
    if (!fullEnv.PASSWORD) fullEnv.PASSWORD = DEFAULT_PASSWORD;
    maestro._wakeDevice();
    const flowPath = maestro._flowPath(flowName);
    const cmd = maestro._buildCmd(flowPath, fullEnv);
    const label = path.basename(flowPath);
    console.log(`  MaestroRunner (${maestro.platform}): ${label} ${Object.keys(fullEnv).join(',')}`);

    return new Promise((resolve, reject) => {
      exec(cmd, { cwd: process.cwd(), timeout: 360000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = `${stdout || ''}${stderr || ''}`;
        if (!error && !/FAILED|Error/.test(output)) {
          resolve(output);
        } else {
          // Maestro prints its actual failure reason (assertion/element-not-found
          // details) near the END of stdout, not in exec()'s own error.message
          // (which is just "Command failed: <cmd>") — surface the output tail so
          // failures are diagnosable instead of reporting a blank reason. This
          // CLI build (devicelab-dev's maestro-runner fork) also prints a
          // promotional banner + ANSI color codes on every invocation, which
          // otherwise pushes the actual error out of a plain tail slice —
          // strip ANSI codes and the banner lines first.
          const clean = output
            .replace(/\x1b\[[0-9;]*m/g, '')
            .split('\n')
            .filter(line => !/Try maestro-runner|devicelab\.dev|Maestro iOS Real Device Support|Build your own distributed lab|maestro-runner from scratch|^[═╔╗╚╝\s]*$/.test(line))
            .join('\n')
            .trim();
          const reason = clean || (error && error.message) || 'unknown error';
          reject(new Error(`MaestroRunner: ${maestro.platform} flow "${label}" failed — ${reason.slice(-500)}`));
        }
      });
    });
  }

  // Real-device Maestro runs are known-flaky independent of this wrapper
  // (confirmed live — maestro.debuglog.DebugLogStore.finalizeRun/
  // FileUtils.zipDir can crash with a kotlinx.coroutines internal error /
  // NoSuchFileException when two `maestro test` processes race on writing/
  // zipping their debug-log directory at the same instant, which is an
  // internal Maestro CLI issue, not something a caller can prevent up
  // front). Bumped from 1 to 2 retries 2026-08-06 after this same race hit
  // twice in a row across two separate parallel-login attempts (once on the
  // iOS side, once on Android) — a single retry wasn't always enough
  // headroom for this particular race.
  //
  // Before EACH retry (never the first attempt, so the happy path pays zero
  // extra cost beyond the per-call iOS dialog check already in _execOnce):
  // force-relaunches the app (*-relaunch-app.yaml) — every "interior" flow
  // in this repo (2026-08-09) deliberately skips its own launchApp so it
  // doesn't reset iOS back to its Conversations root screen between every
  // single step (see ios-send-message.yaml's own header note); if a step
  // fails because the app genuinely crashed or got backgrounded, this is
  // what recovers it before the retry runs. Best-effort: a failure here is
  // swallowed so it never masks the real error from the retry itself.
  async _exec(maestro, flowName, env, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._execOnce(maestro, flowName, env);
      } catch (err) {
        if (attempt >= retries) throw err;
        console.log(`  MaestroRunner retry ${attempt + 1}/${retries} (${maestro.platform}): ${flowName} — ${err.message.slice(0, 150)}`);
        try {
          await this._execOnce(maestro, `${maestro.platform}-relaunch-app.yaml`, {});
        } catch {}
      }
    }
  }

  runIOS(flowName, env = {}) {
    return this._exec(this.ios, flowName, env);
  }

  runAndroid(flowName, env = {}) {
    return this._exec(this.android, flowName, env);
  }

  // Staggers thunk-based tasks by `staggerMs` before kicking off the next
  // one, then awaits all together. Added 2026-08-06 after repeatedly
  // reproducing a real Maestro CLI race live: two `maestro test` processes
  // launched at the EXACT same instant (the previous behavior, when callers
  // passed already-invoked promises — those Maestro child processes were
  // already spawned before runParallel ever saw them, so there was nothing
  // left to stagger) can collide while writing/zipping their debug-log
  // directory, crashing with a kotlinx.coroutines internal error. A short
  // stagger — passing thunks (`() => runner.runIOS(...)`) instead of
  // pre-invoked promises — avoids launching both processes in the same
  // instant without meaningfully serializing the run (both still overlap
  // for the vast majority of their execution). Already-invoked promises are
  // still accepted as-is (no stagger possible — they're already running),
  // preserving prior behavior for any caller that isn't launching Maestro
  // processes.
  async runParallel(tasks, staggerMs = 1500) {
    const promises = [];
    for (const t of tasks) {
      promises.push(typeof t === 'function' ? t() : t);
      if (staggerMs && promises.length < tasks.length) await new Promise(r => setTimeout(r, staggerMs));
    }
    return Promise.all(promises);
  }

  // Pushes a local file (e.g. from this framework's test-files/ directory)
  // onto the Android device's Downloads folder, then triggers a media-scan
  // broadcast so it's immediately visible/selectable in the system
  // "Attach Documents" picker without needing a device reboot or manual
  // scan. Verified live 2026-08-06: pushed test-files/sample.pdf appeared as
  // the top (most recent) item in the Downloads tab within ~1s of the
  // broadcast, and was selectable by its exact filename. Returns the
  // on-device path. Throws on failure — an attachment test can't proceed
  // without the file actually landing on the device.
  // Fixed 2026-08-10: `adb push` can preserve the LOCAL source file's own
  // modification time rather than stamping "now" — confirmed live via a
  // picker screenshot showing every pushed test-files/ copy dated "Jul 31"
  // (this repo's fixture files' own on-disk mtime), which can push a
  // freshly-pushed file out of the picker's "most recent first" sort order
  // and out of the flow's un-scrolled viewport. `touch` after the push
  // forces a fresh mtime so newly-pushed files reliably sort to the top
  // regardless of the source fixture's own age.
  pushFileToAndroid(localPath, remoteFileName) {
    const remotePath = `/sdcard/Download/${remoteFileName}`;
    const cmd = `adb push "${localPath}" "${remotePath}" && adb shell touch "${remotePath}" && adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${remotePath}`;
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd: process.cwd(), timeout: 30000, shell: '/bin/sh' }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`MaestroRunner: adb push failed for "${localPath}" — ${(stderr || error.message || '').slice(-300)}`));
        } else {
          resolve(remotePath);
        }
      });
    });
  }

  // Best-effort: grabs a screenshot straight from the connected device.
  // Confirmed live this CLI build (devicelab-dev's maestro-runner fork,
  // v2.1.0) has no `screenshot` subcommand at all ("Unmatched arguments...
  // Did you mean: record or bugreport?"), so this uses real per-platform
  // tooling instead: `adb exec-out screencap` for Android (proven working).
  // For iOS, `idevicescreenshot` (libimobiledevice's legacy screenshotr
  // service) doesn't work on iOS 17+ real devices — confirmed live: it needs
  // the old-style flat DeveloperDiskImage.dmg, which Apple replaced with a
  // per-device "Personalized Disk Image" that's mounted internally by
  // Xcode/CoreDevice and isn't exposed to that legacy service. pymobiledevice3
  // (github.com/doronz88/pymobiledevice3, requires `pip install
  // pymobiledevice3`) DOES support this via its own RemoteXPC tunnel —
  // `developer dvt screenshot` (the modern DVT-instrumentation screenshot;
  // the plain `developer screenshot` command is a deprecated API that no
  // longer exists on this iOS version) with `--userspace` establishes that
  // tunnel without needing root. Confirmed live producing a real, current
  // screenshot of the device. Never throws either way — a screenshot is an
  // Allure artifact, not an assertion.
  captureScreenshot(platform, outputPath) {
    const cmd = platform === 'ios'
      ? `python3 -m pymobiledevice3 developer dvt screenshot "${outputPath}" --udid "${process.env.IOS_DEVICE_UDID || ''}" --userspace`
      : `adb exec-out screencap -p > "${outputPath}"`;

    return new Promise((resolve) => {
      exec(cmd, { cwd: process.cwd(), timeout: 30000, shell: '/bin/sh' }, (error) => {
        if (error) {
          console.log(`  ⚠ Screenshot capture failed (${platform}): ${error.message.slice(0, 200)}`);
          resolve(null);
        } else {
          resolve(outputPath);
        }
      });
    });
  }
}

export default MaestroRunner;
