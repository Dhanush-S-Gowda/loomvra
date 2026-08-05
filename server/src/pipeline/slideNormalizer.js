import * as cheerio from "cheerio";

/**
 * Normalizer
 *
 * Takes the raw `{ css, html }` output from the model and repairs common
 * structural defects so the downstream Validator can rely on a stable shape.
 *
 * Repairs performed:
 *   - css: ensure it is a single `<style>` block (wrap if missing).
 *   - html: strip document-level tags (`<html>`, `<head>`, `<body>`, doctype).
 *   - html: remove duplicate `.slide` wrappers (keep the outermost).
 *   - html: ensure the root element is a `<div class="slide">` (wrap if missing).
 */

const ROOT_CLASS = "slide";

/**
 * Ensure the css value is a single `<style>...</style>` block.
 * If the value already starts with `<style` it is returned as-is; otherwise
 * the raw CSS is wrapped in a `<style>` tag.
 */
function normalizeCss(css) {
  let value = String(css ?? "").trim();
  if (!value) return "";

  if (/^<style\b/i.test(value)) {
    return value;
  }

  return `<style>\n${value}\n</style>`;
}

/**
 * Remove document-level tags and any surrounding whitespace.
 */
function stripDocumentTags(html) {
  let s = String(html ?? "").trim();
  s = s.replace(/<\!doctype[^>]*>/gi, "");
  s = s.replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
  return s.trim();
}

/**
 * Remove duplicate `.slide` wrappers, keeping the outermost one.
 *
 * The model is instructed to return the full slide (master wrapper + content)
 * so it may occasionally nest an extra `.slide` wrapper. This collapses any
 * `.slide` that is a direct descendant of another `.slide`.
 */
function removeDuplicateWrappers($) {
  // Repeatedly unwrap inner .slide wrappers until no direct nesting remains.
  let changed = true;
  while (changed) {
    changed = false;
    $(".slide .slide").each((_i, el) => {
      const $el = $(el);
      // Move the inner wrapper's children up into the outer wrapper.
      $el.replaceWith($el.contents());
      changed = true;
    });
  }
  return $;
}

/**
 * Ensure the html has a single root `<div class="slide">...</div>`.
 * If the root is not a `.slide` div, wrap the entire content in one.
 */
function ensureRootSlide($) {
  const root = $("body").children().first();
  if (root.length === 0) {
    $("body").append(`<div class="${ROOT_CLASS}"></div>`);
    return $;
  }

  const isSlideDiv =
    root.is("div") && root.hasClass(ROOT_CLASS);

  if (isSlideDiv) {
    return $;
  }

  // Wrap all top-level children in a single .slide div.
  const $slide = $(`<div class="${ROOT_CLASS}"></div>`);
  $("body").children().each((_i, el) => {
    $slide.append($(el));
  });
  $("body").append($slide);
  return $;
}

/**
 * Normalize a `{ css, html }` slide object.
 *
 * @param {Object} input - Raw output, e.g. `{ css, html }`.
 * @returns {{ css: string, html: string }} Normalized css/html.
 */
export function normalizeSlideOutput(input = {}) {
  const css = normalizeCss(input.css);

  let html = stripDocumentTags(input.html);
  if (!html) {
    html = `<div class="${ROOT_CLASS}"></div>`;
  }

  const $ = cheerio.load(html, { xml: false });
  removeDuplicateWrappers($);
  ensureRootSlide($);

  return {
    css,
    html: $("body").html().trim(),
  };
}

export default normalizeSlideOutput;
