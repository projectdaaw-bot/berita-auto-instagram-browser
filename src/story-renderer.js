import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

function escapeXml(s='') { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function wrap(text, maxChars = 25, maxLines = 4) {
  const words = text.replace(/\s+/g, ' ').trim().split(' '); const lines=[]; let line='';
  for (const w of words) { const next = line ? `${line} ${w}` : w; if (next.length > maxChars && line) { lines.push(line); line=w; } else line=next; if (lines.length === maxLines) break; }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines-1] = lines[maxLines-1].replace(/[.,;:!?]?$/, '…');
  return lines;
}

export function headlineLines(title) { return wrap(title, 27, 4); }

export async function renderStory(article, output = `tmp/story-${article.articleId}.jpg`) {
  await fs.mkdir(path.dirname(output), { recursive: true });
  const width = Number(process.env.STORY_WIDTH || 1080), height = Number(process.env.STORY_HEIGHT || 1920);
  let image;
  if (article.imageUrl) {
    const r = await fetch(article.imageUrl); if (!r.ok) throw new Error(`IMAGE_HTTP_${r.status}`); image = Buffer.from(await r.arrayBuffer());
  } else throw new Error('ARTICLE_IMAGE_MISSING');
  const lines = headlineLines(article.title);
  const headline = lines.map((line,i) => `<text x="90" y="${1210+i*105}" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="white">${escapeXml(line)}</text>`).join('');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".15"/><stop offset=".52" stop-opacity=".2"/><stop offset="1" stop-opacity=".88"/></linearGradient></defs><rect width="1080" height="1920" fill="#111"/><image href="data:image/jpeg;base64,${image.toString('base64')}" x="0" y="0" width="1080" height="1920" preserveAspectRatio="xMidYMid slice"/><rect width="1080" height="1920" fill="url(#g)"/><text x="90" y="115" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="white">BERITA AUTO</text><rect x="90" y="170" width="${Math.min(260, Math.max(120,(article.category||'BERITA').length*22))}" height="52" rx="26" fill="white" fill-opacity=".9"/><text x="112" y="207" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111">${escapeXml((article.category||'BERITA').toUpperCase())}</text>${headline}<text x="90" y="1695" font-family="Arial, sans-serif" font-size="34" font-weight="600" fill="white">Baca selengkapnya di Berita Auto</text><text x="90" y="1750" font-family="Arial, sans-serif" font-size="28" fill="white" fill-opacity=".85">berita-auto.vercel.app</text></svg>`;
  await sharp(image).resize(width, height, { fit: 'cover' }).composite([{ input: Buffer.from(svg), top:0, left:0 }]).jpeg({ quality: 90, mozjpeg: true }).toFile(output);
  return output;
}

export async function validateStoryAsset(file) {
  const meta = await sharp(file).metadata();
  if (meta.width !== 1080 || meta.height !== 1920 || meta.format !== 'jpeg') throw new Error('STORY_ASSET_INVALID');
  const stat = await fs.stat(file); if (!stat.size) throw new Error('STORY_ASSET_INVALID');
  return { width: meta.width, height: meta.height, size: stat.size, format: meta.format };
}
