import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://fivetwentythree.github.io/th';
const SITE_TITLE = 'Lochana Perera';
const SITE_DESCRIPTION = 'Personal notes and thoughts';

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRSS() {
  const thoughtsDir = path.join(process.cwd(), 'content/thoughts');
  const indexPath = path.join(thoughtsDir, '_index.md');
  
  if (!fs.existsSync(indexPath)) {
    console.log('No _index.md found, skipping RSS generation');
    return;
  }
  
  const categories = fs.readFileSync(indexPath, 'utf-8')
    .trim()
    .split('\n')
    .filter(c => c.trim());
  
  const items = [];
  const now = new Date().toUTCString();
  
  for (const cat of categories) {
    const filePath = path.join(thoughtsDir, `${cat}.md`);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.match(/^- /));
    
    // Get first few thoughts as preview
    const preview = lines.slice(0, 3)
      .map(l => l.replace(/^- /, '').replace(/\[\[([^\]]+)\]\]/g, '$1'))
      .join(' • ');
    
    items.push({
      title: cat.charAt(0).toUpperCase() + cat.slice(1),
      link: `${SITE_URL}/thoughts.html#${cat}`,
      description: preview || `Thoughts on ${cat}`,
      pubDate: now
    });
  }
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid>${item.link}</guid>
    </item>`).join('')}
  </channel>
</rss>`;
  
  const outputPath = path.join(process.cwd(), 'dist/feed.xml');
  fs.writeFileSync(outputPath, rss);
  console.log('Generated RSS feed: dist/feed.xml');
}

generateRSS();
