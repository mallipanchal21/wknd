/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://wknd.site/us/en.html (homepage hero carousel) and
 *         https://wknd.site/us/en/adventures/bali-surf-camp.html (adventure detail carousel).
 * Structure: 2-column carousel. Row 1 = block name. Each following row = one slide:
 *   cell 1 = image (mandatory), cell 2 = optional text (title heading + description + CTA).
 * Handles two source shapes:
 *   - homepage slides wrap a .cmp-teaser (image + title + description + CTA)
 *   - adventure-detail slides are image-only
 * Generated: 2026-09-01
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll('.cmp-carousel__item');
  const slides = items.length
    ? Array.from(items)
    : [element];

  const cells = [];
  slides.forEach((slide) => {
    const img = slide.querySelector('img');

    // Text content (optional) from a teaser if present
    const textCell = [];
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3');
    const description = slide.querySelector('.cmp-teaser__description, p');
    const cta = slide.querySelector('.cmp-teaser__action-link, a.cmp-teaser__action-link');

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

    if (!img && textCell.length === 0) return;
    cells.push([img || '', textCell.length ? textCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
