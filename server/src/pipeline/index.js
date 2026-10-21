import normalizeSlideOutput from "./slideNormalizer.js";
import validateSlideOutput from "./slideValidator.js";
import renderSlide from "./slideRenderer.js";
import composeSlideOutput from "./slideComposer.js";
import assertRenderedSlide from "./renderValidator.js";

export function processSlide(raw) {
  const normalized = normalizeSlideOutput(raw);
  return validateSlideOutput(normalized);
}

export function processAndRender(raw, slideNumber, masterTemplate) {
  const slide = masterTemplate ? composeSlideOutput(raw, masterTemplate) : processSlide(raw);
  return renderSlide(slide, slideNumber);
}

export { normalizeSlideOutput, validateSlideOutput, renderSlide, composeSlideOutput, assertRenderedSlide };
