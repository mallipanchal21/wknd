/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-adventure. Base: tabs.
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html
 * Structure: 2-column tabs. Row 1 = block name. Each following row = one tab:
 *   cell 1 = tab label, cell 2 = tab panel content (paragraphs, images, lists).
 * Tab labels come from .cmp-tabs__tab; panel content from matching .cmp-tabs__tabpanel.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const labels = Array.from(element.querySelectorAll('.cmp-tabs__tab'));
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel'));

  const cells = [];
  panels.forEach((panel, i) => {
    const labelEl = labels[i];
    const label = labelEl ? labelEl.textContent.trim() : `Tab ${i + 1}`;

    // Extract meaningful content from the panel: prefer the contentfragment body,
    // fall back to the whole panel. Strip empty layout grids.
    const contentSource = panel.querySelector('.cmp-contentfragment__elements') || panel;
    const contentCell = [];
    Array.from(contentSource.querySelectorAll(':scope p, :scope img, :scope h1, :scope h2, :scope h3, :scope h4, :scope ul, :scope ol'))
      .forEach((node) => {
        // avoid picking headings that are just the fragment title duplicated; keep all real content
        contentCell.push(node);
      });

    // Fallback: if nothing matched, grab images and paragraphs anywhere in the panel
    if (contentCell.length === 0) {
      Array.from(panel.querySelectorAll('p, img, h1, h2, h3, h4, ul, ol')).forEach((n) => contentCell.push(n));
    }

    const labelP = document.createElement('p');
    labelP.textContent = label;
    cells.push([labelP, contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-adventure', cells });
  element.replaceWith(block);
}
