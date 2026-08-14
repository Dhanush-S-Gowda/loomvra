import * as cheerio from "cheerio";
import postcss from "postcss";
import normalizeSlideOutput from "./slideNormalizer.js";

const PROTECTED_SELECTOR = /(^|[\s,>+~])(?:html|body|\*)|:root|\.slide(?:[.#:\[]|$)|\.persistent(?:[.#:\[]|$)/i;
const GLOBAL_TAG_SELECTOR = /(^|,\s*)(?:[a-z][a-z0-9-]*|\*)\b/i;
const SCOPED_SELECTOR = /\.s(?:\d+|[a-z]+-)[\w-]*/i;

function styleBody(css) {
  const match = String(css || "").match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1] : "";
}

/** Keep model CSS from changing the immutable master frame or global page. */
export function sanitizeSlideCss(css) {
  const source = styleBody(css);
  if (!source.trim()) return "";
  try {
    const root = postcss.parse(source);
    root.walkRules((rule) => {
      if (PROTECTED_SELECTOR.test(rule.selector) || GLOBAL_TAG_SELECTOR.test(rule.selector) || !SCOPED_SELECTOR.test(rule.selector)) rule.remove();
    });
    return root.toString().trim();
  } catch {
    return "";
  }
}

function directChildren($root) {
  return $root.children().toArray();
}

/**
 * Compose a model response into the server-owned master template. Older model
 * responses that contain a full slide remain supported; their master-like
 * regions are discarded rather than layered on top of the canonical master.
 */
export function composeSlideOutput(raw, masterTemplate) {
  const candidate = normalizeSlideOutput(raw);
  const master = normalizeSlideOutput(masterTemplate);
  const $candidate = cheerio.load(candidate.html, { xml: false });
  const $master = cheerio.load(master.html, { xml: false });
  const candidateRoot = $candidate("body").children().first();
  const masterRoot = $master("body").children().first();
  const candidateContent = candidateRoot.find(".slide-content").first();
  const masterContent = masterRoot.find(".slide-content").first();

  // Header text is slide-specific when the model returned a header region.
  const candidateHeader = candidateRoot.find(".slide-header").first();
  const masterHeader = masterRoot.find(".slide-header").first();
  if (candidateHeader.length && masterHeader.length) {
    masterHeader.empty().append(candidateHeader.contents().clone());
  }

  if (masterContent.length) {
    masterContent.empty();
    if (candidateContent.length) {
      masterContent.append(candidateContent.contents().clone());
    } else {
      const excluded = new Set(["slide-header", "slide-footer", "persistent"]);
      for (const node of directChildren(candidateRoot)) {
        const classes = new Set(String($candidate(node).attr("class") || "").split(/\s+/));
        if (![...excluded].some((name) => classes.has(name))) {
          masterContent.append($candidate(node).clone());
        }
      }
    }
  }

  return {
    css: `<style>\n${styleBody(master.css)}\n${sanitizeSlideCss(candidate.css)}\n</style>`,
    html: $master("body").html().trim(),
  };
}

export default composeSlideOutput;
