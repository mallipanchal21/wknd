/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsTeamParser from "./parsers/cards-team.js";
import columnsParser from "./parsers/columns.js";
import cardsParser from "./parsers/cards.js";

// TRANSFORMER IMPORTS
import cleanupTransformer from "./transformers/wknd-cleanup.js";
import sectionsTransformer from "./transformers/wknd-sections.js";

// PARSER REGISTRY
const parsers = {
  "cards-team": cardsTeamParser,
  "columns": columnsParser,
  "cards": cardsParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
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

    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
    const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);

    return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) } }];
  },
};
