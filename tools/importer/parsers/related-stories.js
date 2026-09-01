/* eslint-disable */
/* global WebImporter */
/**
 * Parser for related-stories. Base: cards (inferred — no library convention for "related").
 * Source: https://wknd.site/us/en/magazine/arctic-surfing.html (aside.cmp-layoutcontainer--sidebar)
 * The sidebar holds a "SHARE THIS STORY" heading and a .cmp-list of related articles,
 * each a link with a title and a date.
 * Structure: 1-column list block. Row 1 = block name. Each following row = one story
 *   (single cell) holding a title link + date.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-list__item'));

  const cells = [];
  items.forEach((item) => {
    const link = item.querySelector('.cmp-list__item-link, a');
    const titleEl = item.querySelector('.cmp-list__item-title');
    const dateEl = item.querySelector('.cmp-list__item-date');
    if (!link) return;

    const href = link.getAttribute('href');
    const cardCell = [];
    if (titleEl && href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = titleEl.textContent.trim();
      cardCell.push(a);
    }
    if (dateEl) {
      const p = document.createElement('p');
      p.textContent = dateEl.textContent.trim();
      cardCell.push(p);
    }
    if (cardCell.length) cells.push([cardCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'related-stories', cells });
  element.replaceWith(block);
}
