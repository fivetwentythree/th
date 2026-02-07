const basePath = CONFIG.basePath || '/';

function getInitials(name) {
  if (!name) return 'LL';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function getHandle(name) {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0];
  return `@${first.toLowerCase()}`;
}

let thread = {
  title: 'Chat Transcript',
  author: {
    name: CONFIG.name || 'Author',
    handle: getHandle(CONFIG.name || 'Author'),
    initials: getInitials(CONFIG.name || 'Author'),
  },
  stars: 0,
  refId: 'chat-transcript',
  createdAgo: '',
};

let blocks = [
  {
    id: 'message-0-block-0',
    type: 'message',
    role: 'assistant',
    jump: true,
    text: 'Add a transcript at content/chats/transcript.md to render it here.',
  },
];

const icons = {
  link: `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g></svg>`,
  chevron: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18l6-6l-6-6"></path></svg>`,
  file: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path></g></svg>`,
  terminal: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19h8M4 17l6-6l-6-6"></path></svg>`,
  diff: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2zm3-12h6m-3 3V7M9 17h6"></path></svg>`,
};

const messageList = document.querySelector('[data-message-list]');
const jumpNav = document.querySelector('[data-jump-nav]');
const nav = document.getElementById('nav');
let jumpObserver = null;

function escapeHtml(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function markdownToHtml(raw) {
  const source = raw || '';
  let text = source.replace(/\r\n/g, '\n');
  text = text.replace(/<br\s*\/?>/gi, '@@BR@@');
  const inlineTables = [];

  function parseInlineTable(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const categoryHeader =
      'CategoryEvent / Time PeriodKey Medini Calculation / TransitAstrological Signature & Similarity';
    const projectionHeader =
      'Time PeriodKey Medini Calculation / TransitAstrological SignatureHistorical Similarity / Equivalent Era';

    let type = null;
    if (trimmed.startsWith(categoryHeader)) {
      type = 'category';
    } else if (trimmed.startsWith(projectionHeader)) {
      type = 'projection';
    }

    if (!type) return null;

    const firstBold = trimmed.indexOf('**');
    if (firstBold === -1) return null;
    const body = trimmed.slice(firstBold);

    if (type === 'category') {
      const headers = [
        'Category',
        'Event / Time Period',
        'Key Medini Calculation / Transit',
        'Astrological Signature & Similarity',
      ];
      const rowRegex =
        /(?:\*\*([^*]+)\*\*)?\s*\*\*([^*]+)\*\*@@BR@@\(([^)]*)\)/g;
      const matches = [...body.matchAll(rowRegex)];
      if (!matches.length) return null;
      const rows = [];
      let currentCategory = '';
      matches.forEach((match, index) => {
        if (match[1]) currentCategory = match[1].trim();
        const event = match[2].trim();
        const time = match[3].trim();
        const start = match.index + match[0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
        const segment = body.slice(start, end);
        const splitMatches = [...segment.matchAll(/\*\*([^*]+)\*\*@@BR@@/g)];
        let keyText = segment.trim();
        let signatureText = '';
        if (splitMatches.length) {
          const last = splitMatches[splitMatches.length - 1];
          keyText = segment.slice(0, last.index).trim();
          const signatureBody = segment
            .slice(last.index + last[0].length)
            .trim();
          signatureText = `**${last[1]}**@@BR@@${signatureBody}`;
        }
        const eventCell = `${event}@@BR@@(${time})`;
        rows.push([currentCategory, eventCell, keyText, signatureText]);
      });
      return { headers, rows };
    }

    if (type === 'projection') {
      const headers = [
        'Time Period',
        'Key Medini Calculation / Transit',
        'Astrological Signature',
        'Historical Similarity / Equivalent Era',
      ];
      const rowRegex = /\*\*([^*]+)\*\*(?=\s*\*\*[^*]+\*\*)/g;
      const matches = [...body.matchAll(rowRegex)];
      if (!matches.length) return null;
      const rows = [];
      matches.forEach((match, index) => {
        const timePeriod = match[1].trim();
        const start = match.index + match[0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
        const segment = body.slice(start, end);
        const splitMatches = [...segment.matchAll(/\*\*([^*]+)\*\*@@BR@@/g)];
        let keyText = segment.trim();
        let signatureText = '';
        let historyText = '';
        if (splitMatches.length >= 2) {
          const signatureMatch = splitMatches[splitMatches.length - 2];
          const historyMatch = splitMatches[splitMatches.length - 1];
          keyText = segment.slice(0, signatureMatch.index).trim();
          const signatureBody = segment
            .slice(signatureMatch.index + signatureMatch[0].length, historyMatch.index)
            .trim();
          signatureText = `**${signatureMatch[1]}**@@BR@@${signatureBody}`;
          const historyBody = segment
            .slice(historyMatch.index + historyMatch[0].length)
            .trim();
          historyText = `**${historyMatch[1]}**@@BR@@${historyBody}`;
        }
        rows.push([timePeriod, keyText, signatureText, historyText]);
      });
      return { headers, rows };
    }

    return null;
  }

  const codeBlocks = [];
  const inlineCodes = [];

  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = codeBlocks.length;
    codeBlocks.push({
      lang: lang ? lang.trim() : '',
      code,
    });
    return `\n@@CODEBLOCK_${id}@@\n`;
  });

  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const id = inlineCodes.length;
    inlineCodes.push(code);
    return `@@INLINE_${id}@@`;
  });

  const linesForTables = text.split('\n');
  const tableProcessed = [];
  linesForTables.forEach((line) => {
    const parsedTable = parseInlineTable(line);
    if (parsedTable) {
      const id = inlineTables.length;
      inlineTables.push(parsedTable);
      tableProcessed.push(`@@HTMLBLOCK_${id}@@`);
      return;
    }
    tableProcessed.push(line);
  });
  text = tableProcessed.join('\n');

  text = escapeHtml(text);

  function formatInline(value) {
    let output = value;
    output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    output = output.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
    output = output.replace(/@@INLINE_(\d+)@@/g, (_, id) => {
      return `<code>${escapeHtml(inlineCodes[Number(id)])}</code>`;
    });
    output = output.replace(/@@BR@@/g, '<br>');
    return output;
  }

  function renderInlineTable(table) {
    const headerHtml = table.headers
      .map((cell) => `<th>${formatInline(cell)}</th>`)
      .join('');
    const bodyHtml = table.rows
      .map((row) => {
        const cells = row
          .map((cell) => `<td>${formatInline(cell)}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');
    return `<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }

  const lines = text.split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let inBlockquote = false;
  let i = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    const content = formatInline(paragraph.join('<br>'));
    html.push(`<p>${content}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html.push('</blockquote>');
      inBlockquote = false;
    }
  }

  function splitTableRow(line) {
    let row = line.trim();
    if (row.startsWith('|')) row = row.slice(1);
    if (row.endsWith('|')) row = row.slice(0, -1);
    return row.split('|').map((cell) => cell.trim());
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      closeBlockquote();
      i += 1;
      continue;
    }

    const codeMatch = trimmed.match(/^@@CODEBLOCK_(\d+)@@$/);
    if (codeMatch) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const block = codeBlocks[Number(codeMatch[1])];
      const langClass = block.lang ? `language-${block.lang}` : '';
      html.push(
        `<pre><code class="${langClass}">${escapeHtml(block.code)}</code></pre>`
      );
      i += 1;
      continue;
    }

    const htmlBlockMatch = trimmed.match(/^@@HTMLBLOCK_(\d+)@@$/);
    if (htmlBlockMatch) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const table = inlineTables[Number(htmlBlockMatch[1])];
      if (table) {
        html.push(renderInlineTable(table));
      }
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html.push('<hr>');
      i += 1;
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        html.push('<blockquote>');
        inBlockquote = true;
      }
      html.push(`<p>${formatInline(blockquoteMatch[1])}</p>`);
      i += 1;
      continue;
    }

    const nextLine = lines[i + 1] || '';
    const isTableHeader =
      trimmed.includes('|') &&
      /^\s*\|?[-: ]+\|[-|: ]*\s*$/.test(nextLine);
    if (isTableHeader) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const headerCells = splitTableRow(trimmed);
      const alignCells = splitTableRow(nextLine).map((cell) => {
        const align = cell.trim();
        if (align.startsWith(':') && align.endsWith(':')) return 'center';
        if (align.endsWith(':')) return 'right';
        if (align.startsWith(':')) return 'left';
        return 'left';
      });
      const bodyRows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().includes('|')) {
        bodyRows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const headerHtml = headerCells
        .map((cell, index) => {
          const align = alignCells[index] || 'left';
          return `<th style="text-align:${align}">${formatInline(cell)}</th>`;
        })
        .join('');
      const bodyHtml = bodyRows
        .map((row) => {
          const cells = row
            .map((cell, index) => {
              const align = alignCells[index] || 'left';
              return `<td style="text-align:${align}">${formatInline(cell)}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      html.push(`<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      closeBlockquote();
      const nextType = orderedMatch ? 'ol' : 'ul';
      if (listType && listType !== nextType) {
        closeList();
      }
      if (!listType) {
        listType = nextType;
        html.push(`<${listType}>`);
      }
      const itemText = orderedMatch ? orderedMatch[1] : unorderedMatch[1];
      html.push(`<li>${formatInline(itemText)}</li>`);
      i += 1;
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }

  flushParagraph();
  closeList();
  closeBlockquote();

  return html.join('');
}

function renderDiffLines(diffText) {
  return diffText
    .split('\n')
    .map((line) => {
      const safeLine = escapeHtml(line);
      const trimmed = line.trim();
      if (trimmed.startsWith('+')) {
        return `<span class="line add">${safeLine}</span>`;
      }
      if (trimmed.startsWith('-')) {
        return `<span class="line remove">${safeLine}</span>`;
      }
      return `<span class="line">${safeLine}</span>`;
    })
    .join('\n');
}

function renderBlock(block) {
  if (block.type === 'message') {
    const isAssistant = block.role === 'assistant';
    const avatarLabel = '';
    const rendered = markdownToHtml(block.text);
    return `
      <div id="${block.id}" class="block message-block">
        <a class="block-link" href="#${block.id}" data-copy-link="${block.id}" aria-label="Link to this block">
          ${icons.link}
        </a>
        <div class="message ${isAssistant ? 'assistant' : ''}">
          <span class="avatar ${isAssistant ? 'assistant' : 'user'}">${avatarLabel}</span>
          <section class="bubble markdown">${rendered}</section>
        </div>
      </div>
    `;
  }

  if (block.type === 'thinking') {
    const expanded = block.expanded === true;
    const rendered = markdownToHtml(block.content);
    return `
      <div id="${block.id}" class="block thinking-block">
        <a class="block-link" href="#${block.id}" data-copy-link="${block.id}" aria-label="Link to this block">
          ${icons.link}
        </a>
        <button class="thinking-toggle" type="button" data-toggle="thinking" aria-expanded="${expanded}">
          ${icons.chevron}
          <span>${block.title}</span>
        </button>
        <div class="thinking-content markdown" ${expanded ? '' : 'hidden'}>${rendered}</div>
      </div>
    `;
  }

  if (block.type === 'tool') {
    const expanded = block.expanded !== false;
    const stats = block.stats
      ? `<div class="tool-stats"><span class="plus">+${block.stats.add}</span><span class="minus">-${block.stats.del}</span><span class="tilde">~${block.stats.mod}</span></div>`
      : '';

    let headerMain = '';
    let details = '';
    let icon = icons.file;
    let detailClass = '';

    if (block.variant === 'resource') {
      headerMain = `
        <div class="tool-title">
          <span>${block.title}</span>
          <span class="tool-meta">${block.meta}</span>
        </div>
      `;
      details = `<pre>${escapeHtml(block.details)}</pre>`;
      detailClass = 'resource';
    }

    if (block.variant === 'diff') {
      headerMain = `
        <div class="tool-title">
          <span>${block.title}</span>
          <span class="tool-meta">${block.meta}</span>
        </div>
        ${stats}
      `;
      details = `<pre>${renderDiffLines(block.diff)}</pre>`;
      detailClass = 'diff';
    }

    if (block.variant === 'command') {
      icon = icons.terminal;
      headerMain = `<div class="tool-title"><span class="tool-meta">${escapeHtml(
        block.command
      )}</span></div>`;
      details = `<pre>${escapeHtml(block.details)}</pre>`;
      detailClass = 'command';
    }

    if (block.variant === 'diff') {
      icon = icons.diff;
    }

    return `
      <div id="${block.id}" class="block tool-block">
        <a class="block-link" href="#${block.id}" data-copy-link="${block.id}" aria-label="Link to this block">
          ${icons.link}
        </a>
        <div class="tool-card ${detailClass}">
          <div class="tool-header">
            <span class="tool-icon">${icon}</span>
            <div class="tool-main">${headerMain}</div>
            <button class="btn icon" type="button" data-toggle="details" aria-expanded="${expanded}">
              ${icons.chevron}
            </button>
          </div>
          <div class="tool-details" ${expanded ? '' : 'hidden'}>${details}</div>
        </div>
      </div>
    `;
  }

  return '';
}

function renderJumpNav() {
  const jumpTargets = blocks.filter((block) => block.jump);
  jumpNav.innerHTML = jumpTargets
    .map((block, index) => {
      const labelSource =
        block.text || block.title || block.command || `Message ${index + 1}`;
      const label =
        labelSource.length > 48
          ? `${labelSource.slice(0, 45)}...`
          : labelSource;
      const safeLabel = escapeHtml(label);
      return `
        <button type="button" data-target="${block.id}" aria-label="Jump to message ${index + 1}">
          <span class="dot"></span>
          <span class="line"></span>
          <span class="jump-label">${index + 1}. ${safeLabel}</span>
        </button>
      `;
    })
    .join('');
}

function parseTranscript(raw) {
  const cleaned = raw.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return { blocks: [] };

  let title = thread.title;
  const titleMatch = cleaned.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const headingMatches = [...cleaned.matchAll(/^##\s+(.+)$/gm)];
  if (headingMatches.length === 0) {
    return { title, blocks: [] };
  }

  const parsedBlocks = [];
  let counter = 0;

  headingMatches.forEach((match, index) => {
    const heading = match[1].trim();
    const start = match.index + match[0].length;
    const end =
      index + 1 < headingMatches.length ? headingMatches[index + 1].index : cleaned.length;
    let content = cleaned.slice(start, end);
    content = content.replace(/\n\s*---\s*\n/g, '\n');
    let lines = content.split('\n');
    lines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^Expand to view model thoughts/i.test(trimmed)) return false;
      if (/^chevron_right/i.test(trimmed)) return false;
      return true;
    });
    content = lines.join('\n').trim();
    if (!content) return;

    const lower = heading.toLowerCase();
    if (lower.includes('thinking')) {
      parsedBlocks.push({
        id: `block-${counter++}`,
        type: 'thinking',
        title: 'Thinking',
        content,
        expanded: false,
      });
      return;
    }

    const isUser =
      lower.includes('user') ||
      lower.includes('human') ||
      lower.includes('prompt');
    parsedBlocks.push({
      id: `block-${counter++}`,
      type: 'message',
      role: isUser ? 'user' : 'assistant',
      jump: true,
      text: content,
    });
  });

  const hasUser = parsedBlocks.some(
    (block) => block.type === 'message' && block.role === 'user'
  );
  const looksLikeAiStudio =
    /google ai studio/i.test(title) || /\*exported:/i.test(cleaned);
  if (!hasUser && looksLikeAiStudio) {
    const firstMessage = parsedBlocks.find((block) => block.type === 'message');
    if (firstMessage) {
      firstMessage.role = 'user';
    }
  }

  return { title, blocks: parsedBlocks };
}

function getSlugFromPath() {
  const match = window.location.pathname.match(/\/chats\/([^/]+)\.html$/);
  return match ? match[1] : null;
}

async function loadTranscript() {
  const params = new URLSearchParams(window.location.search);
  const slug =
    window.CHAT_SLUG ||
    params.get('t') ||
    getSlugFromPath() ||
    'transcript';
  const url = `${basePath}content/chats/${slug}.md?v=${Date.now()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return;
    }
    const text = await response.text();
    const parsed = parseTranscript(text);
    if (!parsed.blocks.length) return;
    blocks = parsed.blocks;
    thread = { ...thread, title: parsed.title || thread.title, createdAgo: 'Imported' };
  } catch (error) {
    // Ignore missing file in static environments.
  }
}

function fillThreadHeader() {
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  setText('[data-thread-title]', thread.title);
  document.title = `${thread.title} - ${CONFIG.name || 'Chats'}`;
  setText('[data-author-name]', thread.author.name);
  setText('[data-author-handle]', thread.author.handle);
  setText('[data-author-initials]', thread.author.initials);
  setText('[data-star-count]', thread.stars);

  const dot = document.querySelector('[data-author-dot]');
  if (dot) {
    dot.style.display = thread.author.handle ? 'inline' : 'none';
  }
}

function initMessages() {
  messageList.innerHTML = blocks.map(renderBlock).join('');
}

function toast(message) {
  const container = document.querySelector('[data-toasts]');
  if (!container) return;
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  container.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    setTimeout(() => node.remove(), 200);
  }, 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch (err) {
    toast('Copy failed');
  }
}

function bindInteractions() {
  document.addEventListener('click', (event) => {
    const thinkingBtn = event.target.closest('[data-toggle=\'thinking\']');
    if (thinkingBtn) {
      const expanded = thinkingBtn.getAttribute('aria-expanded') === 'true';
      thinkingBtn.setAttribute('aria-expanded', String(!expanded));
      const content = thinkingBtn.nextElementSibling;
      if (content) {
        content.toggleAttribute('hidden', expanded);
      }
      return;
    }

    const detailsBtn = event.target.closest('[data-toggle=\'details\']');
    if (detailsBtn) {
      const expanded = detailsBtn.getAttribute('aria-expanded') === 'true';
      detailsBtn.setAttribute('aria-expanded', String(!expanded));
      const card = detailsBtn.closest('.tool-card');
      const details = card?.querySelector('.tool-details');
      if (details) {
        details.toggleAttribute('hidden', expanded);
      }
      return;
    }

    const linkBtn = event.target.closest('[data-copy-link]');
    if (linkBtn) {
      const id = linkBtn.getAttribute('data-copy-link');
      const base = window.location.href.split('#')[0];
      copyText(`${base}#${id}`);
    }

    const starBtn = event.target.closest('[data-action=\'star\']');
    if (starBtn) {
      const countEl = starBtn.querySelector('[data-star-count]');
      const current = Number(countEl?.textContent || 0);
      const starred = starBtn.getAttribute('aria-pressed') === 'true';
      const next = starred ? current - 1 : current + 1;
      starBtn.setAttribute('aria-pressed', String(!starred));
      if (countEl) countEl.textContent = String(Math.max(next, 0));
    }

    const navBtn = event.target.closest('[data-target]');
    if (navBtn) {
      const targetId = navBtn.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

function observeBlocks() {
  if (jumpObserver) {
    jumpObserver.disconnect();
  }
  const jumpTargets = blocks.filter((block) => block.jump);
  const buttonMap = new Map();

  document.querySelectorAll('[data-target]').forEach((btn) => {
    const id = btn.getAttribute('data-target');
    if (id) buttonMap.set(id, btn);
  });

  jumpObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          buttonMap.forEach((btn) => btn.classList.remove('active'));
          const btn = buttonMap.get(entry.target.id);
          if (btn) btn.classList.add('active');
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  jumpTargets.forEach((block) => {
    const node = document.getElementById(block.id);
    if (node) jumpObserver.observe(node);
  });
}

function buildNav() {
  if (!nav) return;
  nav.innerHTML = `
    <a href="${basePath}index.html" class="name">${CONFIG.name}</a>
    <a href="${basePath}thoughts.html">Thoughts</a>
    <a href="${basePath}chats/index.html" class="active">Chats</a>
  `;
}

async function bootstrap() {
  buildNav();
  await loadTranscript();
  fillThreadHeader();
  initMessages();
  renderJumpNav();
  bindInteractions();
  observeBlocks();
}

document.addEventListener('DOMContentLoaded', bootstrap);
