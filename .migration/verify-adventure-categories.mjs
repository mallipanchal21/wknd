const ORG = 'mallipanchal21';
const REPO = 'wknd';
const LOCALES = ['us/en', 'us/es', 'ca/en', 'ca/fr', 'ch/de', 'ch/fr', 'ch/it', 'de/de', 'fr/fr', 'es/es', 'it/it'];
const SLUGS = ['bali-surf-camp', 'beervana-portland', 'climbing-new-zealand', 'colorado-rock-climbing', 'cycling-southern-utah', 'cycling-tuscany', 'downhill-skiing-wyoming', 'gastronomic-marais-tour', 'napa-wine-tasting', 'riverside-camping-australia', 'ski-touring-mont-blanc', 'surf-camp-costa-rica', 'tahoe-skiing', 'west-coast-cycling', 'whistler-mountain-biking', 'yosemite-backpacking'];

function getCategory(html) {
  // match the metadata "category" row with or without <p> wrappers
  const m = html.match(/category\s*<\/p>?\s*<\/div>\s*<div>\s*<p>?([^<]*)/i)
    || html.match(/>category<\/div><div>([^<]*)/i);
  return m ? m[1].trim() : '';
}

const missing = [];
let total = 0;
for (const locale of LOCALES) {
  for (const slug of SLUGS) {
    total += 1;
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(`https://admin.da.live/source/${ORG}/${REPO}/${locale}/adventures/${slug}.html`, { cache: 'no-store' });
    // eslint-disable-next-line no-await-in-loop
    const html = await resp.text();
    const cat = getCategory(html);
    if (!cat) missing.push(`${locale}/${slug}`);
  }
}
console.log(`checked=${total} missing=${missing.length}`);
missing.forEach((p) => console.log('MISSING:', p));
