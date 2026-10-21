import * as cheerio from "cheerio";
import postcss from "postcss";
import { SlideOutputSchema } from "../schemas/slide.zod.js";

const ROOT_CLASS = "slide";

function extractCssText(css) {
  const match = String(css).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1] : "";
}

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

export function validateSlideOutput(slide) {
  const parsed = SlideOutputSchema.parse(slide);
  validateCss(parsed.css);
  validateHtml(parsed.html);
  return parsed;
}

export default validateSlideOutput;
