import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// footer nav items are never built for these locale-relative page names
const NAV_EXCLUDE = new Set(['nav', 'footer']);

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
 * Rebuild the footer's nav link list dynamically from the current locale's
 * query-index.json, using every direct child page of the locale root
 * (e.g. /us/en/magazine, /us/en/adventures) except the `nav` and `footer`
 * pages and the locale home itself. On success the authored list is replaced;
 * on failure (no index, no children, no list) the authored markup is untouched.
 * @param {Element} footer The footer container element
 * @param {string} prefix The locale prefix, e.g. "/us/en"
 */
async function buildFooterNav(footer, prefix) {
  if (!prefix) return;
  const list = footer.querySelector('ul');
  if (!list) return;

  let data;
  try {
    const resp = await fetch(`${prefix}/query-index.json`);
    if (!resp.ok) return;
    data = (await resp.json()).data || [];
  } catch (e) {
    return;
  }

  // keep only the locale's direct child pages, dropping nav/footer/home
  const children = data.filter((row) => {
    const path = (row.path || '').replace(/\.html$/, '');
    if (!path.startsWith(`${prefix}/`)) return false;
    const rel = path.slice(prefix.length + 1).split('/').filter(Boolean);
    return rel.length === 1 && !NAV_EXCLUDE.has(rel[0]);
  });
  if (!children.length) return;

  // stable, predictable ordering by link label
  children.sort((a, b) => (a.title || a.path).localeCompare(b.title || b.path));

  list.textContent = '';
  children.forEach((row) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = row.path.replace(/\.html$/, '');
    a.textContent = row.title || a.href;
    li.append(a);
    list.append(li);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // build the footer nav links from the current locale's child pages
  // (falls back to the authored list if the query index is unavailable)
  await buildFooterNav(footer, getLocalePrefix());

  block.append(footer);
}
