import normalizeSlideOutput from "./slideNormalizer.js";
import validateSlideOutput from "./slideValidator.js";
import renderSlide from "./slideRenderer.js";

/**
 * Slide Pipeline
 *
 * Orchestrates the full processing chain for a `{ css, html }` slide:
 *
 *   Normalizer → Validator → (Renderer)
 *
 * - `processSlide`  : normalize + validate, returns the clean `{ css, html }`.
 * - `processAndRender` : normalize + validate + render to a full HTML document.
 */

/**
 * Normalize and validate a raw `{ css, html }` slide.
 *
 * @param {Object} raw - Raw model output, e.g. `{ css, html }`.
 * @returns {Object} Normalized + validated `{ css, html }`.
 */
export function processSlide(raw) {
  const normalized = normalizeSlideOutput(raw);
  return validateSlideOutput(normalized);
}

/**
 * Normalize, validate, and render a raw `{ css, html }` slide to a full HTML
 * document.
 *
 * @param {Object} raw - Raw model output, e.g. `{ css, html }`.
 * @param {number} [slideNumber] - Optional slide number for the <title>.
 * @returns {string} A complete HTML document string.
 */
export function processAndRender(raw, slideNumber) {
  const slide = processSlide(raw);
  return renderSlide(slide, slideNumber);
}

export { normalizeSlideOutput, validateSlideOutput, renderSlide };
