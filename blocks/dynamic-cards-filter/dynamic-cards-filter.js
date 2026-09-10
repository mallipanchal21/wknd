import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

// child folders whose pages are never listed (private / gated content)
const EXCLUDE_SEGMENTS = new Set(['members-only']);

// per-language label for the "show everything" tab (fallback: English)
const ALL_LABEL = {
  en: 'All',
  es: 'Todos',
  fr: 'Tous',
  de: 'Alle',
  it: 'Tutti',
};

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
 * ("adventures", or a full path like "/us/en/adventures"), one value per cell.
 * @param {Element} block The dynamic-cards-filter block element
 * @returns {{folder: string}}
 */
function readConfig(block) {
  let folder = '';
  block.querySelectorAll(':scope > div').forEach((row) => {
    row.querySelectorAll(':scope > div').forEach((cell) => {
      const text = cell.textContent.trim();
      if (text && !folder) folder = text;
    });
  });
  const parts = folder.replace(/\.html$/, '').split('/').filter(Boolean);
  folder = parts.length ? parts[parts.length - 1] : folder;
  return { folder };
}

/**
 * Build a single card <li> matching the static cards-filter markup so the
 * existing cards-filter CSS applies unchanged.
 * @param {Object} row A query-index row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const li = document.createElement('li');
  const path = row.path.replace(/\.html$/, '');
  const category = (row.category || '').trim();
  if (category) li.dataset.category = toClassName(category);

  if (row.image) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'cards-filter-card-image';
    const link = document.createElement('a');
    link.href = path;
    link.append(createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]));
    imageDiv.append(link);
    li.append(imageDiv);
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'cards-filter-card-body';
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
  const { folder } = readConfig(block);
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

  // alphabetical by title (locale-aware)
  children.sort((a, b) => (a.title || a.path).localeCompare(b.title || b.path));

  // distinct categories preserved in first-seen order, keyed by slug -> label
  const categories = new Map();
  children.forEach((row) => {
    const label = (row.category || '').trim();
    if (label && !categories.has(toClassName(label))) {
      categories.set(toClassName(label), label);
    }
  });

  const ul = document.createElement('ul');
  children.forEach((row) => ul.append(buildCard(row)));

  block.textContent = '';

  // build filter tabs only when categories exist in the index
  if (categories.size > 0) {
    const lang = (prefix.split('/')[2] || 'en').toLowerCase();
    const allLabel = ALL_LABEL[lang] || ALL_LABEL.en;

    const tablist = document.createElement('div');
    tablist.className = 'cards-filter-tabs';
    tablist.setAttribute('role', 'tablist');

    const makeTab = (label, value, selected) => {
      const btn = document.createElement('button');
      btn.className = 'cards-filter-tab';
      btn.type = 'button';
      btn.textContent = label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.dataset.filter = value;
      btn.addEventListener('click', () => {
        tablist.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', 'false'));
        btn.setAttribute('aria-selected', 'true');
        ul.querySelectorAll(':scope > li').forEach((li) => {
          const show = value === '*' || li.dataset.category === value;
          li.hidden = !show;
        });
      });
      return btn;
    };

    tablist.append(makeTab(allLabel, '*', true));
    [...categories].forEach(([value, label]) => tablist.append(makeTab(label, value, false)));
    block.append(tablist);
  }

  block.append(ul);
}
