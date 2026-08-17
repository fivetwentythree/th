const basePath = import.meta?.env?.BASE_URL || CONFIG.basePath || '/';
const listEl = document.querySelector('[data-chat-list]');
const nav = document.getElementById('nav');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');
const searchContainer = document.querySelector('[data-chat-search]');
const SEARCH_DEBOUNCE_MS = 120;
const MAX_SEARCH_RESULTS = 8;
let cancelPendingSearch = () => {};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
        <a class="chat-card" href="${basePath}chats/${encodeURIComponent(item.slug)}.html">
          <div class="chat-card-title">${escapeHtml(item.title || item.slug)}</div>
          <div class="chat-card-meta">${escapeHtml(item.slug)}.md</div>
        </a>
      `;
    })
    .join('');
}

function debounce(callback, delay) {
  let timerId;
  const debounced = (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
  debounced.cancel = () => window.clearTimeout(timerId);
  return debounced;
}

function setSearchExpanded(expanded) {
  searchInput?.setAttribute('aria-expanded', String(expanded));
}

function clearSearchResults() {
  if (!searchResults) return;
  cancelPendingSearch();
  searchResults.innerHTML = '';
  setSearchExpanded(false);
}

function excerptFor(section, textMatch) {
  const text = section?.searchText || section?.excerpt || '';
  if (!textMatch) return section?.excerpt || text.slice(0, 180);
  const matchStart = textMatch?.indices?.[0]?.[0] ?? 0;
  const start = Math.max(0, matchStart - 72);
  const end = Math.min(text.length, matchStart + 148);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function matchingSection(item, matches) {
  const sections = Array.isArray(item.sections) ? item.sections : [];
  const textMatch = matches.find((match) => match.key === 'sections.searchText');
  const titleMatch = matches.find((match) => match.key === 'sections.title');
  const match = textMatch || titleMatch;
  const section = Number.isInteger(match?.refIndex) ? sections[match.refIndex] : sections[0];
  return { section, textMatch };
}

function renderSearchResults(matches, query) {
  if (!searchResults) return;

  if (!matches.length) {
    searchResults.innerHTML = '<div class="search-item no-results">No chats found</div>';
    setSearchExpanded(true);
    return;
  }

  searchResults.innerHTML = matches.map(({ item, matches: fuseMatches = [] }, index) => {
    const { section, textMatch } = matchingSection(item, fuseMatches);
    const excerpt = excerptFor(section, textMatch);
    const hash = Number.isInteger(section?.id) ? `#chat-section-${section.id}` : '';
    const searchQuery = `?q=${encodeURIComponent(query)}`;
    return `
      <a
        id="chat-search-result-${index}"
        class="search-item chat-search-item"
        href="${basePath}chats/${encodeURIComponent(item.slug)}.html${searchQuery}${hash}"
        role="option"
        aria-selected="false"
      >
        <span class="search-cat">Chat</span>
        <span class="chat-search-title">${escapeHtml(item.title || item.slug)}</span>
        ${section?.title ? `<span class="chat-search-section">${escapeHtml(section.title)}</span>` : ''}
        ${excerpt ? `<span class="chat-search-excerpt">${escapeHtml(excerpt)}</span>` : ''}
      </a>
    `;
  }).join('');
  setSearchExpanded(true);
}

function setupSearch(items) {
  if (!searchInput || !searchResults || typeof Fuse !== 'function') return;

  const fuse = new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.25 },
      { name: 'sections.title', weight: 0.2 },
      { name: 'sections.searchText', weight: 0.55 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeMatches: true,
  });

  const search = () => {
    const query = searchInput.value.trim();
    if (query.length < 2) {
      clearSearchResults();
      return;
    }

    renderSearchResults(fuse.search(query, { limit: MAX_SEARCH_RESULTS }), query);
  };
  const debouncedSearch = debounce(search, SEARCH_DEBOUNCE_MS);
  cancelPendingSearch = debouncedSearch.cancel;

  searchInput.addEventListener('input', debouncedSearch);

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearSearchResults();
      searchInput.focus();
      return;
    }

    if (event.key !== 'ArrowDown') return;
    const firstResult = searchResults.querySelector('.chat-search-item');
    if (firstResult) {
      event.preventDefault();
      firstResult.focus();
    }
  });

  searchResults.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clearSearchResults();
      searchInput.focus();
    }
  });
}

async function loadIndex() {
  try {
    const response = await fetch(`${basePath}content/chats/_index.json`);
    if (!response.ok) {
      renderList([]);
      return;
    }
    const data = await response.json();
    const items = data.items || [];
    renderList(items);
    setupSearch(items);
  } catch (error) {
    renderList([]);
  }
}

buildNav();
loadIndex();

document.addEventListener('pointerdown', (event) => {
  if (!searchContainer?.contains(event.target)) clearSearchResults();
});
