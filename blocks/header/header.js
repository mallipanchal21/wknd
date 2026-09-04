import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Determine the locale prefix ("/us/en") from the current path, matching the
 * /{country}/{lang}/... URL pattern. Returns '' at the site root so the search
 * falls back to the top-level /query-index.json.
 * @returns {string} the locale prefix, e.g. "/us/en", or ''
 */
function getLocalePrefix() {
  const seg = window.location.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && /^[a-z]{2}$/.test(seg[0]) && /^[a-z]{2}$/.test(seg[1])) {
    return `/${seg[0]}/${seg[1]}`;
  }
  return '';
}

// per-language UI strings for the search field (fallback: English)
const SEARCH_I18N = {
  en: { placeholder: 'Search', empty: 'No results found' },
  es: { placeholder: 'Buscar', empty: 'No se encontraron resultados' },
  fr: { placeholder: 'Rechercher', empty: 'Aucun résultat' },
  de: { placeholder: 'Suchen', empty: 'Keine Ergebnisse gefunden' },
  it: { placeholder: 'Cerca', empty: 'Nessun risultato' },
};

/**
 * Turn the nav's `:search:` placeholder box into a working search field that
 * queries the current locale's query-index.json and shows matching pages in a
 * dropdown. The index is fetched lazily (on first focus) and cached.
 * @param {Element} navTools The .nav-tools section
 */
