// Replace the two static `cards` blocks on each locale homepage with
// `dynamic-cards` blocks (magazine + adventures) in Document Authoring.
// Usage: node swap-dynamic-cards.mjs           (dry run: verify + preview)
//        node swap-dynamic-cards.mjs --apply    (POST changes to DA)

const ORG = 'mallipanchal21';
const REPO = 'wknd';
const HOMES = [
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

function dynamicCardsMarkup(folder) {
  return `<div class="dynamic-cards"><div><div>${folder}</div></div></div>`;
}

async function processHome(path) {
  const url = `https://admin.da.live/source/${ORG}/${REPO}/${path}.html`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`${path}: FETCH FAILED (${resp.status})`);
    return;
  }
  const html = await resp.text();
  const blocks = findCardsBlocks(html);
  if (blocks.length !== 2) {
    console.log(`${path}: expected 2 cards blocks, found ${blocks.length} — SKIPPING`);
    return;
  }

  // verify order: first block should reference /magazine/, second /adventures/
  const first = html.slice(blocks[0].start, blocks[0].end);
  const second = html.slice(blocks[1].start, blocks[1].end);
  const firstIsMag = first.includes('/magazine/');
  const secondIsAdv = second.includes('/adventures/');
  const mapping = [
    { folder: 'magazine', ok: firstIsMag },
    { folder: 'adventures', ok: secondIsAdv },
  ];
  console.log(`${path}: cards#1 -> magazine (${firstIsMag ? 'ok' : 'MISMATCH'}), cards#2 -> adventures (${secondIsAdv ? 'ok' : 'MISMATCH'})`);
  if (!firstIsMag || !secondIsAdv) {
    console.log(`  ${path}: order check failed — SKIPPING to be safe`);
    return;
  }

  // rebuild the doc, replacing from last block first so offsets stay valid
  let out = html;
  out = out.slice(0, blocks[1].start) + dynamicCardsMarkup(mapping[1].folder) + out.slice(blocks[1].end);
  out = out.slice(0, blocks[0].start) + dynamicCardsMarkup(mapping[0].folder) + out.slice(blocks[0].end);

  if (!APPLY) {
    console.log(`  ${path}: DRY RUN — would replace both cards blocks (${out.length - html.length} byte delta)`);
    return;
  }

  const body = new FormData();
  body.append('data', new Blob([out], { type: 'text/html' }), `${path.split('/').pop()}.html`);
  const put = await fetch(url, { method: 'POST', body });
  console.log(`  ${path}: POST ${put.status} ${put.ok ? 'OK' : 'FAILED'}`);
}

for (const path of HOMES) {
  // eslint-disable-next-line no-await-in-loop
  await processHome(path);
}
