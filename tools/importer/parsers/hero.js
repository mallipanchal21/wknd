/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero. Base: hero.
 * Source: https://wknd.site/us/en.html (.teaser.cmp-teaser--hero "Next Adventures" feature)
 *         and https://wknd.site/us/en/adventures.html (hero banner with overlaid intro).
 * Structure: 1-column hero. Row 1 = block name. Row 2 = single cell with background image.
 *   Row 3 = single cell with title (heading) + subheading + CTA.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const img = element.querySelector('.cmp-teaser__image img, img');
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  const description = element.querySelector('.cmp-teaser__description');
  const cta = element.querySelector('.cmp-teaser__action-link');

  const cells = [];

  // Row 2: background image (optional)
  if (img) cells.push([img]);

  // Row 3: text content (title + subheading + CTA)
  const contentCell = [];
  if (title) {
    const h = document.createElement('h2');
    h.textContent = title.textContent.trim();
    contentCell.push(h);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    contentCell.push(p);
  }
  if (cta && cta.getAttribute('href')) {
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.trim();
    contentCell.push(a);
  }
  if (contentCell.length) cells.push([contentCell]);

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
