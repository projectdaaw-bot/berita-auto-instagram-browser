import 'dotenv/config';
import { chromium } from 'playwright';
import { discoverChromeProfile, profileIsLocked } from './chrome-profile.js';
import { log } from './logger.js';

export async function openBrowser() {
  const remote = process.env.CHROME_REMOTE_DEBUGGING_URL;
  if (remote) {
    const browser = await chromium.connectOverCDP(remote);
    const context = browser.contexts()[0] || await browser.newContext();
    log('browser_started', { mode: 'cdp' });
    return { browser, context, owned: false };
  }
  const profile = discoverChromeProfile({
    userDataDir: process.env.CHROME_USER_DATA_DIR || undefined,
    profileName: process.env.CHROME_PROFILE_NAME || 'projectdaaw',
    profileDirectory: process.env.CHROME_PROFILE_DIRECTORY || undefined
  });
  if (profileIsLocked(profile.userDataDir)) throw new Error('BLOCKED_CHROME_PROFILE_IN_USE');
  const context = await chromium.launchPersistentContext(profile.userDataDir, {
    channel: 'chrome',
    headless: process.env.HEADLESS === 'true',
    args: [`--profile-directory=${profile.profileDirectory}`],
    viewport: { width: 1440, height: 1000 }
  });
  log('chrome_profile_detected', { profileName: profile.profileName, profileDirectory: profile.profileDirectory });
  log('browser_started', { mode: 'persistent' });
  return { browser: context.browser(), context, owned: true };
}

export async function closeBrowser(session) {
  if (session?.owned) await session.context.close();
}
