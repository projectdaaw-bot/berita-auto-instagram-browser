import 'dotenv/config';
import fs from 'node:fs/promises';
import { openBrowser, closeBrowser } from './browser.js';
import { openInstagram, verifyAccount, openStoryComposer, uploadStory, verifyPreview, publishStory } from './instagram.js';
import { chooseArticle } from './berita-auto.js';
import { renderStory, validateStoryAsset } from './story-renderer.js';
import { readState, isDuplicate, recordPublished, assertDryRunDoesNotPublish } from './safety.js';
import { log } from './logger.js';

async function main() {
  const dryRun = process.env.DRY_RUN !== 'false';
  await fs.mkdir('tmp/screenshots', { recursive: true });
  const state = readState();
  const session = await openBrowser();
  try {
    const page = session.context.pages()[0] || await session.context.newPage();
    await openInstagram(page);
    await verifyAccount(page, process.env.INSTAGRAM_USERNAME || 'berita.auto');
    const article = await chooseArticle(process.env.BERITA_AUTO_URL || 'https://berita-auto.vercel.app/', state);
    if (isDuplicate(article, state)) { console.log('SKIP_DUPLICATE'); return; }
    log('article_selected', { articleId: article.articleId, title: article.title, articleUrl: article.articleUrl, category: article.category });
    const asset = await renderStory(article);
    const meta = await validateStoryAsset(asset);
    log('story_generated', { asset, width: meta.width, height: meta.height });
    await openStoryComposer(page);
    await uploadStory(page, asset);
    await verifyPreview(page);
    let clickCount = 0;
    if (!dryRun) { clickCount = 1; await publishStory(page); recordPublished(article); }
    assertDryRunDoesNotPublish(dryRun, clickCount);
    console.log(dryRun ? 'DRY_RUN_PASS' : 'PUBLISH_CONFIRMED');
  } finally { await closeBrowser(session); }
}

main().catch(err => { console.error(err.message || err); process.exitCode = 1; });
