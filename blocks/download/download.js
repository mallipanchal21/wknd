/*
 * Download block — a "Download PDF" card used in the magazine article sidebar.
 * Matches wknd.site: a title, an intro line ("Get the Full Story"), a small
 * file-metadata list (filename / size / format), and a dark download button.
 *
 * Authored structure (one cell per row):
 *   row 1: title            e.g. "Download PDF"
 *   row 2: intro            e.g. "Get the Full Story"
 *   row 3: a link           the download link (its text becomes the button label)
 *   row 4: filename         e.g. "ultimateguidetolaskateparks.pdf"
 *   row 5: size             e.g. "139 KB"
 *   row 6: format           e.g. "application/pdf"
 * Rows 4-6 are optional; the button always renders from row 3.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cellText = (row) => (row ? row.textContent.trim() : '');

  const title = cellText(rows[0]);
  const intro = cellText(rows[1]);
  const linkRow = rows[2];
  const link = linkRow ? linkRow.querySelector('a') : null;
  const meta = rows.slice(3).map(cellText).filter(Boolean);

  const card = document.createElement('div');
  card.className = 'download-card';

  if (title) {
    const h = document.createElement('h3');
    h.className = 'download-title';
    h.textContent = title;
    card.append(h);
  }
  if (intro) {
    const p = document.createElement('p');
    p.className = 'download-intro';
    p.textContent = intro;
    card.append(p);
  }
  if (meta.length) {
    const dl = document.createElement('dl');
    dl.className = 'download-meta';
    const labels = ['Filename', 'Size', 'Format'];
    meta.forEach((value, i) => {
      const dt = document.createElement('dt');
      dt.textContent = labels[i] || '';
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.append(dt, dd);
    });
    card.append(dl);
  }
  if (link) {
    link.className = 'download-button';
    if (!link.textContent.trim()) link.textContent = title || 'Download';
    link.setAttribute('download', '');
    card.append(link);
  }

  block.replaceChildren(card);
}
