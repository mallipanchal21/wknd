/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-team. Base: cards.
 * Source: https://wknd.site/us/en/about-us.html (person teaser cards).
 * The instances[] selectors (.xf-master-building-block / .buildingblock.responsivegrid /
 * [class*=cmp-experiencefragment]) also match the header/footer experience fragments and the
 * footer's social-button building block. This parser resolves to the person-card root
 * (.cmp-experiencefragment--{name}) and bails gracefully on header/footer or any element that
 * is not a real person card (no name + no photo).
 * Structure: 2-column cards. Row 1 = block name. Each following row = one card:
 *   cell 1 = image, cell 2 = text (name heading + role + social links).
 * Generated: 2026-09-01
 */
function bail(element) {
  element.replaceWith(...element.childNodes);
}

export default function parse(element, { document }) {
  // Resolve to the person-card root regardless of which instance selector matched.
  let root = element.closest('[class*="cmp-experiencefragment--"]')
    || (element.matches('[class*="cmp-experiencefragment--"]') ? element : element);

  // Reject non-person experience fragments (header, footer) and anything that is not a card.
  const cls = root.className || '';
  if (/cmp-experiencefragment--(header|footer)/.test(cls)) { bail(element); return; }

  const img = root.querySelector('.cmp-image__image, img');
  const titles = Array.from(root.querySelectorAll('.cmp-title__text'));
  const nameEl = titles[0] || null;
  const roleEl = titles[1] || null;

  // A genuine person card must have a name heading and a photo.
  if (!nameEl || !img) { bail(element); return; }

  const socialLinks = Array.from(root.querySelectorAll('.cmp-buildingblock--btn-list a.cmp-button, .buildingblock a.cmp-button'));

  const textCell = [];
  const h = document.createElement('h3');
  h.textContent = nameEl.textContent.trim();
  textCell.push(h);
  if (roleEl) {
    const p = document.createElement('p');
    p.textContent = roleEl.textContent.trim();
    textCell.push(p);
  }
  socialLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    const label = (link.querySelector('.cmp-button__text') || link).textContent.trim()
      || link.getAttribute('aria-label') || href;
    a.textContent = label;
    textCell.push(a);
  });

  const cells = [[img, textCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-team', cells });
  root.replaceWith(block);
}
