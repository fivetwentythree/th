const name = CONFIG.name;
  const basePath = import.meta?.env?.BASE_URL || CONFIG.basePath || '/';
let allContent = [];
let fuse = null;
let contentCache = {};
let categoriesCache = [];

// Convert [[wikilinks]] to actual links
function parseWikiLinks(md) {
  return md.replace(/\[\[([^\]]+)\]\]/g, (match, link) => {
    return `[${link}](#${link.toLowerCase()})`;
  });
}

// Generate ID from text
function generateId(text) {
  return 't-' + text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

// Fetch with cache
async function fetchContent(cat) {
  if (contentCache[cat]) return contentCache[cat];
  try {
    const res = await fetch(`${basePath}content/thoughts/${cat}.md?v=${Date.now()}`);
    if (res.ok) {
      const md = await res.text();
      contentCache[cat] = md;
      return md;
    }
  } catch (e) {}
  return null;
}

// Load all content for search (parallel fetches)
async function loadAllContent(categories) {
  allContent = [];
  const results = await Promise.all(categories.map(fetchContent));
  
  categories.forEach((cat, i) => {
    const md = results[i];
    if (md) {
      const fullText = md
        .replace(/\*\*/g, '')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^- /gm, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      allContent.push({
        category: cat,
        text: fullText,
        preview: cat.charAt(0).toUpperCase() + cat.slice(1) + ' (full)',
        id: '',
        isCategory: true
      });
      
      const lines = md.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\s*)- (.+)/);
        if (match) {
          const text = match[2]
            .replace(/\*\*/g, '')
            .replace(/\[\[([^\]]+)\]\]/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .trim();
          
          if (text.length > 0) {
            const id = generateId(text);
            allContent.push({ 
              category: cat, 
              text: text,
              preview: text.slice(0, 100),
              id: id,
              isCategory: false
            });
          }
        }
      }
    }
  });
  
  fuse = new Fuse(allContent, {
    keys: ['text'],
    threshold: 0.6,
    ignoreLocation: true,
    minMatchCharLength: 1,
    findAllMatches: true,
    distance: 1000
  });
}

// Find backlinks (uses cache from loadAllContent)
function findBacklinks(categories, currentCategory) {
  return categories.filter(cat => {
    if (cat === currentCategory) return false;
    const md = contentCache[cat];
    return md && md.toLowerCase().includes(`[[${currentCategory}]]`);
  });
}

function renderSearch() {
  return `
    <div class="search-container">
      <input type="text" id="search" placeholder="Search thoughts..." />
      <div id="search-results"></div>
    </div>
  `;
}

function setupSearch() {
  const input = document.getElementById('search');
  const results = document.getElementById('search-results');
  
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }
    
    const matches = fuse.search(query).slice(0, 8);
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-item no-results">No results found</div>';
      return;
    }
    
    results.innerHTML = matches.map(m => {
      const href = m.item.id ? `#${m.item.category}:${m.item.id}` : `#${m.item.category}`;
      return `<a href="${href}" class="search-item">
        <span class="search-cat">${m.item.category}</span>
        ${m.item.preview}
      </a>`;
    }).join('');
  });
}

function addIdsToHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  div.querySelectorAll('li').forEach(li => {
    const text = li.childNodes[0]?.textContent?.trim() || '';
    if (text) {
      li.id = generateId(text);
    }
  });
  
  return div.innerHTML;
}

function scrollToThought(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 2000);
  }
}

async function renderCategory(category, scrollToId, categories) {
  const nav = document.getElementById("nav");
  nav.innerHTML = `
    <a href="${basePath}index.html" class="name">${name}</a>
    <a href="${basePath}chats/index.html">Chats</a>
    ${categories.map(c => 
      `<a href="#${c}" class="${c === category ? 'active' : ''}">${c.charAt(0).toUpperCase() + c.slice(1)}</a>`
    ).join("")}
  `;
  
  // Update page title and meta for SEO
  if (category) {
    const title = category.charAt(0).toUpperCase() + category.slice(1) + ' - ' + name;
    document.title = title;
    updateMeta('og:title', title);
  }
  
  if (category) {
    const md = contentCache[category];
    if (md) {
      let parsed = parseWikiLinks(md);
      let html = marked.parse(parsed);
      html = html.replace(/<ul>/g, '<ul class="thread">');
      html = addIdsToHtml(html);
      
      const backlinks = findBacklinks(categories, category);
      if (backlinks.length > 0) {
        html += `<div class="backlinks"><strong>Linked from:</strong> ${backlinks.map(b => 
          `<a href="#${b}">${b.charAt(0).toUpperCase() + b.slice(1)}</a>`
        ).join(" · ")}</div>`;
      }
      
      document.getElementById("content").innerHTML = renderSearch() + html;
      setupSearch();
      
      if (scrollToId) {
        setTimeout(() => scrollToThought(scrollToId), 150);
      }
    }
  } else {
    document.getElementById("content").innerHTML = renderSearch() + "<p>Select a category →</p>";
    setupSearch();
  }
}

function updateMeta(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (meta) {
    meta.setAttribute('content', content);
  }
}

async function init() {
  const hash = window.location.hash.slice(1);
  const [category, scrollToId] = hash.split(':');
  
  try {
    const res = await fetch(`${basePath}content/thoughts/_index.md?v=${Date.now()}`);
    if (res.ok) {
      const text = await res.text();
      categoriesCache = text.trim().split("\n").filter(c => c.trim());
    }
  } catch (e) {}
  
  await loadAllContent(categoriesCache);
  renderCategory(category, scrollToId, categoriesCache);
}

document.addEventListener("DOMContentLoaded", init);

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.slice(1);
  const [category, scrollToId] = hash.split(':');
  renderCategory(category, scrollToId, categoriesCache);
});
