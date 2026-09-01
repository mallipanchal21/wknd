/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns. Base: columns.
 * Source: https://wknd.site/us/en.html (.teaser.cmp-teaser--featured)
 * Structure: columns block. Row 1 = block name. Row 2 = two columns:
 *   col 1 = text (eyebrow/pretitle + heading + description + CTA), col 2 = image.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const img = element.querySelector('.cmp-teaser__image img, img');
  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  const description = element.querySelector('.cmp-teaser__description');
  const cta = element.querySelector('.cmp-teaser__action-link');

  const textCell = [];
  if (pretitle) {
    const p = document.createElement('p');
    p.textContent = pretitle.textContent.trim();
    textCell.push(p);
  }
  if (title) {
    const h = document.createElement('h2');
    h.textContent = title.textContent.trim();
    textCell.push(h);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    textCell.push(p);
  }
  if (cta && cta.getAttribute('href')) {
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.trim();
    textCell.push(a);
  }

  if (textCell.length === 0 && !img) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[textCell.length ? textCell : '', img || '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
