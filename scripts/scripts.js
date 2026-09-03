import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Wraps an authored breadcrumb trail (a leading <ol> whose first link points to
 * a section index, e.g. Adventures > Bali Surf Camp) in a styled breadcrumbs
 * block. On adventure/magazine detail pages with no authored breadcrumb, one is
 * synthesised from the URL path. Matches wknd.site detail-page breadcrumbs.
 * @param {Element} main The container element
 */
function buildBreadcrumbsAutoBlock(main) {
  // Only decorate the real page <main>. Header/footer fragments are decorated
  // via their own detached <main> (see fragment.js → decorateMain); synthesising
  // a breadcrumb there injects a stray trail over the logo / into the footer.
  if (main !== document.querySelector('main')) return;
  if (main.querySelector('.breadcrumbs')) return;

  const firstDiv = main.querySelector(':scope > div');

  // 1) authored breadcrumb: an <ol> near the top of the page whose first item
  //    links to a section index (e.g. Magazine > Arctic Surfing). It may not be
  //    the literal first child (article pages precede it with a hero image), so
  //    scan the first couple of sections.
  let authoredOl = null;
  const candidateSections = [...main.querySelectorAll(':scope > div')].slice(0, 2);
  candidateSections.some((sec) => {
    const ol = [...sec.querySelectorAll('ol')].find((o) => {
      const firstLink = o.querySelector('li:first-child a[href]');
      return firstLink && /\/(adventures|magazine)(\.html|\/|$)/.test(firstLink.getAttribute('href'));
    });
    if (ol) { authoredOl = ol; return true; }
    return false;
  });
  if (authoredOl) {
    const block = buildBlock('breadcrumbs', { elems: [authoredOl] });
    (firstDiv || main).prepend(block);
    return;
  }

  // 2) fallback: synthesise from the URL path on known sections — only for
  //    detail pages (e.g. /adventures/bali-surf-camp → "Adventures > Bali Surf
  //    Camp"). The section landing pages themselves (/adventures, /magazine) do
  //    NOT get a breadcrumb — a single-item trail there is redundant.
  const parts = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '').split('/').filter(Boolean);
  let segments = parts;
  if (segments.length >= 2 && /^[a-z]{2}$/.test(segments[0]) && /^[a-z]{2}$/.test(segments[1])) {
    segments = segments.slice(2);
  }
  const sections = ['adventures', 'magazine'];
  if (segments.length < 2 || !sections.includes(segments[0])) return;
  const section = firstDiv || main;
  const block = buildBlock('breadcrumbs', { elems: [] });
  section.prepend(block);
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildBreadcrumbsAutoBlock(main);
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    const strong = a.closest('strong');
    const em = a.closest('em');

    // authored formatting → button variant
    if (strong || em) {
      p.className = 'button-wrapper';
      a.className = 'button';
      if (strong && em) { // high-impact call-to-action
        a.classList.add('accent');
        const outer = strong.contains(em) ? strong : em;
        outer.replaceWith(a);
      } else if (strong) {
        a.classList.add('primary');
        strong.replaceWith(a);
      } else {
        a.classList.add('secondary');
        em.replaceWith(a);
      }
      return;
    }

    // WKND convention: a standalone link that is the sole content of its
    // paragraph is a primary call-to-action button (e.g. "All Articles",
    // "See Trip", "All Trips"). The p.textContent === text check above already
    // guarantees the link is the paragraph's only content.
    p.className = 'button-wrapper';
    a.className = 'button primary';
  });
}

/**
 * On magazine article-detail pages, wrap the article body sections and the
 * related-stories section into a two-column grid (body on the left, the "Share
 * this Story" / related-stories sidebar on the right), matching wknd.site. The
 * hero image + breadcrumb section stays full-width above the grid. Runs only on
 * `/{locale}/magazine/<slug>` pages (never the /magazine listing) and only when
 * a related-stories block is present, so it is a no-op everywhere else.
 * @param {Element} main The (decorated) main element
 */
