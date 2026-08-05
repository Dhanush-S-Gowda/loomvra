/**
 * Renderer
 *
 * Wraps a validated `{ css, html }` slide into a complete, standalone HTML
 * document that can be rendered in an iframe or browser.
 *
 * The database always stores the raw `{ css, html }` JSON; boilerplate is
 * added only at render/serve time.
 */

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

/**
 * Render a `{ css, html }` slide into a full HTML document.
 *
 * @param {Object} slide - Validated slide, e.g. `{ css, html }`.
 * @param {number} [slideNumber] - Optional slide number for the <title>.
 * @returns {string} A complete HTML document string.
 */
export function renderSlide(slide, slideNumber) {
  const css = slide?.css ?? "";
  const html = slide?.html ?? "";
  const title = slideNumber ? `Slide ${slideNumber}` : "Slide";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1.0">
  <title>${title}</title>
  ${css}
</head>
<body>
${html}
</body>
</html>`;
}

export default renderSlide;
