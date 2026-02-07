import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://fivetwentythree.github.io/th';

function generateSitemap() {
  const thoughtsDir = path.join(process.cwd(), 'content/thoughts');
  const indexPath = path.join(thoughtsDir, '_index.md');
  
  const urls = [
    { loc: SITE_URL, priority: '1.0' },
    { loc: `${SITE_URL}/thoughts.html`, priority: '0.9' },
    { loc: `${SITE_URL}/chats/index.html`, priority: '0.9' }
  ];

  const chatsDir = path.join(process.cwd(), 'content/chats');
  if (fs.existsSync(chatsDir)) {
    const chatFiles = fs.readdirSync(chatsDir).filter(file => file.endsWith('.md'));
    for (const file of chatFiles) {
      const slug = file.replace(/\.md$/, '');
      urls.push({
        loc: `${SITE_URL}/chats/${slug}.html`,
        priority: '0.8'
      });
    }
  }
  
  if (fs.existsSync(indexPath)) {
    const categories = fs.readFileSync(indexPath, 'utf-8')
      .trim()
      .split('\n')
      .filter(c => c.trim());
    
    for (const cat of categories) {
      urls.push({
        loc: `${SITE_URL}/thoughts.html#${cat}`,
        priority: '0.8'
      });
    }
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  const outputPath = path.join(process.cwd(), 'dist/sitemap.xml');
  fs.writeFileSync(outputPath, sitemap);
  console.log('Generated sitemap: dist/sitemap.xml');
}

generateSitemap();
