/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quote. Base: quote (inferred — no library convention in catalog).
 * Source: https://wknd.site/us/en/magazine/arctic-surfing.html
 *   The quote appears as a <blockquote> inside a .cmp-text (instances[]: .quote / blockquote / .cmp-quote).
 * Structure: 1-column quote. Row 1 = block name. Row 2 = single cell holding the quote text
 *   and optional attribution/citation.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  // Resolve the quote text source: a blockquote if the element wraps/contains one, else the element itself.
  const blockquote = element.tagName === 'BLOCKQUOTE'
    ? element
    : element.querySelector('blockquote, .cmp-quote__text, .quote__text');

  const quoteText = (blockquote || element).textContent.trim();
  // Optional attribution / citation.
  const attributionEl = element.querySelector('.cmp-quote__author, .quote__author, cite, footer');

  if (!quoteText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const contentCell = [];
  const p = document.createElement('p');
  p.textContent = quoteText;
  contentCell.push(p);
  if (attributionEl && attributionEl.textContent.trim()) {
    const cite = document.createElement('p');
    cite.textContent = attributionEl.textContent.trim();
    contentCell.push(cite);
  }

  const cells = [[contentCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'quote', cells });
  element.replaceWith(block);
}
