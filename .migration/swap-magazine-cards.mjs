// Replace the "All Articles" static `cards` block on each locale magazine
// landing page with a `dynamic-cards` block that lists ALL magazine children.
// Usage: node swap-magazine-cards.mjs           (dry run: verify + preview)
//        node swap-magazine-cards.mjs --apply    (POST changes to DA)

const ORG = 'mallipanchal21';
const REPO = 'wknd';
const LOCALES = [
  'us/en', 'us/es', 'ca/en', 'ca/fr', 'ch/de', 'ch/fr', 'ch/it',
  'de/de', 'fr/fr', 'es/es', 'it/it',
];
const APPLY = process.argv.includes('--apply');

// Find the byte range of the balanced <div ...>...</div> that starts at `open`.
function matchDiv(html, open) {
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = open;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return { start: open, end: re.lastIndex };
    } else {
      depth += 1;
    }
  }
  return null;
}

// Locate every top-level `<div class="cards">` block (class exactly "cards").
function findCardsBlocks(html) {
  const re = /<div\s+class="cards"\s*>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) {
    const range = matchDiv(html, m.index);
    if (range) {
      blocks.push(range);
      re.lastIndex = range.end;
    }
  }
  return blocks;
}

// dynamic-cards showing every magazine child (limit "all")
function dynamicCardsMarkup() {
  return '<div class="dynamic-cards"><div><div>magazine</div><div>all</div></div></div>';
}

async function processPage(locale) {
  const path = `${locale}/magazine`;
  const url = `https://admin.da.live/source/${ORG}/${REPO}/${path}.html`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`${path}: FETCH FAILED (${resp.status})`);
    return;
  }
  const html = await resp.text();
  const blocks = findCardsBlocks(html);
  if (blocks.length !== 1) {
    console.log(`${path}: expected 1 cards block, found ${blocks.length} — SKIPPING`);
    return;
  }

  // sanity: the block should reference magazine article links
  const block = html.slice(blocks[0].start, blocks[0].end);
  const isMag = block.includes('/magazine/');
  console.log(`${path}: cards -> magazine (${isMag ? 'ok' : 'MISMATCH'})`);
  if (!isMag) {
    console.log(`  ${path}: content check failed — SKIPPING to be safe`);
    return;
  }

  const out = html.slice(0, blocks[0].start) + dynamicCardsMarkup() + html.slice(blocks[0].end);

  if (!APPLY) {
    console.log(`  ${path}: DRY RUN — would replace All Articles cards (${out.length - html.length} byte delta)`);
    return;
  }

  const body = new FormData();
  body.append('data', new Blob([out], { type: 'text/html' }), 'magazine.html');
  const put = await fetch(url, { method: 'POST', body });
  console.log(`  ${path}: POST ${put.status} ${put.ok ? 'OK' : 'FAILED'}`);
}

for (const locale of LOCALES) {
  // eslint-disable-next-line no-await-in-loop
  await processPage(locale);
}
