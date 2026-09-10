// Backfill a `category` metadata field on every adventure page across all
// locales, so the dynamic-cards-filter can build filter tabs once the query
// index exposes the `category` column. Categories use localized labels
// matching the pattern already authored in us/en (English) and ch/de (German).
// Usage: node backfill-adventure-categories.mjs           (dry run)
//        node backfill-adventure-categories.mjs --apply    (POST to DA)

const ORG = 'mallipanchal21';
const REPO = 'wknd';
const APPLY = process.argv.includes('--apply');

// locale -> language
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

// canonical category per adventure slug (stable English key)
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

// localized display label per category key per language
const CATEGORY_LABELS = {
  surfing: { en: 'Surfing', es: 'Surf', fr: 'Surf', de: 'Surfen', it: 'Surf' },
  travel: { en: 'Travel', es: 'Viajes', fr: 'Voyage', de: 'Reisen', it: 'Viaggi' },
  climbing: { en: 'Climbing', es: 'Escalada', fr: 'Escalade', de: 'Klettern', it: 'Arrampicata' },
  cycling: { en: 'Cycling', es: 'Ciclismo', fr: 'Cyclisme', de: 'Radfahren', it: 'Ciclismo' },
  skiing: { en: 'Skiing', es: 'Esquí', fr: 'Ski', de: 'Skifahren', it: 'Sci' },
};

const SLUGS = Object.keys(SLUG_CATEGORY);
const LOCALES = Object.keys(LOCALE_LANG);

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

// Insert or update the `category` row inside the page's metadata block.
function setCategory(html, label) {
  const start = html.indexOf('<div class="metadata">');
  if (start < 0) return { html, changed: false, reason: 'no metadata block' };
  const range = matchDiv(html, start);
  if (!range) return { html, changed: false, reason: 'unbalanced metadata block' };

  const block = html.slice(range.start, range.end);
  const row = `<div><div><p>category</p></div><div><p>${label}</p></div></div>`;

  // update in place if a category row already exists
  if (/<p>category<\/p>/i.test(block)) {
    const updated = block.replace(/(<p>category<\/p><\/div><div><p>)[^<]*(<\/p>)/i, `$1${label}$2`);
    if (updated === block) return { html, changed: false, reason: 'category row present but not updatable' };
    return { html: html.slice(0, range.start) + updated + html.slice(range.end), changed: true, reason: 'updated' };
  }

  // otherwise insert before the metadata block's closing </div>
  const insertAt = range.end - '</div>'.length;
  return { html: html.slice(0, insertAt) + row + html.slice(insertAt), changed: true, reason: 'inserted' };
}

async function processPage(locale, slug) {
  const lang = LOCALE_LANG[locale];
  const catKey = SLUG_CATEGORY[slug];
  const label = CATEGORY_LABELS[catKey][lang];
  const path = `${locale}/adventures/${slug}`;
  const url = `https://admin.da.live/source/${ORG}/${REPO}/${path}.html`;

  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`${path}: FETCH FAILED (${resp.status})`);
    return false;
  }
  const html = await resp.text();
  const { html: out, changed, reason } = setCategory(html, label);
  if (!changed) {
    console.log(`${path}: SKIP (${reason})`);
    return false;
  }

  if (!APPLY) {
    console.log(`${path}: DRY RUN -> category="${label}" (${reason})`);
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
