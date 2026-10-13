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

function plainText(markdown) {
  return markdown
    .replace(/^#\s+.+$/gm, '')
    // Keep code searchable while dropping only Markdown's code-fence markers.
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[>*_`#]/g, ' ')
    .replace(/\$+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchSections(markdown) {
  const cleaned = markdown.replace(/\r\n/g, '\n').trim();
  const headingMatches = [...cleaned.matchAll(/^##\s+(.+)$/gm)];

  return headingMatches.flatMap((match, index) => {
    const end =
      index + 1 < headingMatches.length ? headingMatches[index + 1].index : cleaned.length;
    const content = cleaned
      .slice(match.index + match[0].length, end)
      .replace(/\n\s*---\s*\n/g, '\n')
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return !/^Expand to view model thoughts/i.test(trimmed) && !/^chevron_right/i.test(trimmed);
      })
      .join('\n')
      .trim();

    if (!content) return [];

    const searchText = plainText(content);
    return [{
      id: index,
      title: match[1].trim(),
      excerpt: searchText.slice(0, 180),
      searchText,
    }];
  });
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
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^#\s+(.+)$/m);
      if (match) {
        title = match[1].trim();
      }
    } catch (error) {}

    indexItems.push({
      slug,
      title,
      sections: getSearchSections(content),
    });
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
