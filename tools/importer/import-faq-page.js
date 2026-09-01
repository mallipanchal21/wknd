/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionParser from "./parsers/accordion.js";

// TRANSFORMER IMPORTS
import cleanupTransformer from "./transformers/wknd-cleanup.js";
import sectionsTransformer from "./transformers/wknd-sections.js";

// PARSER REGISTRY
const parsers = {
  "accordion": accordionParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
    "name": "faq-page",
    "description": "Simple content page with a page title and a stacked list of question-and-answer text blocks (accordion-style FAQ layout).",
    "urls": [
      "https://wknd.site/ca/en/faqs.html",
      "https://wknd.site/us/en/faqs.html"
    ],
    "blocks": [
      {
        "name": "accordion",
        "instances": [
          ".accordion.panelcontainer",
          ".accordion",
          ".cmp-accordion"
        ]
      }
    ],
    "sections": [
      {
        "id": "sec-title",
        "name": "Page title",
        "selector": [
          ".title.cmp-title--underline",
          ".title"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".title .cmp-title"
        ]
      },
      {
        "id": "sec-intro",
        "name": "Intro",
        "selector": [
          "main .aem-Grid > .image",
          ".image.aem-GridColumn"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".image img",
          ".text"
        ]
      },
      {
        "id": "sec-faq",
        "name": "FAQ accordion",
        "selector": [
          ".accordion.panelcontainer",
          ".accordion"
        ],
        "style": null,
        "blocks": [
          "accordion"
        ],
        "defaultContent": []
      },
      {
        "id": "sec-help",
        "name": "Need more help",
        "selector": [
          "div[id^=container-]"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".title",
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
