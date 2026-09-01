/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import quoteParser from "./parsers/quote.js";
import relatedStoriesParser from "./parsers/related-stories.js";

// TRANSFORMER IMPORTS
import cleanupTransformer from "./transformers/wknd-cleanup.js";
import sectionsTransformer from "./transformers/wknd-sections.js";

// PARSER REGISTRY
const parsers = {
  "quote": quoteParser,
  "related-stories": relatedStoriesParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
    "name": "article-page",
    "description": "Long-form article page with a hero image, article title and byline, a right-hand related-stories sidebar, and body copy split into multiple headed text sections with inline images.",
    "urls": [
      "https://wknd.site/ca/en/magazine/arctic-surfing.html",
      "https://wknd.site/ca/en/magazine/guide-la-skateparks.html",
      "https://wknd.site/ca/en/magazine/members-only/alaskan-adventure.html",
      "https://wknd.site/ca/en/magazine/members-only/fly-fishing-the-amazon.html",
      "https://wknd.site/ca/en/magazine/san-diego-surf.html",
      "https://wknd.site/ca/en/magazine/ski-touring.html",
      "https://wknd.site/ca/en/magazine/western-australia.html",
      "https://wknd.site/us/en/magazine/arctic-surfing.html",
      "https://wknd.site/us/en/magazine/guide-la-skateparks.html",
      "https://wknd.site/us/en/magazine/san-diego-surf.html",
      "https://wknd.site/us/en/magazine/ski-touring.html",
      "https://wknd.site/us/en/magazine/western-australia.html"
    ],
    "blocks": [
      {
        "name": "quote",
        "instances": [
          ".quote",
          "blockquote",
          ".cmp-quote"
        ]
      },
      {
        "name": "related-stories",
        "instances": [
          "aside.cmp-layoutcontainer--sidebar",
          "aside.container.responsivegrid"
        ]
      }
    ],
    "sections": [
      {
        "id": "sec-hero",
        "name": "Hero image",
        "selector": [
          "main.cmp-layout-container--fixed > .cmp-container .image:first-child",
          ".image.aem-GridColumn"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": [
          ".image img"
        ]
      },
      {
        "id": "sec-body",
        "name": "Article body",
        "selector": [
          "main.aem-GridColumn--default--8 > .cmp-container",
          "main.aem-GridColumn--default--8"
        ],
        "style": null,
        "blocks": [
          "quote"
        ],
        "defaultContent": [
          ".title",
          ".text"
        ]
      },
      {
        "id": "sec-author",
        "name": "Author bio",
        "selector": [
          "[class*=cmp-experiencefragment]"
        ],
        "style": null,
        "blocks": [],
        "defaultContent": []
      },
      {
        "id": "sec-related",
        "name": "Related stories sidebar",
        "selector": [
          "aside.cmp-layoutcontainer--sidebar"
        ],
        "style": null,
        "blocks": [
          "related-stories"
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
