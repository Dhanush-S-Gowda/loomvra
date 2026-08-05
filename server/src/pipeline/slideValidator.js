import * as cheerio from "cheerio";
import postcss from "postcss";
import { SlideOutputSchema } from "../schemas/slide.zod.js";

/**
 * Validator
 *
 * Validates a normalized `{ css, html }` slide object using:
 *   - zod        : structural shape of the object.
 *   - cheerio    : DOM-level checks (root <div class="slide">, no <script>).
 *   - postcss    : CSS syntax check of the <style> contents.
 *
 * Throws an Error describing the first problem found.
 */

const ROOT_CLASS = "slide";

/**
 * Extract the raw CSS text from inside a `<style>` block.
 */
function extractCssText(css) {
  const match = String(css).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1] : "";
}

/**
 * Validate the css value:
 *   - must contain a `<style>` block
 *   - the CSS inside must parse without syntax errors (postcss)
 */
function validateCss(css) {
  if (!/<style\b[^>]*>[\s\S]*?<\/style>/i.test(css)) {
    throw new Error("css must contain a <style> block.");
  }

  const cssText = extractCssText(css);
  if (!cssText.trim()) {
    throw new Error("css <style> block is empty.");
  }

  try {
    postcss.parse(cssText);
  } catch (err) {
    throw new Error(`Invalid CSS: ${err.message}`);
  }
}

/**
 * Validate the html value:
 *   - must contain a root <div class="slide"> element
 *   - must not contain <script> tags
 */
function validateHtml(html) {
  const $ = cheerio.load(html, { xml: false });

  const root = $("body").children().first();
  if (root.length === 0) {
    throw new Error("html must contain a root element.");
  }

  if (!root.is("div") || !root.hasClass(ROOT_CLASS)) {
    throw new Error(
      `html root element must be a <div class="${ROOT_CLASS}">.`
    );
  }

  if ($("script").length > 0) {
    throw new Error("html must not contain <script> tags.");
  }
}

/**
 * Validate a normalized `{ css, html }` slide object.
 *
 * @param {Object} slide - Normalized slide output.
 * @returns {Object} The validated slide object.
 */
export function validateSlideOutput(slide) {
  const parsed = SlideOutputSchema.parse(slide);
  validateCss(parsed.css);
  validateHtml(parsed.html);
  return parsed;
}

export default validateSlideOutput;
