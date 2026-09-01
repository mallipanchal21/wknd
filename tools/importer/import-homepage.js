/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from "./parsers/carousel-hero.js";
import columnsParser from "./parsers/columns.js";
import cardsParser from "./parsers/cards.js";
import heroParser from "./parsers/hero.js";

// TRANSFORMER IMPORTS
import cleanupTransformer from "./transformers/wknd-cleanup.js";
import sectionsTransformer from "./transformers/wknd-sections.js";

// PARSER REGISTRY
const parsers = {
  "carousel-hero": carouselHeroParser,
  "columns": columnsParser,
  "cards": cardsParser,
  "hero": heroParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
    "name": "homepage",
    "description": "Landing page with a full-width hero carousel, a featured-article promo (image beside text with CTA), a teaser card grid of recent articles, and an adventure card grid.",
    "urls": [
      "https://wknd.site/",
      "https://wknd.site/ca/en.html",
      "https://wknd.site/ca/fr.html",
      "https://wknd.site/ch/de.html",
      "https://wknd.site/ch/fr.html",
      "https://wknd.site/ch/it.html",
      "https://wknd.site/de/de.html",
      "https://wknd.site/es/es.html",
      "https://wknd.site/fr/fr.html",
      "https://wknd.site/it/it.html",
      "https://wknd.site/us/en.html",
      "https://wknd.site/us/es.html"
    ],
    "blocks": [
      {
        "name": "carousel-hero",
        "instances": [
          ".carousel.cmp-carousel--hero",
          ".carousel.panelcontainer"
        ]
      },
      {
        "name": "columns",
        "instances": [
          ".teaser.cmp-teaser--featured"
        ]
      },
      {
        "name": "cards",
        "instances": [
          ".image-list.list",
          ".cmp-image-list",
          "div[id^=container-]"
        ]
      },
      {
        "name": "hero",
        "instances": [
          ".teaser.cmp-teaser--hero"
        ]
      }
    ],
    "sections": [
      {
        "id": "sec-hero",
        "name": "Hero image carousel",
        "selector": [
          ".carousel.cmp-carousel--hero"
        ],
        "style": null,
        "blocks": [
          "carousel-hero"
        ],
        "defaultContent": []
      },
      {
        "id": "sec-featured",
        "name": "Featured article promo",
        "selector": [
          ".teaser.cmp-teaser--featured"
        ],
        "style": "grey",
        "blocks": [
          "columns"
        ],
        "defaultContent": []
      },
      {
        "id": "sec-recent",
        "name": "Recent Articles teaser grid",
        "selector": [
          ".image-list.list"
        ],
        "style": null,
        "blocks": [
          "cards"
        ],
        "defaultContent": []
      },
      {
        "id": "sec-next",
        "name": "Next Adventures feature",
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
        "id": "sec-where",
        "name": "Where do you want to go grid",
        "selector": [
          "div[id^=container-]"
        ],
        "style": null,
        "blocks": [
          "cards"
        ],
        "defaultContent": []
      }
    ]
  };

// TRANSFORMER REGISTRY (section transformer only when 2+ sections)
const transformers = [
  cleanupTransformer,
  ...((PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1) ? [sectionsTransformer] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      let elements = [];
      try { elements = Array.from(document.querySelectorAll(selector)); } catch (e) { return; }
      elements.forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    executeTransformers("beforeTransform", main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      }
    });

    executeTransformers("afterTransform", main, payload);

    const hr = document.createElement("hr");
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, "")
      .replace(/\.html?$/, "");
    const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
