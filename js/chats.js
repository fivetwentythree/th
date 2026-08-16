const basePath = import.meta?.env?.BASE_URL || CONFIG.basePath || '/';

let thread = {
  title: 'Chat Transcript',
};

let blocks = [
  {
    type: 'message',
    role: 'assistant',
    text: 'Add a transcript at content/chats/transcript.md to render it here.',
  },
];

const icons = {
  chevron: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18l6-6l-6-6"></path></svg>`,
};

const messageList = document.querySelector('[data-message-list]');
const nav = document.getElementById('nav');

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
    const mathSegments = [];
    output = output.replace(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g, (match) => {
      const id = mathSegments.length;
      mathSegments.push(match);
      return `@@MATH${id}@@`;
    });
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
    output = output.replace(/@@MATH(\d+)@@/g, (_, id) => {
      return mathSegments[Number(id)] || '';
    });
    return output;
  }

  function stripInlineText(value) {
    return String(value || '')
      .replace(/@@BR@@/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
      .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function renderTableHtml(headers, rows, aligns = []) {
    const headerHtml = headers
      .map((cell, index) => {
        const align = aligns[index] || 'left';
        return `<th style="text-align:${align}">${formatInline(cell)}</th>`;
      })
      .join('');
    const bodyHtml = rows
      .map((row) => {
        const cells = row
          .map((cell, index) => {
            const align = aligns[index] || 'left';
            const label = stripInlineText(headers[index] || '');
            return `<td style="text-align:${align}" data-label="${escapeAttribute(label)}">${formatInline(cell)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');
    return `<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }

  function renderInlineTable(table) {
    return renderTableHtml(table.headers, table.rows);
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
      html.push(renderTableHtml(headerCells, bodyRows, alignCells));
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

function renderBlock(block) {
  if (block.type === 'message') {
    const isAssistant = block.role === 'assistant';
    const rendered = markdownToHtml(block.text);
    return `
      <div class="block message-block">
        <div class="message ${isAssistant ? 'assistant' : ''}">
          <span class="avatar ${isAssistant ? 'assistant' : 'user'}"></span>
          <section class="bubble markdown">${rendered}</section>
        </div>
      </div>
    `;
  }

  if (block.type === 'thinking') {
    const expanded = block.expanded === true;
    const rendered = markdownToHtml(block.content);
    return `
      <div class="block thinking-block">
        <button class="thinking-toggle" type="button" data-toggle="thinking" aria-expanded="${expanded}">
          ${icons.chevron}
          <span>${block.title}</span>
        </button>
        <div class="thinking-content markdown" ${expanded ? '' : 'hidden'}>${rendered}</div>
      </div>
    `;
  }

  return '';
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
      type: 'message',
      role: isUser ? 'user' : 'assistant',
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
    thread = { ...thread, title: parsed.title || thread.title };
  } catch (error) {
    // Ignore missing file in static environments.
  }
}

function fillThreadHeader() {
  const title = document.querySelector('[data-thread-title]');
  if (title) title.textContent = thread.title;
  document.title = `${thread.title} - ${CONFIG.name || 'Chats'}`;
}

function initMessages() {
  messageList.innerHTML = blocks.map(renderBlock).join('');
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

  });
}

function renderMath() {
  if (typeof window.renderMathInElement !== 'function') return;
  const container = document.querySelector('.messages');
  if (!container) return;
  window.renderMathInElement(container, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
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
  renderMath();
  bindInteractions();
}

document.addEventListener('DOMContentLoaded', bootstrap);