function decorateSearch(navTools) {
  const box = navTools.querySelector('.default-content-wrapper > p') || navTools;
  const icon = box.querySelector('.icon-search');
  const prefix = getLocalePrefix();
  const lang = (prefix.split('/')[2] || 'en').toLowerCase();
  const t = SEARCH_I18N[lang] || SEARCH_I18N.en;

  // build the field: keep the search icon, add an input and a results panel
  box.textContent = '';
  if (icon) box.append(icon);

  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.action = '';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'nav-search-input';
  input.placeholder = t.placeholder;
  input.setAttribute('aria-label', t.placeholder);
  input.autocomplete = 'off';

  const results = document.createElement('ul');
  results.className = 'nav-search-results';
  results.hidden = true;

  form.append(input, results);
  box.append(form);

  let index = null;
  let loading = null;

  async function loadIndex() {
    if (index) return index;
    if (!loading) {
      const url = `${prefix}/query-index.json`;
      loading = fetch(url)
        .then((resp) => (resp.ok ? resp.json() : { data: [] }))
        .then((json) => { index = json.data || []; return index; })
        .catch(() => { index = []; return index; });
    }
    return loading;
  }

  function render(matches) {
    results.textContent = '';
    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'nav-search-empty';
      li.textContent = t.empty;
      results.append(li);
      results.hidden = false;
      return;
    }
    matches.slice(0, 8).forEach((row) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = row.path;
      const title = document.createElement('span');
      title.className = 'nav-search-result-title';
      title.textContent = row.title || row.path;
      a.append(title);
      if (row.description) {
        const desc = document.createElement('span');
        desc.className = 'nav-search-result-desc';
        desc.textContent = row.description;
        a.append(desc);
      }
      li.append(a);
      results.append(li);
    });
    results.hidden = false;
  }

  async function search() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.textContent = ''; return; }
    const data = await loadIndex();
    const matches = data.filter((row) => {
      const hay = `${row.title || ''} ${row.description || ''} ${row.path || ''}`.toLowerCase();
      return hay.includes(q);
    });
    render(matches);
  }

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(search, 150);
  });
  input.addEventListener('focus', loadIndex);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = results.querySelector('a');
    if (first) window.location.assign(first.href);
  });
  // close the results on outside click or Escape
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target)) { results.hidden = true; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { results.hidden = true; input.blur(); }
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools', 'utility'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  // turn the search placeholder into a working locale-aware search field
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) decorateSearch(navTools);

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    // highlight the nav link matching the current page (WKND yellow active state)
    const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    navSections.querySelectorAll(':scope a').forEach((a) => {
      const linkPath = new URL(a.href, window.location).pathname.replace(/\.html$/, '').replace(/\/$/, '');
      if (linkPath === currentPath) a.setAttribute('aria-current', 'page');
    });
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  // dark top utility bar: Sign In + language toggle revealing the language navigation
  const navUtility = nav.querySelector('.nav-utility');
  if (navUtility) {
    const langList = navUtility.querySelector('ul');
    // determine the current locale from the language list by matching the page path.
    // (a .nav-lang-current marker may be authored, but DA can strip its class, so the
    //  page path is the reliable source of truth.)
    const currentPathTop = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    let currentLabel = '';
    if (langList) {
      const links = [...langList.querySelectorAll('a')];
      // exact locale-home match, e.g. /ch/de for a /ch/de/* page
      const match = links.find((a) => {
        const p = new URL(a.href, window.location).pathname.replace(/\.html$/, '').replace(/\/$/, '');
        return currentPathTop === p || currentPathTop.startsWith(`${p}/`);
      });
      if (match) currentLabel = match.textContent.trim();
    }
    // fallbacks: authored marker, else first list item, else en-US
    const currentEl = navUtility.querySelector('.nav-lang-current');
    if (!currentLabel && currentEl) currentLabel = currentEl.textContent.trim();
    if (!currentLabel && langList && langList.querySelector('a')) {
      currentLabel = langList.querySelector('a').textContent.trim();
    }
    if (!currentLabel) currentLabel = 'en-US';
    if (currentEl) currentEl.remove();

    // build the toggle button that opens the language menu
    const langWrapper = document.createElement('div');
    langWrapper.className = 'nav-lang';
    const langToggle = document.createElement('button');
    langToggle.type = 'button';
    langToggle.className = 'nav-lang-toggle';
    langToggle.setAttribute('aria-expanded', 'false');
    langToggle.setAttribute('aria-label', `Toggle Language ${currentLabel}`);
    langToggle.textContent = currentLabel;
    langWrapper.append(langToggle);

    if (langList) {
      // Re-group the flat locale list by country (matching wknd.site), keyed by
      // the country segment of each href (/us/, /ca/, /ch/, ...). Renders a
      // country heading followed by its language links.
      const COUNTRY_NAMES = {
        us: 'United States',
        ca: 'Canada',
        ch: 'Switzerland',
        de: 'Germany',
        fr: 'France',
        es: 'Spain',
        it: 'Italy',
      };
      const links = [...langList.querySelectorAll('a')];
      const order = [];
      const byCountry = new Map();
      links.forEach((a) => {
        const seg = new URL(a.href, window.location).pathname.replace(/^\//, '').split('/')[0];
        if (!byCountry.has(seg)) { byCountry.set(seg, []); order.push(seg); }
        byCountry.get(seg).push(a);
        if (a.textContent.trim() === currentLabel) a.setAttribute('aria-current', 'true');
      });

      const grouped = document.createElement('ul');
      grouped.className = 'nav-lang-list';
      order.forEach((seg) => {
        const countryItem = document.createElement('li');
        // country-code modifier class drives the flag background in CSS
        countryItem.className = `nav-lang-country nav-lang-country-${seg}`;
        const heading = document.createElement('span');
        heading.className = 'nav-lang-country-title';
        heading.textContent = COUNTRY_NAMES[seg] || seg.toUpperCase();
        const sub = document.createElement('ul');
        byCountry.get(seg).forEach((a) => {
          const li = document.createElement('li');
          li.append(a);
          sub.append(li);
        });
        countryItem.append(heading, sub);
        grouped.append(countryItem);
      });

      langList.replaceWith(grouped);
      langWrapper.append(grouped);
      langToggle.addEventListener('click', () => {
        const open = langToggle.getAttribute('aria-expanded') === 'true';
        langToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
      // close on outside click
      document.addEventListener('click', (e) => {
        if (!langWrapper.contains(e.target)) langToggle.setAttribute('aria-expanded', 'false');
      });
    }

    // rebuild utility bar content: sign-in first (left), language toggle (right)
    navUtility.textContent = '';
    const signIn = document.createElement('p');
    signIn.className = 'nav-signin';
    signIn.innerHTML = '<a href="#sign-in">Sign In</a>';
    navUtility.append(signIn, langWrapper);
    // lift the utility bar out of the nav so it can be a full-width strip above the nav
    nav.removeChild(navUtility);
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  if (navUtility) navWrapper.append(navUtility);
  navWrapper.append(nav);
  block.append(navWrapper);
}
