import { createOptimizedPicture } from '../../scripts/aem.js';

// child folders whose pages are never listed (private / gated content)
const EXCLUDE_SEGMENTS = new Set(['members-only']);
const DEFAULT_LIMIT = 4;

/**
 * Determine the locale prefix ("/us/en") from the current path, matching the
 * /{country}/{lang}/... URL pattern. Returns '' at the site root.
 * @returns {string} the locale prefix, e.g. "/us/en", or ''
 */
function getLocalePrefix() {
  const seg = window.location.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && /^[a-z]{2}$/.test(seg[0]) && /^[a-z]{2}$/.test(seg[1])) {
    return `/${seg[0]}/${seg[1]}`;
  }
  return '';
}

/**
 * Read the block's authored configuration. Authors provide the source folder
 * ("magazine" or "adventures", or a full path like "/us/en/magazine") and an
 * optional limit, one value per cell. The limit may be a number, or "all"
 * (case-insensitive) to list every matching page.
 * @param {Element} block The dynamic-cards block element
 * @returns {{folder: string, limit: number}}
 */
function readConfig(block) {
  let folder = '';
  let limit = DEFAULT_LIMIT;
  block.querySelectorAll(':scope > div').forEach((row) => {
    row.querySelectorAll(':scope > div').forEach((cell) => {
      const text = cell.textContent.trim();
      if (!text) return;
      if (/^\d+$/.test(text)) limit = parseInt(text, 10);
      else if (/^all$/i.test(text)) limit = Infinity;
      else if (!folder) folder = text;
    });
  });
  // reduce a full/relative path to its last non-empty segment (the folder name)
  const parts = folder.replace(/\.html$/, '').split('/').filter(Boolean);
  folder = parts.length ? parts[parts.length - 1] : folder;
  return { folder, limit };
}

/**
 * Build a single card <li> matching the static cards block markup so the
 * existing cards CSS applies unchanged.
 * @param {Object} row A query-index row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const li = document.createElement('li');
  const path = row.path.replace(/\.html$/, '');

  if (row.image) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'cards-card-image';
    const picture = createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]);
    const link = document.createElement('a');
    link.href = path;
    link.append(picture);
    imageDiv.append(link);
    li.append(imageDiv);
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'cards-card-body';
  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = path;
  titleLink.textContent = row.title || path;
  h3.append(titleLink);
  bodyDiv.append(h3);
  if (row.description) {
    const p = document.createElement('p');
    p.textContent = row.description;
    bodyDiv.append(p);
  }
  li.append(bodyDiv);
  return li;
}

export default async function decorate(block) {
  const { folder, limit } = readConfig(block);
  const prefix = getLocalePrefix();
  if (!folder) return;

  const base = `${prefix}/${folder}`;
  let data = [];
  try {
    const resp = await fetch(`${prefix}/query-index.json`);
    if (resp.ok) data = (await resp.json()).data || [];
  } catch (e) {
    data = [];
  }

  // keep only direct children of the source folder, dropping excluded subfolders
  const children = data.filter((row) => {
    const path = (row.path || '').replace(/\.html$/, '');
    if (!path.startsWith(`${base}/`)) return false;
    const rel = path.slice(base.length + 1).split('/').filter(Boolean);
    return rel.length === 1 && !EXCLUDE_SEGMENTS.has(rel[0]);
  });

  // newest first: sort by date descending when dates are present; entries
  // without a date keep their original (stable) query-index order
  const withIndex = children.map((row, i) => ({ row, i }));
  withIndex.sort((a, b) => {
    const da = Number(a.row.date) || 0;
    const db = Number(b.row.date) || 0;
    if (da !== db) return db - da;
    return a.i - b.i;
  });

  const selected = withIndex.slice(0, limit).map((e) => e.row);

  const ul = document.createElement('ul');
  selected.forEach((row) => ul.append(buildCard(row)));
  block.replaceChildren(ul);
}
