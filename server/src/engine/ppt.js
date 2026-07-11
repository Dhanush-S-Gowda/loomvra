import pptxgen from "pptxgenjs";
import fs from "fs/promises";

const SCENE_GRAPH_FILE = "scene_graph.json";
const OUTPUT_FILE = "presentation.pptx";

// Standard PowerPoint widescreen dimensions in inches (13.333" x 7.5")
const SLIDE_WIDTH_INCHES = 13.333;
const SLIDE_HEIGHT_INCHES = 7.5;

function pxToInches(px, slideDimensionPx, slideDimensionInches) {
    return (px / slideDimensionPx) * slideDimensionInches;
}

/**
 * Clean text content: replace literal \n with space, collapse multiple spaces,
 * and trim.
 */
function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/\\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Parse a CSS box-shadow string into PptxGenJS ShadowProps.
 */
function parseBoxShadow(boxShadow) {
    if (!boxShadow || boxShadow === "none") return null;

    const parts = boxShadow.match(
        /(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)?\s+(-?\d+px)?\s*(.*)/,
    );
    if (!parts) return null;

    const offsetY = parseFloat(parts[2]) || 0;
    const blur = parseFloat(parts[3]) || 0;
    const colorStr = (parts[5] || "#000000").trim();

    let color = "000000";
    let opacity = 0.5;

    const hexMatch = colorStr.match(/#([0-9A-Fa-f]{6})/);
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

    if (hexMatch) {
        color = hexMatch[1];
    } else if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        color = [r, g, b]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
        const nums = colorStr.match(/[\d.]+/g);
        if (nums && nums.length >= 4) {
            opacity = parseFloat(nums[3]);
        }
    }

    return {
        type: "outer",
        blur: blur,
        offset: Math.abs(offsetY),
        color: color,
        opacity: opacity,
    };
}

/**
 * Build PptxGenJS line props from per-side border styles.
 * If all sides match, returns a single line prop.
 * If only specific sides have borders, returns an array of
 * { side, lineProps } objects for drawing individual border lines.
 */
function buildLineProps(style, frame) {
    const sides = ["Top", "Right", "Bottom", "Left"];
    const borders = sides.map((side) => ({
        side,
        width: style[`border${side}Width`] || 0,
        color: style[`border${side}Color`],
        borderStyle: style[`border${side}Style`],
    }));

    const activeBorders = borders.filter(
        (b) => b.width > 0 && b.color && b.borderStyle !== "none" && b.borderStyle !== ""
    );

    if (activeBorders.length === 0) return null;

    const dashMap = {
        solid: "solid",
        dashed: "dash",
        dotted: "dot",
        double: "solid",
    };

    function toLineProp(b) {
        return {
            width: b.width,
            color: b.color.replace("#", ""),
            dashType: dashMap[b.borderStyle] || "solid",
        };
    }

    // If all 4 sides are identical, return a single line prop
    if (activeBorders.length === 4) {
        const first = activeBorders[0];
        const allSame = activeBorders.every(
            (b) => b.width === first.width && b.color === first.color && b.borderStyle === first.borderStyle
        );
        if (allSame) return { line: toLineProp(first) };
    }

    // Otherwise return per-side borders
    return activeBorders.map((b) => ({
        side: b.side,
        line: toLineProp(b),
    }));
}

/**
 * Normalize a hex color: strip the # prefix.
 * Returns null if falsy.
 */
function normalizeColor(color) {
    if (!color) return null;
    return color.replace("#", "");
}

