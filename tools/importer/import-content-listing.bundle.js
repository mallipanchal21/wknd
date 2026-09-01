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

  // tools/importer/import-content-listing.js
  var import_content_listing_exports = {};
  __export(import_content_listing_exports, {
    default: () => import_content_listing_default
  });

  // tools/importer/parsers/cards-team.js
  function bail(element) {
    element.replaceWith(...element.childNodes);
  }
  function parse(element, { document: document2 }) {
    let root = element.closest('[class*="cmp-experiencefragment--"]') || (element.matches('[class*="cmp-experiencefragment--"]') ? element : element);
    const cls = root.className || "";
    if (/cmp-experiencefragment--(header|footer)/.test(cls)) {
      bail(element);
      return;
    }
    const img = root.querySelector(".cmp-image__image, img");
    const titles = Array.from(root.querySelectorAll(".cmp-title__text"));
    const nameEl = titles[0] || null;
    const roleEl = titles[1] || null;
    if (!nameEl || !img) {
      bail(element);
      return;
    }
    const socialLinks = Array.from(root.querySelectorAll(".cmp-buildingblock--btn-list a.cmp-button, .buildingblock a.cmp-button"));
    const textCell = [];
    const h = document2.createElement("h3");
    h.textContent = nameEl.textContent.trim();
    textCell.push(h);
    if (roleEl) {
      const p = document2.createElement("p");
      p.textContent = roleEl.textContent.trim();
      textCell.push(p);
    }
    socialLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const a = document2.createElement("a");
      a.href = href;
      const label = (link.querySelector(".cmp-button__text") || link).textContent.trim() || link.getAttribute("aria-label") || href;
      a.textContent = label;
      textCell.push(a);
    });
    const cells = [[img, textCell]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-team", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/columns.js
  function parse2(element, { document: document2 }) {
    const img = element.querySelector(".cmp-teaser__image img, img");
    const pretitle = element.querySelector(".cmp-teaser__pretitle");
    const title = element.querySelector(".cmp-teaser__title, h1, h2, h3");
    const description = element.querySelector(".cmp-teaser__description");
    const cta = element.querySelector(".cmp-teaser__action-link");
    const textCell = [];
    if (pretitle) {
      const p = document2.createElement("p");
      p.textContent = pretitle.textContent.trim();
      textCell.push(p);
    }
    if (title) {
      const h = document2.createElement("h2");
      h.textContent = title.textContent.trim();
      textCell.push(h);
    }
    if (description) {
      const p = document2.createElement("p");
      p.innerHTML = description.innerHTML;
      textCell.push(p);
    }
    if (cta && cta.getAttribute("href")) {
      const a = document2.createElement("a");
      a.href = cta.getAttribute("href");
      a.textContent = cta.textContent.trim();
      textCell.push(a);
    }
    if (textCell.length === 0 && !img) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[textCell.length ? textCell : "", img || ""]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards.js
  function parse3(element, { document: document2 }) {
    const items = Array.from(element.querySelectorAll(".cmp-image-list__item, li.cmp-image-list__item"));
    const cells = [];
    items.forEach((item) => {
      const img = item.querySelector("img");
      const titleLink = item.querySelector(".cmp-image-list__item-title-link");
      const titleText = item.querySelector(".cmp-image-list__item-title");
      const description = item.querySelector(".cmp-image-list__item-description");
      const textCell = [];
      if (titleText) {
        const h = document2.createElement("h3");
        const href = titleLink ? titleLink.getAttribute("href") : null;
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
      cells.push([img || "", textCell.length ? textCell : ""]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards", cells });
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

  // tools/importer/import-content-listing.js
  var parsers = {
    "cards-team": parse,
    "columns": parse2,
    "cards": parse3
  };
  var PAGE_TEMPLATE = {
    "name": "content-listing",
    "description": "Section landing/listing page with a page title followed by one or more headed sections, each containing a grid of teaser cards (image, name, role/description, and links).",
    "urls": [
      "https://wknd.site/ca/en/about-us.html",
      "https://wknd.site/ca/en/magazine.html",
      "https://wknd.site/ca/en/magazine/members-only.html",
      "https://wknd.site/us/en/about-us.html",
      "https://wknd.site/us/en/magazine.html"
    ],
    "blocks": [
      {
        "name": "cards-team",
        "instances": [
          ".xf-master-building-block",
          ".buildingblock.responsivegrid",
          "[class*=cmp-experiencefragment]"
        ]
      },
      {
        "name": "columns",
        "instances": [
          ".teaser.cmp-teaser--featured",
          ".cmp-teaser--featured"
        ]
      },
      {
        "name": "cards",
        "instances": [
          ".cmp-image-list",
          ".image-list.list"
        ]
      }
    ],
    "sections": [
      {
        "id": "sec-title",
        "name": "Page title",
        "selector": [
          "main .aem-Grid > div.title:nth-of-type(1)",
          ".title"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".title .cmp-title"
        ]
      },
      {
        "id": "sec-contributors",
        "name": "Our Contributors",
        "selector": [
          ".title.cmp-title--underline:nth-of-type(2)"
        ],
        "style": null,
        "blocks": [
          "cards-team"
        ],
        "defaultContent": [
          ".title.cmp-title--underline",
          ".text"
        ]
      },
      {
        "id": "sec-guides",
        "name": "WKND Guides",
        "selector": [
          ".title.cmp-title--underline:nth-of-type(4)"
        ],
        "style": null,
        "blocks": [
          "cards-team"
        ],
        "defaultContent": [
          ".title.cmp-title--underline",
          ".text"
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
  var import_content_listing_default = {
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
      return [{ element: main, path, report: { title: document2.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) } }];
    }
  };
  return __toCommonJS(import_content_listing_exports);
})();
