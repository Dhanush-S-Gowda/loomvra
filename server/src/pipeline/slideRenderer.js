export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

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
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
  </style>
  ${css}
</head>
<body>
${html}
</body>
</html>`;
}

export default renderSlide;
