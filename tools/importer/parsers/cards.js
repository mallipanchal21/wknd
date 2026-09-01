/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards. Base: cards.
 * Source: https://wknd.site/us/en.html (.image-list.list / .cmp-image-list teaser card grid)
 * Structure: 2-column cards. Row 1 = block name. Each following row = one card:
 *   cell 1 = image (mandatory), cell 2 = text (title heading link + description).
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-image-list__item, li.cmp-image-list__item'));

  const cells = [];
  items.forEach((item) => {
    const img = item.querySelector('img');
    const titleLink = item.querySelector('.cmp-image-list__item-title-link');
    const titleText = item.querySelector('.cmp-image-list__item-title');
    const description = item.querySelector('.cmp-image-list__item-description');

    const textCell = [];
    if (titleText) {
      const h = document.createElement('h3');
      const href = titleLink ? titleLink.getAttribute('href') : null;
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = titleText.textContent.trim();
        h.appendChild(a);
      } else {
        h.textContent = titleText.textContent.trim();
      }
      textCell.push(h);
    }
    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      textCell.push(p);
    }

    if (!img && textCell.length === 0) return;
    cells.push([img || '', textCell.length ? textCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