async function generatePresentation() {
    const raw = await fs.readFile(SCENE_GRAPH_FILE, "utf8");
    const scene = JSON.parse(raw);

    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    pres.author = "PPT Maker";
    pres.title = "Generated Presentation";

    for (const slideData of scene.slides) {
        const slideWidthPx = slideData.width;
        const slideHeightPx = slideData.height;

        const toInchesX = (px) =>
            pxToInches(px, slideWidthPx, SLIDE_WIDTH_INCHES);
        const toInchesY = (px) =>
            pxToInches(px, slideHeightPx, SLIDE_HEIGHT_INCHES);

        const slide = pres.addSlide();

        // --- Slide background ---
        if (slideData.background) {
            slide.background = {
                color: normalizeColor(slideData.background),
            };
        }

        // --- Process each element ---
        for (const el of slideData.elements) {
            const frame = el.frame;
            const style = el.style;

            const x = toInchesX(frame.x);
            const y = toInchesY(frame.y);
            const w = toInchesX(frame.width);
            const h = toInchesY(frame.height);

            const basePos = { x, y, w, h };

            switch (el.kind) {
                // ==========================================
                // SHAPE
                // ==========================================
                case "shape": {
                    const opts = { ...basePos };

                    // Fill
                    if (style.background) {
                        opts.fill = {
                            color: normalizeColor(style.background),
                            transparency:
                                style.backgroundAlpha !== undefined
                                    ? Math.round(
                                          (1 - style.backgroundAlpha) * 100,
                                      )
                                    : 0,
                        };
                    }

                    // Border radius -> use roundRect shape
                    const hasRadius = style.borderRadius > 0;
                    if (hasRadius) {
                        const minDim = Math.min(frame.width, frame.height);
                        // Use roundRect for partial rounding, ellipse for full rounding
                        if (style.borderRadius >= minDim / 2) {
                            opts.shapeType = pres.ShapeType.ellipse;
                        } else {
                            opts.shapeType = pres.ShapeType.roundRect;
                            opts.rectRadius = Math.min(
                                style.borderRadius / minDim,
                                1,
                            );
                        }
                    }

                    // Border
                    const lineResult = buildLineProps(style, frame);
                    if (lineResult) {
                        if (Array.isArray(lineResult)) {
                            // Per-side borders: draw the main shape first without border,
                            // then draw thin rectangles for each side
                            // (main shape drawn below, border shapes added after)
                            opts.line = null;
                        } else {
                            opts.line = lineResult.line;
                        }
                    }

                    // Shadow
                    if (style.boxShadow) {
                        const shadow = parseBoxShadow(style.boxShadow);
                        if (shadow) opts.shadow = shadow;
                    }

                    // Opacity -> transparency (0-100)
                    if (style.opacity !== undefined && style.opacity < 1) {
                        opts.transparency = Math.round(
                            (1 - style.opacity) * 100,
                        );
                    }

                    const shapeType = opts.shapeType || pres.ShapeType.rect;
                    delete opts.shapeType;
                    slide.addShape(shapeType, opts);

                    // Draw per-side borders as thin rectangles
                    if (lineResult && Array.isArray(lineResult)) {
                        for (const b of lineResult) {
                            const borderOpts = { ...basePos };
                            borderOpts.fill = { color: b.line.color };
                            borderOpts.line = null;

                            const bw = b.line.width;
                            const bwInchesX = toInchesX(bw);
                            const bwInchesY = toInchesY(bw);

                            switch (b.side) {
                                case "Top":
                                    borderOpts.x = x;
                                    borderOpts.y = y;
                                    borderOpts.w = w;
                                    borderOpts.h = bwInchesY;
                                    break;
                                case "Bottom":
                                    borderOpts.x = x;
                                    borderOpts.y = y + h - bwInchesY;
                                    borderOpts.w = w;
                                    borderOpts.h = bwInchesY;
                                    break;
                                case "Left":
                                    borderOpts.x = x;
                                    borderOpts.y = y;
                                    borderOpts.w = bwInchesX;
                                    borderOpts.h = h;
                                    break;
                                case "Right":
                                    borderOpts.x = x + w - bwInchesX;
                                    borderOpts.y = y;
                                    borderOpts.w = bwInchesX;
                                    borderOpts.h = h;
                                    break;
                            }

                            slide.addShape(pres.ShapeType.rect, borderOpts);
                        }
                    }

                    break;
                }

                // ==========================================
                // TEXT
                // ==========================================
                case "text": {
                    const opts = { ...basePos };

                    // Typography
                    if (style.fontFamily) {
                        opts.fontFace = style.fontFamily
                            .split(",")[0]
                            .replace(/["']/g, "")
                            .trim();
                    }

                    // Font size: convert px to pt (1px = 0.75pt)
                    if (style.fontSize) {
                        opts.fontSize = Math.round(style.fontSize * 0.75);
                    }

                    if (style.fontWeight >= 700) opts.bold = true;
                    if (style.fontStyle === "italic") opts.italic = true;

                    // Color
                    if (style.color) {
                        opts.color = normalizeColor(style.color);
                    }

                    // Text alignment
                    if (style.textAlign) {
                        opts.align = style.textAlign;
                    }

                    // Character spacing (letter-spacing in px -> pt)
                    // PptxGenJS charSpacing only supports positive values 1-256
                    if (style.letterSpacing) {
                        const cs = Math.round(style.letterSpacing * 0.75);
                        if (cs >= 1) {
                            opts.charSpacing = cs;
                        }
                    }

                    // Line height -> lineSpacingMultiple (ratio)
                    // CSS lineHeight is in px. Convert to a ratio relative to fontSize.
                    if (style.lineHeight > 0 && style.fontSize > 0) {
                        opts.lineSpacingMultiple = style.lineHeight / style.fontSize;
                    }

                    // Text decoration
                    if (style.textDecoration === "underline") {
                        opts.underline = true;
                    } else if (style.textDecoration === "line-through") {
                        opts.strike = "sngStrike";
                    }

                    // Background fill for text box
                    if (style.background) {
                        opts.fill = {
                            color: normalizeColor(style.background),
                            transparency:
                                style.backgroundAlpha !== undefined
                                    ? Math.round(
                                          (1 - style.backgroundAlpha) * 100,
                                      )
                                    : 0,
                        };
                    }

                    // Border
                    const lineProps = buildLineProps(style);
                    if (lineProps) opts.line = lineProps;

                    // Shadow
                    if (style.boxShadow) {
                        const shadow = parseBoxShadow(style.boxShadow);
                        if (shadow) opts.shadow = shadow;
                    }

                    // Opacity -> transparency
                    if (style.opacity !== undefined && style.opacity < 1) {
                        opts.transparency = Math.round(
                            (1 - style.opacity) * 100,
                        );
                    }

                    // Padding -> inset (use the largest padding value)
                    const padding = Math.max(
                        style.paddingTop || 0,
                        style.paddingRight || 0,
                        style.paddingBottom || 0,
                        style.paddingLeft || 0,
                    );
                    if (padding > 0) {
                        opts.inset = toInchesX(padding);
                    }

                    // Vertical alignment from flex/align-items
                    const alignVal =
                        style.alignItems ||
                        style.containerAlignItems ||
                        "";
                    if (alignVal === "center" || alignVal === "stretch") {
                        opts.valign = "middle";
                    } else if (
                        alignVal === "flex-end" ||
                        alignVal === "end"
                    ) {
                        opts.valign = "bottom";
                    } else {
                        opts.valign = "top";
                    }

                    // Text transform
                    let text = cleanText(el.text);
                    if (style.textTransform === "uppercase") {
                        text = text.toUpperCase();
                    } else if (style.textTransform === "lowercase") {
                        text = text.toLowerCase();
                    } else if (style.textTransform === "capitalize") {
                        text = text.replace(/\b\w/g, (c) =>
                            c.toUpperCase(),
                        );
                    }

                    // Hyperlink
                    if (el.href) {
                        opts.hyperlink = { url: el.href };
                    }

                    slide.addText(text, opts);
                    break;
                }

                // ==========================================
                // IMAGE
                // ==========================================
                case "image": {
                    const opts = { ...basePos };

                    opts.path = el.src;

                    // Object-fit sizing
                    if (
                        style.objectFit === "cover" ||
                        style.objectFit === "contain"
                    ) {
                        opts.sizing = {
                            type: style.objectFit,
                            w: w,
                            h: h,
                            x: 0,
                            y: 0,
                        };
                    }

                    // Border radius -> PptxGenJS only supports full rounding
                    // (circle). For partial rounding, we skip since there's
                    // no native support for rounded-rectangle images.
                    if (style.borderRadius > 0) {
                        const minDim = Math.min(frame.width, frame.height);
                        if (style.borderRadius >= minDim / 2) {
                            opts.rounding = true;
                        }
                    }

                    // Opacity -> transparency
                    if (style.opacity !== undefined && style.opacity < 1) {
                        opts.transparency = Math.round(
                            (1 - style.opacity) * 100,
                        );
                    }

                    slide.addImage(opts);
                    break;
                }
            }
        }
    }

    await pres.writeFile({ fileName: OUTPUT_FILE });
    console.log(`Presentation saved to ${OUTPUT_FILE}`);
}

generatePresentation().catch(console.error);