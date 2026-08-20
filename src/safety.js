import fs from 'node:fs';
import path from 'node:path';

export const BLOCKED_AUTH =
  /one[- ]time|otp|captcha|checkpoint|security confirmation|suspicious login|confirm your identity|verify it's you/i;

export const SENSITIVE =
  /mayat|jenazah|berdarah|potongan tubuh|bunuh diri|gantung diri|mutilasi|foto korban tewas|konten seksual eksplisit/i;

export function assertAccount(username, expected = 'berita.auto') {
  if (
    (username || '').replace(/^@/, '').toLowerCase() !==
    expected.replace(/^@/, '').toLowerCase()
  ) {
    throw new Error('BLOCKED_ACCOUNT_NOT_CONFIRMED');
  }
}

export function detectManualAuth(text) {
  return BLOCKED_AUTH.test(text || '');
}

export async function detectVisibleManualAuth(page) {
  const url = page.url();

  if (
    /\/accounts\/login\/|\/challenge\/|\/checkpoint\//i.test(url)
  ) {
    return true;
  }

  const visiblePassword = await page
    .locator('input[type="password"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (visiblePassword) return true;

  const visibleOtp = await page
    .locator(
      'input[autocomplete="one-time-code"], input[name*="verification"], input[name*="security"]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (visibleOtp) return true;

  const captcha = await page
    .locator('iframe[src*="captcha"], iframe[title*="captcha" i]')
    .first()
    .isVisible()
    .catch(() => false);

  if (captcha) return true;

  const body = await page.locator('body').innerText().catch(() => '');

  return detectManualAuth(body);
}

export function isSensitive(article) {
  return SENSITIVE.test(
    [article.title, article.excerpt, article.category]
      .filter(Boolean)
      .join(' ')
  );
}

export function readState(file = 'tmp/story-state.json') {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { articles: {} };
  }
}

export function isDuplicate(article, state) {
  const item = state?.articles?.[String(article.articleId)];
  return Boolean(item && item.status === 'published');
}

export function recordPublished(
  article,
  file = 'tmp/story-state.json'
) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const state = readState(file);

  state.articles ||= {};

  state.articles[String(article.articleId)] = {
    articleUrl: article.articleUrl,
    publishedAt: new Date().toISOString(),
    status: 'published'
  };

  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function assertDryRunDoesNotPublish(dryRun, clickCount) {
  if (dryRun && clickCount !== 0) {
    throw new Error('DRY_RUN_PUBLISH_VIOLATION');
  }

  if (!dryRun && clickCount > 1) {
    throw new Error('SINGLE_PUBLISH_GUARD_VIOLATION');
  }
}
