import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

/**
 * cards-filter
 * A cards grid (image + title + description) with a row of category filter tabs
 * (All + one tab per distinct category) that filter the visible cards.
 *
 * Authoring model (one card per row):
 *   cell 1: card image (linked)
 *   cell 2: title (linked heading) + short description
 *   cell 3 (optional): category label — used to build/filter tabs, not displayed
 *
 * Authors omit and add cells, so decorate defensively.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  const categories = new Set();

  [...block.children].forEach((row) => {
    const li = document.createElement('li');

    // The last cell, if it has no image/heading and holds a short label, is the category.
    const cells = [...row.children];
    let category = '';
    if (cells.length > 2) {
      const last = cells[cells.length - 1];
      if (last && !last.querySelector('picture, img, h1, h2, h3, h4, h5, h6')) {
        category = last.textContent.trim();
        last.remove();
      }
    }

    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-filter-card-image';
      else div.className = 'cards-filter-card-body';
    });

    if (category) {
      li.dataset.category = toClassName(category);
      categories.add(category);
    }
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';

  // Build filter tabs only when categories exist.
  if (categories.size > 0) {
    const tablist = document.createElement('div');
    tablist.className = 'cards-filter-tabs';
    tablist.setAttribute('role', 'tablist');

    const makeTab = (label, value, selected) => {
      const btn = document.createElement('button');
      btn.className = 'cards-filter-tab';
      btn.type = 'button';
      btn.textContent = label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.dataset.filter = value;
      btn.addEventListener('click', () => {
        tablist.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', 'false'));
        btn.setAttribute('aria-selected', 'true');
        ul.querySelectorAll(':scope > li').forEach((li) => {
          const show = value === '*' || li.dataset.category === value;
          li.hidden = !show;
        });
      });
      return btn;
    };

    tablist.append(makeTab('All', '*', true));
    [...categories].forEach((c) => tablist.append(makeTab(c, toClassName(c), false)));
    block.append(tablist);
  }

  block.append(ul);
}
