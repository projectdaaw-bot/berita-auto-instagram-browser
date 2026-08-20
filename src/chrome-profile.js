import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function discoverChromeProfile({ userDataDir, profileName = 'projectdaaw', profileDirectory } = {}) {
  const dir = userDataDir || path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
  if (profileDirectory) return { profileName, profileDirectory, userDataDir: dir };
  const stateFile = path.join(dir, 'Local State');
  if (!fs.existsSync(stateFile)) throw new Error('CHROME_LOCAL_STATE_NOT_FOUND');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const profiles = state.profile?.info_cache || {};
  const found = Object.entries(profiles).find(([, info]) => info?.name === profileName);
  if (!found) throw new Error(`CHROME_PROFILE_NOT_FOUND:${profileName}`);
  return { profileName, profileDirectory: found[0], userDataDir: dir };
}

export function profileLockFiles(userDataDir) {
  return ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].map(x => path.join(userDataDir, x));
}

export function profileIsLocked(userDataDir) {
  return profileLockFiles(userDataDir).some(fs.existsSync);
}
