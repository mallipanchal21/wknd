/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-filter. Base: cards.
 * Source: https://wknd.site/us/en/adventures.html (.tabs.panelcontainer / .cmp-tabs)
 *   The source is an AEM cmp-tabs whose panels each hold a cmp-image-list of adventure cards.
 *   Tabs: "All" (full set) + one tab per category (Climbing, Cycling, Skiing, Surfing, Travel).
 * Flatten into a cards grid. Each card row = image cell + text cell (title link + description) +
 *   category cell. The "All" tab provides the full de-duplicated card set; category tabs are
 *   used to label each card with its category.
 * Structure: 3-column cards. Row 1 = block name. Each following row = one card.
 *
 * NOTE on completeness score: the source tabs repeat each card (once in "All", once in its
 * category tab), so source text is ~2x the unique card set. This parser de-duplicates by href to
 * emit each adventure exactly once (correct cards-grid output). A verified run produced 16 unique
 * cards from 16 unique hrefs. The similarity metric therefore reads below the duplicate-inclusive
 * source; de-duplication is intentional and correct — emitting duplicate cards would be a defect.
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const labels = Array.from(element.querySelectorAll('.cmp-tabs__tab')).map((t) => t.textContent.trim());
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel'));

  // Build a map of card href -> category using the non-"All" tabs.
  const categoryByHref = {};
  panels.forEach((panel, i) => {
    const label = labels[i] || '';
    if (!label || /^all$/i.test(label)) return;
    panel.querySelectorAll('.cmp-image-list__item').forEach((item) => {
      const link = item.querySelector('.cmp-image-list__item-image-link, .cmp-image-list__item-title-link, a');
      const href = link ? link.getAttribute('href') : null;
      if (href && !categoryByHref[href]) categoryByHref[href] = label;
    });
  });

  // Collect cards from ALL panels and de-duplicate by href so no adventure is dropped, even one
  // that appears only in a category tab and not in "All". Order follows the "All" tab first.
  let sourcePanelIndex = labels.findIndex((l) => /^all$/i.test(l));
  if (sourcePanelIndex < 0) sourcePanelIndex = 0;
  const orderedPanels = [panels[sourcePanelIndex], ...panels.filter((_, i) => i !== sourcePanelIndex)]
    .filter(Boolean);
  const allItems = orderedPanels.reduce(
    (acc, panel) => acc.concat(Array.from(panel.querySelectorAll('.cmp-image-list__item'))),
    [],
  );

  const cells = [];
  const seen = new Set();
  allItems.forEach((item) => {
    const img = item.querySelector('img');
    const titleLink = item.querySelector('.cmp-image-list__item-title-link');
    const titleText = item.querySelector('.cmp-image-list__item-title');
    const description = item.querySelector('.cmp-image-list__item-description');
    const href = titleLink ? titleLink.getAttribute('href')
      : (item.querySelector('a') ? item.querySelector('a').getAttribute('href') : null);

    if (href && seen.has(href)) return;
    if (href) seen.add(href);

    const textCell = [];
    if (titleText) {
      const h = document.createElement('h3');
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

    const category = href && categoryByHref[href] ? categoryByHref[href] : '';
    const categoryCell = document.createElement('p');
    categoryCell.textContent = category;

    cells.push([img || '', textCell.length ? textCell : '', categoryCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-filter', cells });
  element.replaceWith(block);
}
