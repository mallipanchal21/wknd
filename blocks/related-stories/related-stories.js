export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'related-stories-list';

  [...block.children].forEach((row) => {
    // Each row wraps a single cell that holds the title link and the date.
    const cell = row.firstElementChild || row;
    const anchor = cell.querySelector('a');
    if (!anchor) return;

    const li = document.createElement('li');
    li.className = 'related-stories-item';

    // Title span (from the anchor text).
    const title = document.createElement('span');
    title.className = 'related-stories-title';
    title.textContent = anchor.textContent.trim();

    // Date: the paragraph/text in the cell that is not the title link.
    let dateText = '';
    [...cell.children].forEach((child) => {
      if (!child.querySelector('a') && child.textContent.trim()) {
        dateText = child.textContent.trim();
      }
    });

    anchor.textContent = '';
    anchor.className = 'related-stories-link';
    anchor.append(title);

    if (dateText) {
      const date = document.createElement('span');
      date.className = 'related-stories-date';
      date.textContent = dateText;
      anchor.append(date);
    }

    li.append(anchor);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
