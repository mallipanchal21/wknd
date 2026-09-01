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

  // 2) fallback: synthesise from the URL path on known sections — both the
  //    section landing page (e.g. /adventures → "Adventures") and its detail
  //    pages (e.g. /adventures/bali-surf-camp → "Adventures > Bali Surf Camp").
  const parts = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '').split('/').filter(Boolean);
  let segments = parts;
  if (segments.length >= 2 && /^[a-z]{2}$/.test(segments[0]) && /^[a-z]{2}$/.test(segments[1])) {
    segments = segments.slice(2);
  }
  const sections = ['adventures', 'magazine'];
  if (segments.length < 1 || !sections.includes(segments[0])) return;
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
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
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
