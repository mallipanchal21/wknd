/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 *
 * Removes non-authorable AEM Sites (Core Components) chrome so the import only
 * contains page-level authorable content. Every selector below was verified
 * against migration-work/cleaned.html (the faqs page capture).
 *
 * IMPORTANT: The header and footer are AEM experience fragments
 * (`.cmp-experiencefragment--header` / `--footer`). Do NOT remove
 * `[class*=cmp-experiencefragment]` broadly — the article-page (author bio)
 * and content-listing (team cards) templates use experience fragments as
 * AUTHORABLE blocks. Only the header/footer XF variants are targeted here.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Global chrome removed before block parsing so it never interferes with
    // block matching (nth-of-type counting, sidebar/aside detection, etc.).
    WebImporter.DOMUtils.remove(element, [
      // Header experience fragment: logo, main nav, language nav, sign-in, search.
      // cleaned.html lines 5-161.
      'header.cmp-experiencefragment--header',
      'header .cmp-experiencefragment--header',
      // Footer experience fragment: logo, footer nav, social buttons, copyright.
      // cleaned.html lines 357-448.
      'footer.cmp-experiencefragment--footer',
      'footer .cmp-experiencefragment--footer',
      // Mobile nav toggle + off-canvas mobile navigation. cleaned.html 454-482.
      '#toggleNav',
      '#mobileNav',
      '.cmp-navigation--mobile',
      // Adobe ID syncing / demdex tracking iframe. cleaned.html line 452.
      '#destination_publishing_iframe_wkndsite_0',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Any remaining bare header/footer landmarks and non-authorable leftovers.
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      // Search widget shell. cleaned.html lines 134-153.
      '.cmp-search',
      // Language navigation. cleaned.html lines 21-97.
      '.cmp-languagenavigation',
      // Sign-in bar. cleaned.html lines 14-20.
      '.sign-in-buttons',
      '.wknd-sign-in-buttons',
      // Safe non-authorable elements.
      'iframe',
      'noscript',
      // Empty <meta> injected inside image markup. cleaned.html line 176.
      'meta',
    ]);

    // Strip AEM data-layer / accessibility tracking attributes site-wide.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-cmp-data-layer');
      el.removeAttribute('data-cmp-data-layer-enabled');
      el.removeAttribute('data-cmp-data-layer-name');
      el.removeAttribute('data-cmp-hook-image');
      el.removeAttribute('data-cmp-link-accessibility-enabled');
      el.removeAttribute('data-cmp-link-accessibility-text');
    });
  }
}
