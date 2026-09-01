/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND section breaks + Section Metadata.
 *
 * Inserts an <hr> before every non-first template section, and a
 * "Section Metadata" block after any section that declares a `style`.
 *
 * page-templates.json note: each section's `selector` is an ARRAY of
 * fallback selectors (DOM-verified during page analysis). We try each in
 * order and use the first that matches on the page being imported.
 *
 * Both hooks are required: breaks are inserted in beforeTransform (while
 * every section element still exists, before parsers replace them), using a
 * marker attribute on the <hr> so the Section Metadata block can be anchored
 * in afterTransform even after a parser has replaced the original element.
 * Sections are processed in reverse so inserts never shift the position of
 * sections not yet handled.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function findSectionEl(element, selector) {
  // selector may be a string or an array of fallback selectors.
  const selectors = Array.isArray(selector) ? selector : [selector];
  for (let i = 0; i < selectors.length; i += 1) {
    const sel = selectors[i];
    if (!sel) continue;
    const el = element.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      // First section needs neither a leading break nor (unless styled) a marker.
      if (i === 0 && !section.style) continue;

      const sectionEl = findSectionEl(element, section.selector);
      if (!sectionEl) continue; // no fallback selector matched on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || findSectionEl(element, section.selector);
      if (!anchor) continue; // neither the marker nor the section survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
