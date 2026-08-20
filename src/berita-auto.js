import { isSensitive } from './safety.js';

export async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'BeritaAutoInstagramBrowser/1.0' } });
  if (!r.ok) throw new Error(`HTTP_${r.status}:${url}`);
  return { url: r.url, text: await r.text() };
}

function abs(base, value) { try { return value ? new URL(value, base).href : ''; } catch { return ''; } }
function clean(v) { return (v || '').replace(/\\s+/g, ' ').trim(); }

export function parseArticles(html, baseUrl) {
  const out = [];
  const re = /<article[\\s\\S]*?<\\/article>|<a[^>]+href=["'][^"']+["'][^>]*>[\\s\\S]*?<\\/a>/gi;
  for (const block of html.match(re) || []) {
    const link = block.match(/href=["']([^"']+)["']/i)?.[1];
    const title = clean(block.match(/<h[1-6][^>]*>([\\s\\S]*?)<\\/h[1-6]>/i)?.[1]?.replace(/<[^>]+>/g, '')) || clean(block.replace(/<[^>]+>/g, ''));
    const image = block.match(/(?:src|data-src)=["']([^"']+)["']/i)?.[1] || block.match(/<img[^>]+src=["']([^"']+)/i)?.[1];
    const category = clean(block.match(/data-category=["']([^"']+)["']/i)?.[1] || '');
    if (link && title.length >= 12) out.push({ articleId: abs(baseUrl, link).split('/').filter(Boolean).pop(), title: clean(title), excerpt: '', imageUrl: abs(baseUrl, image), articleUrl: abs(baseUrl, link), category, publishedAt: '' });
  }
  return dedupe(out);
}

function dedupe(items) { return [...new Map(items.map(x => [x.articleUrl, x])).values()]; }

export function scoreArticle(a) {
  let score = 0;
  if (['nasional','otomotif','teknologi','sepak bola','bola','olahraga','hiburan'].includes((a.category || '').toLowerCase())) score += 20;
  if (a.imageUrl) score += 15;
  if (a.title.length <= 150) score += 10;
  if (!isSensitive(a)) score += 30;
  return score;
}

export async function chooseArticle(baseUrl, state = { articles: {} }) {
  const home = await fetchText(baseUrl);
  const candidates = parseArticles(home.text, home.url).filter(a => !state.articles?.[String(a.articleId)]?.status || state.articles[String(a.articleId)].status !== 'published').filter(a => !isSensitive(a)).sort((a,b) => scoreArticle(b)-scoreArticle(a));
  for (const a of candidates) {
    try {
      const article = await fetchText(a.articleUrl);
      if (!article.text || article.text.length < 100) continue;
      if (a.imageUrl) {
        const image = await fetch(a.imageUrl, { method: 'HEAD', headers: { 'user-agent': 'BeritaAutoInstagramBrowser/1.0' } });
        if (!image.ok) continue;
      }
      return a;
    } catch {}
  }
  throw new Error('NO_SUITABLE_ARTICLE');
}
