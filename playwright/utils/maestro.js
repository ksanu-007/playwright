import { execSync, spawn } from 'child_process';
import path from 'path';

const MAESTRO = `${process.env.LOCALAPPDATA}\\maestro\\maestro\\bin\\maestro.bat`;
const FLOWS_DIR = path.resolve('mobile-automation', 'flows');
const DEFAULT_PASSWORD = 'Abcd@1234567';

class Maestro {
  constructor() {
    this._loggedInUser = null;
  }

  get isLoggedIn() {
    return this._loggedInUser !== null;
  }

  _flowPath(name) {
    return name.includes(path.sep) ? name : path.resolve(FLOWS_DIR, name);
  }

  _buildCmd(flowPath, env) {
    const parts = [`"${MAESTRO}"`, 'test'];
    for (const [k, v] of Object.entries(env)) {
      parts.push(`--env ${k}="${v}"`);
    }
    parts.push(`"${flowPath}"`);
    return parts.join(' ');
  }

  _wakeDevice() {
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

  ensureLoggedIn(email) {
    if (this._loggedInUser !== email) {
      console.log(`  Maestro: login as ${email}`);
      this._runSync(this._flowPath('ensure-logged-in.yaml'), { EMAIL: email, PASSWORD: DEFAULT_PASSWORD });
      this._loggedInUser = email;
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
