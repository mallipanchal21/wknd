// Replace the static `cards-filter` block on each locale adventures landing
// page with a `dynamic-cards-filter` block that lists all adventure children
// from query-index.json.
// Usage: node swap-adventures-cards-filter.mjs           (dry run)
//        node swap-adventures-cards-filter.mjs --apply    (POST to DA)

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

// Locate every top-level `<div class="cards-filter">` block.
function findBlocks(html) {
  const re = /<div\s+class="cards-filter"\s*>/g;
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

function dynamicMarkup() {
  return '<div class="dynamic-cards-filter"><div><div>adventures</div></div></div>';
}

async function processPage(locale) {
  const path = `${locale}/adventures`;
  const url = `https://admin.da.live/source/${ORG}/${REPO}/${path}.html`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`${path}: FETCH FAILED (${resp.status})`);
    return;
  }
  const html = await resp.text();
  const blocks = findBlocks(html);
  if (blocks.length !== 1) {
    console.log(`${path}: expected 1 cards-filter block, found ${blocks.length} — SKIPPING`);
    return;
  }

  const block = html.slice(blocks[0].start, blocks[0].end);
  const isAdv = block.includes('/adventures/');
  console.log(`${path}: cards-filter -> adventures (${isAdv ? 'ok' : 'MISMATCH'})`);
  if (!isAdv) {
    console.log(`  ${path}: content check failed — SKIPPING to be safe`);
    return;
  }

  const out = html.slice(0, blocks[0].start) + dynamicMarkup() + html.slice(blocks[0].end);

  if (!APPLY) {
    console.log(`  ${path}: DRY RUN — would replace cards-filter (${out.length - html.length} byte delta)`);
    return;
  }

  const body = new FormData();
  body.append('data', new Blob([out], { type: 'text/html' }), 'adventures.html');
  const put = await fetch(url, { method: 'POST', body });
  console.log(`  ${path}: POST ${put.status} ${put.ok ? 'OK' : 'FAILED'}`);
}

for (const locale of LOCALES) {
  // eslint-disable-next-line no-await-in-loop
  await processPage(locale);
}
