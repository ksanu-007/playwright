import { exec } from 'child_process';
import path from 'path';

// =============================================================================
// Reusable attachment-file provisioning, appended on top of the existing
// Maestro/MaestroRunner framework (utils/maestro.js, utils/maestroRunner.js).
// Goal: attachment-upload flows select a known, framework-controlled file
// from this repo's own test-files/ instead of whatever happens to already
// be on the device (the old behavior — android-send-attachment.yaml just
// confirms "whatever's already selected"; ios-send-attachment.yaml/
// ios-send-document.yaml depend on "whatever the native picker shows
// first" / a specific pre-existing personal file on one particular
// device — see those flows' own header comments).
//
// Scoped to two file types (pdf, xlsx) — the two confirmed live, end-to-end,
// on BOTH Android and iOS. Other types were tried and hit real, unresolved
// platform issues on this device:
//   - jpg/png (Photos-library route): AFC push into DCIM/ succeeds, but the
//     file never appears in Photos' own library (confirmed live even after
//     reinstalling Photos.app, which fixes this exact class of issue for
//     other apps).
//   - mp4: no fixture exists — no video encoder available on this machine.
// Extend ATTACHMENT_FILES if a future session resolves the Photos-library
// gap or adds more types.
//
// Callers pass a plain canonical name ("sample.pdf", "sample.xlsx") —
// ATTACHMENT_FILES maps each to whichever real fixture already lives in
// test-files/ (existing fixtures are reused as-is, under their existing
// on-disk names, so nothing already committed needed renaming). The
// canonical name is what actually gets pushed to the device and what the
// picker flow searches for, so "uploaded filename matches expected
// filename" is a plain string-equality check wherever a test verifies it.
//
// Android: adb push (see pushFileToDevice below) — fully automated, runs on
// every uploadAttachment call.
//
// iOS: there is no non-jailbreak way to write into an arbitrary app's own
// "On My iPhone" Files-app location on a real device unless that app
// itself declares file-sharing — confirmed live 2026-08-17 against the
// real Netsfere build: `pymobiledevice3 apps push --documents` (house_arrest
// VendDocuments), tried both over plain usbmux and the userspace RemoteXPC
// tunnel, fails identically with `InstallationLookupFailed` (Netsfere's
// Info.plist has no UIFileSharingEnabled). The generic AFC media store
// (`pymobiledevice3 afc push ... Downloads/...`, no house_arrest involved)
// DOES accept the write, but the file never appears in the document
// picker's "On My iPhone" either.
//
// A Safari-download round-trip (serve test-files/ over local HTTP, download
// on-device, "Save to Files"/native download prompt) DOES work, and was
// this framework's first iOS provisioning mechanism — but it was also
// consistently the flakiest part of the whole suite (real-device Safari/
// XCTest session instability, hit repeatedly across multiple debugging
// sessions) for something that, per its own finding, only ever needs to
// run ONCE: a file saved into Files this way is real, persistent on-device
// storage — confirmed live 2026-08-17 by finding "sample.pdf"/"sample.xlsx"
// again via the picker's own Search hours later, across separate Maestro/
// XCTest sessions and a device reboot in between.
//
// Given that, iOS provisioning for sample.pdf/sample.xlsx was done ONCE,
// manually, outside this framework, and is intentionally NOT automated —
// removed entirely rather than kept as an on-demand fallback, since the
// fallback path itself was the unreliable part. If either file ever needs
// re-provisioning (a factory-reset device, a different physical iPhone),
// redo that one-time step manually (any means that lands the file in
// Files — Safari download, AirDrop, Share-to-Files from Mail/Messages —
// then confirm it's findable via Netsfere's own Attach Documents -> Search)
// before relying on ios-upload-attachment.yaml again; this module makes no
// attempt to detect or recover from that case automatically.
// =============================================================================

const ANDROID_REMOTE_DIR = '/sdcard/Download/AutomationFiles';

export const ATTACHMENT_FILES = {
  'sample.pdf': 'sample.pdf',
  'sample.xlsx': 'sample.xlsx',
};

export function localPathFor(fileName) {
  const realName = ATTACHMENT_FILES[fileName];
  if (!realName) {
    throw new Error(`attachmentProvisioning: unsupported file "${fileName}" — supported: ${Object.keys(ATTACHMENT_FILES).join(', ')}`);
  }
  return path.resolve('test-files', realName);
}

function execPromise(cmd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: process.cwd(), timeout, shell: '/bin/sh' }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${(stderr || error.message || '').slice(-400)}`));
      else resolve(stdout);
    });
  });
}

// Pushes fileName (a key of ATTACHMENT_FILES) onto the Android device under
// its canonical name. Android-only — iOS attachments are pre-provisioned
// (see module header) and never pushed via this function.
export async function pushFileToDevice(platform, fileName) {
  if (platform !== 'android') {
    throw new Error(`attachmentProvisioning.pushFileToDevice: platform "${platform}" not supported — iOS attachments are pre-provisioned, see module header`);
  }
  const localPath = localPathFor(fileName);
  const remotePath = `${ANDROID_REMOTE_DIR}/${fileName}`;
  await execPromise(`adb shell mkdir -p "${ANDROID_REMOTE_DIR}"`);
  await execPromise(`adb push "${localPath}" "${remotePath}"`);
  await execPromise(`adb shell touch "${remotePath}"`);
  await execPromise(`adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${remotePath}`);
  return remotePath;
}

export async function verifyFileExistsOnDevice(platform, fileName) {
  if (platform !== 'android') {
    throw new Error(`attachmentProvisioning.verifyFileExistsOnDevice: platform "${platform}" not supported — iOS has no CLI-level check, see module header`);
  }
  const remotePath = `${ANDROID_REMOTE_DIR}/${fileName}`;
  const out = await execPromise(`adb shell ls "${remotePath}"`).catch(() => '');
  return out.trim() === remotePath;
}

// Provisions every supported file (or just `fileNames`, if given) onto the
// Android device. Meant to run once per test run, in a setup hook. iOS has
// nothing to provision here (see module header) — MaestroRunner.uploadAttachment
// goes straight to the picker for iOS.
export async function prepareAttachmentFiles(platform, fileNames = Object.keys(ATTACHMENT_FILES)) {
  if (platform !== 'android') {
    return {};
  }
  const results = {};
  for (const fileName of fileNames) {
    await pushFileToDevice(platform, fileName);
    const ok = await verifyFileExistsOnDevice(platform, fileName);
    if (!ok) {
      throw new Error(`prepareAttachmentFiles: "${fileName}" did not verify on ${platform} after push`);
    }
    results[fileName] = 'ready';
  }
  return results;
}

export { ANDROID_REMOTE_DIR };
