/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-adventures-listing.js
  var import_adventures_listing_exports = {};
  __export(import_adventures_listing_exports, {
    default: () => import_adventures_listing_default
  });

  // tools/importer/parsers/hero.js
  function parse(element, { document: document2 }) {
    const img = element.querySelector(".cmp-teaser__image img, img");
    const title = element.querySelector(".cmp-teaser__title, h1, h2, h3");
    const description = element.querySelector(".cmp-teaser__description");
    const cta = element.querySelector(".cmp-teaser__action-link");
    const cells = [];
    if (img) cells.push([img]);
    const contentCell = [];
    if (title) {
      const h = document2.createElement("h2");
      h.textContent = title.textContent.trim();
      contentCell.push(h);
    }
    if (description) {
      const p = document2.createElement("p");
      p.innerHTML = description.innerHTML;
      contentCell.push(p);
    }
    if (cta && cta.getAttribute("href")) {
      const a = document2.createElement("a");
      a.href = cta.getAttribute("href");
      a.textContent = cta.textContent.trim();
      contentCell.push(a);
    }
    if (contentCell.length) cells.push([contentCell]);
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-filter.js
  function parse2(element, { document: document2 }) {
    const labels = Array.from(element.querySelectorAll(".cmp-tabs__tab")).map((t) => t.textContent.trim());
    const panels = Array.from(element.querySelectorAll(".cmp-tabs__tabpanel"));
    const categoryByHref = {};
    panels.forEach((panel, i) => {
      const label = labels[i] || "";
      if (!label || /^all$/i.test(label)) return;
      panel.querySelectorAll(".cmp-image-list__item").forEach((item) => {
        const link = item.querySelector(".cmp-image-list__item-image-link, .cmp-image-list__item-title-link, a");
        const href = link ? link.getAttribute("href") : null;
        if (href && !categoryByHref[href]) categoryByHref[href] = label;
      });
    });
    let sourcePanelIndex = labels.findIndex((l) => /^all$/i.test(l));
    if (sourcePanelIndex < 0) sourcePanelIndex = 0;
    const orderedPanels = [panels[sourcePanelIndex], ...panels.filter((_, i) => i !== sourcePanelIndex)].filter(Boolean);
    const allItems = orderedPanels.reduce(
      (acc, panel) => acc.concat(Array.from(panel.querySelectorAll(".cmp-image-list__item"))),
      []
    );
    const cells = [];
    const seen = /* @__PURE__ */ new Set();
    allItems.forEach((item) => {
      const img = item.querySelector("img");
      const titleLink = item.querySelector(".cmp-image-list__item-title-link");
      const titleText = item.querySelector(".cmp-image-list__item-title");
      const description = item.querySelector(".cmp-image-list__item-description");
      const href = titleLink ? titleLink.getAttribute("href") : item.querySelector("a") ? item.querySelector("a").getAttribute("href") : null;
      if (href && seen.has(href)) return;
      if (href) seen.add(href);
      const textCell = [];
      if (titleText) {
        const h = document2.createElement("h3");
        if (href) {
          const a = document2.createElement("a");
          a.href = href;
          a.textContent = titleText.textContent.trim();
          h.appendChild(a);
        } else {
          h.textContent = titleText.textContent.trim();
        }
        textCell.push(h);
      }
      if (description) {
        const p = document2.createElement("p");
        p.textContent = description.textContent.trim();
        textCell.push(p);
      }
      if (!img && textCell.length === 0) return;
      const category = href && categoryByHref[href] ? categoryByHref[href] : "";
      const categoryCell = document2.createElement("p");
      categoryCell.textContent = category;
      cells.push([img || "", textCell.length ? textCell : "", categoryCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-filter", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/wknd-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        // Header experience fragment: logo, main nav, language nav, sign-in, search.
        // cleaned.html lines 5-161.
        "header.cmp-experiencefragment--header",
        "header .cmp-experiencefragment--header",
        // Footer experience fragment: logo, footer nav, social buttons, copyright.
        // cleaned.html lines 357-448.
        "footer.cmp-experiencefragment--footer",
        "footer .cmp-experiencefragment--footer",
        // Mobile nav toggle + off-canvas mobile navigation. cleaned.html 454-482.
        "#toggleNav",
        "#mobileNav",
        ".cmp-navigation--mobile",
        // Adobe ID syncing / demdex tracking iframe. cleaned.html line 452.
        "#destination_publishing_iframe_wkndsite_0"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        // Search widget shell. cleaned.html lines 134-153.
        ".cmp-search",
        // Language navigation. cleaned.html lines 21-97.
        ".cmp-languagenavigation",
        // Sign-in bar. cleaned.html lines 14-20.
        ".sign-in-buttons",
        ".wknd-sign-in-buttons",
        // Safe non-authorable elements.
        "iframe",
        "noscript",
        // Empty <meta> injected inside image markup. cleaned.html line 176.
        "meta"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("data-cmp-data-layer");
        el.removeAttribute("data-cmp-data-layer-enabled");
        el.removeAttribute("data-cmp-data-layer-name");
        el.removeAttribute("data-cmp-hook-image");
        el.removeAttribute("data-cmp-link-accessibility-enabled");
        el.removeAttribute("data-cmp-link-accessibility-text");
      });
    }
  }

  // tools/importer/transformers/wknd-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function findSectionEl(element, selector) {
    const selectors = Array.isArray(selector) ? selector : [selector];
    for (let i = 0; i < selectors.length; i += 1) {
      const sel = selectors[i];
      if (!sel) continue;
      const el = element.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload && payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = findSectionEl(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || findSectionEl(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-adventures-listing.js
  var parsers = {
    "hero": parse,
    "cards-filter": parse2
  };
  var PAGE_TEMPLATE = {
    "name": "adventures-listing",
    "description": "Listing page with a page title, hero banner with overlaid intro text, and a filterable grid of teaser cards categorized by tabs/filters.",
    "urls": [
      "https://wknd.site/ca/en/adventures.html",
      "https://wknd.site/us/en/adventures.html"
    ],
    "blocks": [
      {
        "name": "hero",
        "instances": [
          ".teaser.cmp-teaser--hero"
        ]
      },
      {
        "name": "cards-filter",
        "instances": [
          ".tabs.panelcontainer",
          ".cmp-tabs"
        ]
      }
    ],
    "sections": [
      {
        "id": "sec-title",
        "name": "Page title",
        "selector": [
          "main.cmp-layout-container--fixed:nth-of-type(1)",
          ".title"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".title .cmp-title"
        ]
      },
      {
        "id": "sec-hero",
        "name": "Hero banner",
        "selector": [
          ".teaser.cmp-teaser--hero"
        ],
        "style": null,
        "blocks": [
          "hero"
        ],
        "defaultContent": []
      },
      {
        "id": "sec-adventures-grid",
        "name": "Current Adventures",
        "selector": [
          ".tabs.panelcontainer"
        ],
        "style": null,
        "blocks": [
          "cards-filter"
        ],
        "defaultContent": [
          ".title.cmp-title--underline"
        ]
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    const seen = /* @__PURE__ */ new Set();
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        let elements = [];
        try {
          elements = Array.from(document2.querySelectorAll(selector));
        } catch (e) {
          return;
        }
        elements.forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
        });
      });
    });
    return pageBlocks;
  }
  var import_adventures_listing_default = {
    transform: (payload) => {
      const { document: document2, url, html, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_adventures_listing_exports);
})();
