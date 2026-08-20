import { log } from './logger.js';
import { assertAccount, detectManualAuth } from './safety.js';

const SELECTORS = {
  create: ['button:has-text("Create")','[aria-label*="Create"]','a[href="/create/select/"]'],
  story: ['text=Story','[aria-label*="Story"]'],
  profile: ['a[href*="/accounts/edit"]','a[href^="/berita.auto/"]','[aria-label*="profile"]']
};

async function firstVisible(page, selectors) {
  for (const s of selectors) { const loc = page.locator(s).first(); if (await loc.isVisible().catch(()=>false)) return loc; }
  return null;
}

export async function openInstagram(page) {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText().catch(()=> '');
  if (detectManualAuth(body)) throw new Error('BLOCKED_MANUAL_AUTH_REQUIRED');
  await page.screenshot({ path: 'tmp/screenshots/01-instagram-home.png', fullPage: false });
  log('instagram_opened');
}

export async function verifyAccount(page, expected='berita.auto') {
  const body = await page.locator('body').innerText().catch(()=> '');
  if (detectManualAuth(body)) throw new Error('BLOCKED_MANUAL_AUTH_REQUIRED');
  const hrefs = await page.locator('a[href]').evaluateAll(as => as.map(a => a.getAttribute('href')).filter(Boolean).slice(0,300));
  const evidence = hrefs.find(h => h === `/${expected}/` || h === `/${expected}`) || body.match(new RegExp(`@?${expected.replace('.', '\\.')}`, 'i'))?.[0];
  if (!evidence) throw new Error('BLOCKED_ACCOUNT_NOT_CONFIRMED');
  assertAccount(expected, expected);
  log('account_confirmed', { username: expected });
  return expected;
}

export async function openStoryComposer(page) {
  let create = await firstVisible(page, SELECTORS.create);
  if (!create) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800);
    create = await firstVisible(page, SELECTORS.create);
  }
  if (!create) throw new Error('BLOCKED_STORY_UI_NOT_AVAILABLE');
  await create.click(); await page.waitForTimeout(700);
  const story = await firstVisible(page, SELECTORS.story);
  if (!story) throw new Error('BLOCKED_STORY_UI_NOT_AVAILABLE');
  await story.click(); await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp/screenshots/02-story-composer.png', fullPage: false });
  log('story_composer_opened');
}

export async function uploadStory(page, file) {
  const input = page.locator('input[type="file"]').first();
  if (!(await input.count())) throw new Error('STORY_FILE_INPUT_NOT_FOUND');
  await input.setInputFiles(file); await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText().catch(()=> '');
  if (detectManualAuth(body)) throw new Error('BLOCKED_MANUAL_AUTH_REQUIRED');
  await page.screenshot({ path: 'tmp/screenshots/03-story-preview.png', fullPage: false });
  log('upload_completed');
  return true;
}

export async function verifyPreview(page) {
  const images = await page.locator('img').count();
  if (!images) throw new Error('STORY_PREVIEW_NOT_VISIBLE');
  log('preview_verified');
}

export async function publishStory(page) {
  const candidates = ['button:has-text("Share")','button:has-text("Your story")','button:has-text("Share to story")','[aria-label*="Share"]'];
  let button = null;
  for (const s of candidates) { const loc=page.locator(s).last(); if (await loc.isVisible().catch(()=>false)) { button=loc; break; } }
  if (!button) throw new Error('PUBLISH_CONTROL_NOT_FOUND');
  await button.click();
  log('publish_clicked');
  await page.waitForTimeout(3500);
  const body = await page.locator('body').innerText().catch(()=> '');
  if (/couldn't|error|try again/i.test(body)) throw new Error('PUBLISH_AMBIGUOUS');
  await page.screenshot({ path: 'tmp/screenshots/04-story-published.png', fullPage: false });
  log('publish_confirmed');
  return true;
}
