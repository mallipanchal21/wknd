import { getMetadata } from '../../scripts/aem.js';

/**
 * Title-case a URL slug: "bali-surf-camp" -> "Bali Surf Camp".
 */
function titleFromSlug(slug) {
  return slug
    .replace(/\.html$/, '')
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Builds a breadcrumb trail from the current page path, e.g.
 * /us/en/adventures/bali-surf-camp -> Adventures > Bali Surf Camp.
 * Locale segments (/us/en) are skipped; the last segment is the current
 * (non-link) page. Intermediate segments link to their section index.
 */
export default function decorate(block) {
  // If an authored breadcrumb <ol> was passed in, just style it and stop.
  const authoredOl = block.querySelector('ol');
  if (authoredOl) {
    authoredOl.classList.add('breadcrumbs-list');
    authoredOl.querySelectorAll(':scope > li').forEach((li) => {
      li.classList.add('breadcrumbs-item');
      if (!li.querySelector('a')) li.setAttribute('aria-current', 'page');
    });
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.append(authoredOl);
    block.textContent = '';
    block.append(nav);
    return;
  }

  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const parts = path.split('/').filter(Boolean);
  // strip a leading country/lang locale pair (e.g. us/en)
  let segments = parts;
  if (segments.length >= 2 && /^[a-z]{2}$/.test(segments[0]) && /^[a-z]{2}$/.test(segments[1])) {
    segments = segments.slice(2);
  }
  if (segments.length === 0) {
    block.remove();
    return;
  }
  const localePrefix = parts.slice(0, parts.length - segments.length).join('/');
  const base = localePrefix ? `/${localePrefix}` : '';

  const ol = document.createElement('ol');
  ol.className = 'breadcrumbs-list';

  segments.forEach((seg, i) => {
    const li = document.createElement('li');
    li.className = 'breadcrumbs-item';
    const isLast = i === segments.length - 1;
    const label = isLast
      ? (getMetadata('breadcrumb-title') || document.title || titleFromSlug(seg))
      : titleFromSlug(seg);
    if (isLast) {
      li.setAttribute('aria-current', 'page');
      li.textContent = label;
    } else {
      const a = document.createElement('a');
      a.href = `${base}/${segments.slice(0, i + 1).join('/')}`;
      a.textContent = label;
      li.append(a);
    }
    ol.append(li);
  });

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
