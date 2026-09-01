/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion. Base: accordion.
 * Source: https://wknd.site/us/en/faqs.html (.accordion.panelcontainer / .cmp-accordion)
 * Structure: 2-column accordion. Row 1 = block name. Each following row = one item:
 *   cell 1 = question/title, cell 2 = answer/panel content.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-accordion__item'));

  const cells = [];
  items.forEach((item) => {
    const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__header');
    const panel = item.querySelector('.cmp-accordion__panel');

    const title = titleEl ? titleEl.textContent.trim() : '';

    // Answer content: extract meaningful text nodes from the panel.
    const answerCell = [];
    if (panel) {
      const nodes = Array.from(panel.querySelectorAll('.cmp-text p, .cmp-text h1, .cmp-text h2, .cmp-text h3, .cmp-text h4, .cmp-text ul, .cmp-text ol, .cmp-text img'));
      if (nodes.length) {
        nodes.forEach((n) => answerCell.push(n));
      } else {
        // fallback: any paragraph/heading/list/image within the panel
        Array.from(panel.querySelectorAll('p, h1, h2, h3, h4, ul, ol, img')).forEach((n) => answerCell.push(n));
      }
    }

    if (!title && answerCell.length === 0) return;

    const titleP = document.createElement('p');
    titleP.textContent = title;
    cells.push([titleP, answerCell.length ? answerCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });
  element.replaceWith(block);
}
