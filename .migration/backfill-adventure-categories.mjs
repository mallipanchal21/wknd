// Backfill a `category` metadata field on every adventure page across all
// locales, so the dynamic-cards-filter can build filter tabs once the query
// index exposes the `category` column. Categories use localized labels
// matching the pattern already authored in us/en (English) and ch/de (German).
//
// Writes are UNCONDITIONAL (replace-or-insert) and trust the POST 200 response,
// because the DA source API has read-after-write lag that makes pre-read
// detection unreliable. Re-running is safe (idempotent end state).
//
// Usage: node backfill-adventure-categories.mjs           (dry run)
//        node backfill-adventure-categories.mjs --apply    (POST to DA)

const ORG = 'mallipanchal21';
const REPO = 'wknd';
const APPLY = process.argv.includes('--apply');

const LOCALE_LANG = {
  'us/en': 'en',
  'us/es': 'es',
  'ca/en': 'en',
  'ca/fr': 'fr',
  'ch/de': 'de',
  'ch/fr': 'fr',
  'ch/it': 'it',
  'de/de': 'de',
  'fr/fr': 'fr',
  'es/es': 'es',
  'it/it': 'it',
};

const SLUG_CATEGORY = {
  'bali-surf-camp': 'surfing',
  'beervana-portland': 'travel',
  'climbing-new-zealand': 'climbing',
  'colorado-rock-climbing': 'climbing',
  'cycling-southern-utah': 'cycling',
  'cycling-tuscany': 'cycling',
  'downhill-skiing-wyoming': 'skiing',
  'gastronomic-marais-tour': 'travel',
  'napa-wine-tasting': 'travel',
  'riverside-camping-australia': 'travel',
  'ski-touring-mont-blanc': 'skiing',
  'surf-camp-costa-rica': 'surfing',
  'tahoe-skiing': 'skiing',
  'west-coast-cycling': 'cycling',
  'whistler-mountain-biking': 'cycling',
  'yosemite-backpacking': 'travel',
};

const CATEGORY_LABELS = {
  surfing: { en: 'Surfing', es: 'Surf', fr: 'Surf', de: 'Surfen', it: 'Surf' },
  travel: { en: 'Travel', es: 'Viajes', fr: 'Voyage', de: 'Reisen', it: 'Viaggi' },
  climbing: { en: 'Climbing', es: 'Escalada', fr: 'Escalade', de: 'Klettern', it: 'Arrampicata' },
  cycling: { en: 'Cycling', es: 'Ciclismo', fr: 'Cyclisme', de: 'Radfahren', it: 'Ciclismo' },
  skiing: { en: 'Skiing', es: 'Esquí', fr: 'Ski', de: 'Skifahren', it: 'Sci' },
};

const SLUGS = Object.keys(SLUG_CATEGORY);
const LOCALES = Object.keys(LOCALE_LANG);

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

// Force the metadata block to carry exactly one `category` row with `label`.
// Matches the existing no-<p> row format. Removes any prior category row first.
function setCategory(html, label) {
  const start = html.indexOf('<div class="metadata">');
  if (start < 0) return { html, ok: false, reason: 'no metadata block' };
  const range = matchDiv(html, start);
  if (!range) return { html, ok: false, reason: 'unbalanced metadata block' };

  let block = html.slice(range.start, range.end);
  // strip any existing category row (with or without <p> wrappers)
  block = block.replace(/<div><div>(?:<p>)?category(?:<\/p>)?<\/div><div>(?:<p>)?[^<]*(?:<\/p>)?<\/div><\/div>/i, '');

  // insert a fresh row (no <p>, matching nav/footer/Title/Description rows)
  const row = `<div><div>category</div><div>${label}</div></div>`;
  const insertAt = block.length - '</div>'.length; // before metadata block's closing </div>
  block = block.slice(0, insertAt) + row + block.slice(insertAt);

  return { html: html.slice(0, range.start) + block + html.slice(range.end), ok: true, reason: 'set' };
}

async function processPage(locale, slug) {
  const lang = LOCALE_LANG[locale];
  const label = CATEGORY_LABELS[SLUG_CATEGORY[slug]][lang];
  const path = `${locale}/adventures/${slug}`;
  const url = `https://admin.da.live/source/${ORG}/${REPO}/${path}.html`;

  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    console.log(`${path}: FETCH FAILED (${resp.status})`);
    return false;
  }
  const html = await resp.text();
  const { html: out, ok, reason } = setCategory(html, label);
  if (!ok) {
    console.log(`${path}: SKIP (${reason})`);
    return false;
  }

  if (!APPLY) {
    console.log(`${path}: DRY RUN -> category="${label}"`);
    return false;
  }

  const body = new FormData();
  body.append('data', new Blob([out], { type: 'text/html' }), `${slug}.html`);
  const put = await fetch(url, { method: 'POST', body });
  console.log(`${path}: category="${label}" POST ${put.status} ${put.ok ? 'OK' : 'FAILED'}`);
  return put.ok;
}

let ok = 0;
let total = 0;
for (const locale of LOCALES) {
  for (const slug of SLUGS) {
    total += 1;
    // eslint-disable-next-line no-await-in-loop
    const done = await processPage(locale, slug);
    if (done) ok += 1;
  }
}
console.log(`\n${APPLY ? 'Applied' : 'Dry run'}: ${ok}/${total} pages ${APPLY ? 'updated' : '(no writes)'}`);