function decorateMagazineArticle(main) {
  if (main !== document.querySelector('main')) return;
  const parts = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '').split('/').filter(Boolean);
  let segments = parts;
  if (segments.length >= 2 && /^[a-z]{2}$/.test(segments[0]) && /^[a-z]{2}$/.test(segments[1])) {
    segments = segments.slice(2);
  }
  // article detail = magazine/<slug> (2+ segments); the listing (just "magazine") is excluded
  if (segments[0] !== 'magazine' || segments.length < 2) return;

  const sections = [...main.children].filter((el) => el.classList.contains('section'));
  const related = sections.find((s) => s.classList.contains('related-stories-container'));
  if (!related) return;

  // the author byline: a default-content section carrying the three social links
  // (Facebook/Twitter/Instagram — consistent across every locale). Pull it out
  // full-width below the two-column grid, matching wknd.site.
  const byline = sections.find((s) => decorateByline(s));

  const relIndex = sections.indexOf(related);
  const bcIndex = sections.findIndex((s) => s.classList.contains('breadcrumbs-container'));
  // a download ("Download PDF") section belongs in the sidebar, above related
  const download = sections.find((s) => s.classList.contains('download-container'));
  // body = sections after the breadcrumb/hero and before the related sidebar,
  // excluding any section that belongs in the aside (download card) or the
  // full-width byline row
  const bodySections = sections.filter(
    (s, i) => i > bcIndex && i < relIndex && s.children.length > 0
      && s !== download && s !== byline,
  );
  if (bodySections.length === 0) return;

  const layout = document.createElement('div');
  layout.className = 'article-layout';
  const bodyCol = document.createElement('div');
  bodyCol.className = 'article-body';
  const aside = document.createElement('div');
  aside.className = 'article-aside';

  bodySections[0].before(layout);
  bodySections.forEach((s) => bodyCol.append(s));
  if (download) aside.append(download);
  aside.append(related);
  layout.append(bodyCol, aside);
  // byline goes full-width, directly beneath the grid
  if (byline) layout.after(byline);
}

/**
 * Restructure the author byline default-content section (avatar + name +
 * occupations + Facebook/Twitter/Instagram links) into the wknd.site layout:
 * a round avatar and text on the left, a dark box of social icons on the right.
 * Detected locale-independently by the three social links. Returns true when the
 * section is a byline (and was decorated), false otherwise — safe to call on any
 * section.
 * @param {Element} section A page section element
 * @returns {boolean} whether the section is the author byline
 */
function decorateByline(section) {
  if (!section || section.classList.contains('byline')) {
    return section && section.classList.contains('byline');
  }
  const wrapper = section.querySelector(':scope > .default-content-wrapper');
  if (!wrapper) return false;
  const links = [...wrapper.querySelectorAll('a')];
  const socials = ['facebook', 'twitter', 'instagram'];
  const found = socials.filter((name) => links
    .some((a) => a.textContent.trim().toLowerCase() === name));
  if (found.length < 3) return false;

  const img = wrapper.querySelector('picture, img');
  const name = wrapper.querySelector('h2, h3, h4');
  // occupations = first non-empty paragraph that isn't just a social link
  const occ = [...wrapper.querySelectorAll('p')].find(
    (p) => p.textContent.trim() && !p.querySelector('a'),
  );

  const person = document.createElement('div');
  person.className = 'byline-person';
  const avatar = img ? (img.closest('p') || img) : null;
  if (avatar) {
    avatar.classList.add('byline-avatar');
    person.append(avatar);
  }
  const text = document.createElement('div');
  text.className = 'byline-text';
  if (name) text.append(name);
  if (occ) {
    occ.classList.add('byline-occupations');
    text.append(occ);
  }
  person.append(text);

  const social = document.createElement('div');
  social.className = 'byline-social';
  links.forEach((a) => {
    const label = a.textContent.trim().toLowerCase();
    if (socials.includes(label)) {
      a.className = `byline-social-link byline-${label}`;
      a.setAttribute('aria-label', a.textContent.trim());
      a.textContent = '';
      social.append(a);
      const host = a.closest('p');
      if (host && !host.textContent.trim() && host.children.length === 0) host.remove();
    }
  });

  wrapper.textContent = '';
  wrapper.append(person, social);
  section.classList.add('byline');
  return true;
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateMagazineArticle(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
/**
 * Derives the document language from the URL locale segment so each localized
 * page reports its real language (e.g. /ch/de/... → "de", /fr/fr/... → "fr").
 * The site uses a /{country}/{lang}/... path pattern; the language is the
 * second segment. Falls back to "en".
 * @returns {string} a BCP-47 language subtag
 */
function getDocumentLang() {
  const seg = window.location.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && /^[a-z]{2}$/.test(seg[0]) && /^[a-z]{2}$/.test(seg[1])) {
    return seg[1];
  }
  return 'en';
}

async function loadEager(doc) {
  document.documentElement.lang = getDocumentLang();
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
