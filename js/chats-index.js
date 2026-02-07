const basePath = import.meta?.env?.BASE_URL || CONFIG.basePath || '/';
const listEl = document.querySelector('[data-chat-list]');
const nav = document.getElementById('nav');

function buildNav() {
  if (!nav) return;
  nav.innerHTML = `
    <a href="${basePath}index.html" class="name">${CONFIG.name}</a>
    <a href="${basePath}thoughts.html">Thoughts</a>
    <a href="${basePath}chats/index.html" class="active">Chats</a>
  `;
}

function renderList(items) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML =
      '<p>No chats found. Add files to <code>content/chats</code> and run <code>node scripts/generate-chat-pages.js</code>.</p>';
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      return `
        <a class="chat-card" href="${basePath}chats/${item.slug}.html">
          <div class="chat-card-title">${item.title || item.slug}</div>
          <div class="chat-card-meta">${item.slug}.md</div>
        </a>
      `;
    })
    .join('');
}

async function loadIndex() {
  try {
    const response = await fetch(`${basePath}content/chats/_index.json?v=${Date.now()}`);
    if (!response.ok) {
      renderList([]);
      return;
    }
    const data = await response.json();
    renderList(data.items || []);
  } catch (error) {
    renderList([]);
  }
}

buildNav();
loadIndex();
