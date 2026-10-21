import * as cheerio from "cheerio";

const ROOT_CLASS = "slide";

function normalizeCss(css) {
  let value = String(css ?? "").trim();
  if (!value) return "";

  if (/^<style\b/i.test(value)) {
    return value;
  }

  return `<style>\n${value}\n</style>`;
}

function stripDocumentTags(html) {
  let s = String(html ?? "").trim();
  s = s.replace(/<\!doctype[^>]*>/gi, "");
  s = s.replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
  return s.trim();
}

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
