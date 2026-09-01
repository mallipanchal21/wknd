/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-metadata. Base: cards (no images).
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html (article.cmp-contentfragment)
 * Structure: 1-column "Cards (no images)". Row 1 = block name. Each following row = one card
 *   (single cell) holding a label/value attribute pair: label as heading, value as text.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const pairs = Array.from(element.querySelectorAll('.cmp-contentfragment__element'));

  const cells = [];
  pairs.forEach((pair) => {
    const labelEl = pair.querySelector('.cmp-contentfragment__element-title, dt');
    const valueEl = pair.querySelector('.cmp-contentfragment__element-value, dd');
    const label = labelEl ? labelEl.textContent.trim() : '';
    const value = valueEl ? valueEl.textContent.trim() : '';
    if (!label && !value) return;

    const cardCell = [];
    if (label) {
      const h = document.createElement('h3');
      h.textContent = label;
      cardCell.push(h);
    }
    if (value) {
      const p = document.createElement('p');
      p.textContent = value;
      cardCell.push(p);
    }
    cells.push([cardCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-metadata', cells });
  element.replaceWith(block);
}
