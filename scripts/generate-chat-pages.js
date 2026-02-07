import fs from 'fs';
import path from 'path';

const root = process.cwd();
const contentDir = path.join(root, 'content', 'chats');
const distDir = path.join(root, 'dist', 'chats');
const rootChatsDir = path.join(root, 'chats');
const sourceHtmlPath = path.join(root, 'chats.html');
const distHtmlPath = path.join(root, 'dist', 'chats.html');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSlugs() {
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
    .filter((slug) => slug && slug.toLowerCase() !== 'readme' && slug.toLowerCase() !== '_index');
}

function buildHtmlTemplate(slug, template, { dist }) {
  let html = template;
  html = html.replace(/href="feed\.xml"/g, 'href="../feed.xml"');
  if (dist) {
    html = html.replace(/src="config\.js"/g, 'src="../config.js"');
  } else {
    html = html.replace(/href="style\.css"/g, 'href="../style.css"');
    html = html.replace(/href="chat\.css"/g, 'href="../chat.css"');
    html = html.replace(/src="config\.js"/g, 'src="../config.js"');
    html = html.replace(/src="js\/chats\.js"/g, 'src="../js/chats.js"');
  }

  const slugScript = `<script>window.CHAT_SLUG = "${slug}";<\/script>`;
  html = html.replace(
    /<script src="[^"]*config\.js"><\/script>/,
    `${slugScript}\n  <script src="${dist ? '../config.js' : '../config.js'}"></script>`
  );

  return html;
}

function generatePages() {
  ensureDir(distDir);
  ensureDir(rootChatsDir);
  const slugs = getSlugs();

  if (slugs.length === 0) {
    console.log('No chat markdown files found in content/chats.');
    return;
  }

  const indexItems = [];
  const sourceTemplate = fs.readFileSync(sourceHtmlPath, 'utf-8');
  const distTemplate = fs.existsSync(distHtmlPath)
    ? fs.readFileSync(distHtmlPath, 'utf-8')
    : sourceTemplate;

  slugs.forEach((slug) => {
    const distHtml = buildHtmlTemplate(slug, distTemplate, { dist: true });
    const outputPath = path.join(distDir, `${slug}.html`);
    fs.writeFileSync(outputPath, distHtml);

    const devHtml = buildHtmlTemplate(slug, sourceTemplate, { dist: false });
    const devOutputPath = path.join(rootChatsDir, `${slug}.html`);
    fs.writeFileSync(devOutputPath, devHtml);

    const filePath = path.join(contentDir, `${slug}.md`);
    let title = slug;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^#\s+(.+)$/m);
      if (match) {
        title = match[1].trim();
      }
    } catch (error) {}

    indexItems.push({ slug, title });
  });

  const indexJson = {
    generatedAt: new Date().toISOString(),
    items: indexItems,
  };
  fs.writeFileSync(
    path.join(contentDir, '_index.json'),
    JSON.stringify(indexJson, null, 2)
  );

  console.log(`Generated ${slugs.length} chat page(s) in dist/chats.`);
}

generatePages();
