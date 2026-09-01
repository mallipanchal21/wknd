export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'related-stories-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const [linkCell, dateCell] = cells;
    if (!linkCell) return;

    const li = document.createElement('li');
    li.className = 'related-stories-item';

    // Title / link cell: prefer an existing anchor, otherwise use the text.
    const anchor = linkCell.querySelector('a');
    const title = document.createElement('span');
    title.className = 'related-stories-title';
    if (anchor) {
      title.textContent = anchor.textContent.trim();
      anchor.textContent = '';
      anchor.className = 'related-stories-link';
      anchor.append(title);
      li.append(anchor);
    } else {
      title.textContent = linkCell.textContent.trim();
      li.append(title);
    }

    // Date cell (optional).
    if (dateCell && dateCell.textContent.trim()) {
      const date = document.createElement('span');
      date.className = 'related-stories-date';
      date.textContent = dateCell.textContent.trim();
      const target = li.querySelector('a') || li;
      target.append(date);
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
}
