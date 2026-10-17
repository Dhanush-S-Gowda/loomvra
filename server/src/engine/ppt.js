import pptxgen from "pptxgenjs";
import fs from "fs/promises";

const SCENE_GRAPH_FILE = "scene_graph.json";
const OUTPUT_FILE = "presentation.pptx";

// CSS canvas pixels are defined at 96 dpi. Derive the physical slide size from
// the extracted canvas so coordinates and edges use the exact same scale.
const CSS_PIXELS_PER_INCH = 96;

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
        .replace(/\\n/g, "\n")
        .replace(/\s+/g, " ")
        .trim();
}

function textRunOptions(run, style) {
    const runStyle = run?.style || {};
    const options = {};
    const fontFace = (runStyle.fontFamily || style.fontFamily || "")
        .split(",")[0].replace(/["']/g, "").trim();
    if (fontFace) options.fontFace = fontFace;
    const fontSize = runStyle.fontSize || style.fontSize;
    if (fontSize) options.fontSize = fontSize * 0.75;
    options.bold = (runStyle.fontWeight ?? style.fontWeight) >= 700;
    options.italic = (runStyle.fontStyle || style.fontStyle) === "italic";
    const color = runStyle.color || style.color;
    if (color) options.color = normalizeColor(color);
    const alpha = runStyle.colorAlpha ?? style.colorAlpha ?? 1;
    if (alpha < 1) options.transparency = Math.round((1 - alpha) * 100);
    const decoration = runStyle.textDecoration || style.textDecoration || "";
    options.underline = decoration.includes("underline");
    options.strike = decoration.includes("line-through") ? "sngStrike" : false;
    const letterSpacing = runStyle.letterSpacing ?? style.letterSpacing;
    // PptxGenJS documents positive spacing, but its OOXML serializer writes
    // signed character spacing values. Negative CSS tracking is therefore
    // preserved in points instead of silently discarded.
    if (letterSpacing) options.charSpacing = letterSpacing * 0.75;
    return options;
}

function mapTextTransform(text, transform) {
    if (transform === "uppercase") return text.toUpperCase();
    if (transform === "lowercase") return text.toLowerCase();
    if (transform === "capitalize") return text.replace(/\b\w/g, (c) => c.toUpperCase());
    return text;
}

function normalizeRunWhitespace(text) {
    return String(text ?? "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.replace(/[\t ]+/g, " "))
        .join("\n");
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

    const offsetX = parseFloat(parts[1]) || 0;
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
        blur: blur * 0.75,
        offset: Math.hypot(offsetX, offsetY) * 0.75,
        angle: (Math.round((Math.atan2(offsetX, -offsetY) * 180) / Math.PI) + 360) % 360,
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
        alpha: style[`border${side}Alpha`],
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
            width: b.width * 0.75,
            color: b.color.replace("#", ""),
            dashType: dashMap[b.borderStyle] || "solid",
            transparency: Math.round((1 - (b.alpha ?? 1)) * 100),
        };
    }

    // If all 4 sides are identical, return a single line prop
    if (activeBorders.length === 4) {
        const first = activeBorders[0];
        const allSame = activeBorders.every(
            (b) => b.width === first.width && b.color === first.color && b.alpha === first.alpha && b.borderStyle === first.borderStyle
        );
        if (allSame) return { line: toLineProp(first) };
    }

    // Otherwise return per-side borders
    return activeBorders.map((b) => ({
        side: b.side,
        line: toLineProp(b),
        widthPx: b.width,
    }));
}

/** Draw individual CSS border sides as native PowerPoint lines. */
function drawPerSideBorders(slide, borders, frame) {
    if (!Array.isArray(borders)) return;
    for (const border of borders) {
        const line = { ...border.line, width: Math.max(0.1, border.widthPx * 0.75) };
        if (border.side === "Top") slide.addShape("line", { x: frame.x, y: frame.y, w: frame.w, h: 0, line });
        if (border.side === "Bottom") slide.addShape("line", { x: frame.x, y: frame.y + frame.h, w: frame.w, h: 0, line });
        if (border.side === "Left") slide.addShape("line", { x: frame.x, y: frame.y, w: 0, h: frame.h, line });
        if (border.side === "Right") slide.addShape("line", { x: frame.x + frame.w, y: frame.y, w: 0, h: frame.h, line });
    }
}

/**
 * Normalize a hex color: strip the # prefix.
 * Returns null if falsy.
 */
function normalizeColor(color) {
    if (!color) return null;
    return color.replace("#", "");
}

function radiusValue(radius) {
    if (typeof radius === "number") return radius;
    if (!radius || typeof radius !== "object") return 0;
    return Math.max(radius.topLeft || 0, radius.topRight || 0, radius.bottomRight || 0, radius.bottomLeft || 0);
}

function pptxRadius(radius, frame) {
    const minDimension = Math.min(frame.width, frame.height);
    return minDimension ? Math.min((2 * radiusValue(radius)) / minDimension, 1) : 0;
}

function roundedImageSvg(dataUrl, frame, radius, objectFit) {
    if (!dataUrl?.startsWith("data:")) return null;
    const width = Math.max(1, frame.width);
    const height = Math.max(1, frame.height);
    const radii = typeof radius === "number"
        ? [radius, radius, radius, radius]
        : [radius?.topLeft || 0, radius?.topRight || 0, radius?.bottomRight || 0, radius?.bottomLeft || 0];
    const [topLeft, topRight, bottomRight, bottomLeft] = radii.map((value) => Math.max(0, Math.min(value, width / 2, height / 2)));
    const path = [
        `M ${topLeft} 0`, `H ${width - topRight}`, `Q ${width} 0 ${width} ${topRight}`,
        `V ${height - bottomRight}`, `Q ${width} ${height} ${width - bottomRight} ${height}`,
        `H ${bottomLeft}`, `Q 0 ${height} 0 ${height - bottomLeft}`, `V ${topLeft}`,
        `Q 0 0 ${topLeft} 0`, "Z",
    ].join(" ");
    const aspect = objectFit === "contain" ? "xMidYMid meet" : objectFit === "fill" ? "none" : "xMidYMid slice";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="clip"><path d="${path}"/></clipPath></defs><image href="${dataUrl}" width="${width}" height="${height}" preserveAspectRatio="${aspect}" clip-path="url(#clip)"/></svg>`;
    return `image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function generatePresentation(scene, outputFile = null) {
    if (!scene) {
        const raw = await fs.readFile(SCENE_GRAPH_FILE, "utf8");
        scene = JSON.parse(raw);
    }

    const pres = new pptxgen();
    const firstSlide = scene.slides[0];
    if (!firstSlide?.width || !firstSlide?.height) {
        throw new Error("Scene graph is missing valid slide dimensions.");
    }
    pres.defineLayout({
        name: "HTML_CANVAS",
        width: firstSlide.width / CSS_PIXELS_PER_INCH,
        height: firstSlide.height / CSS_PIXELS_PER_INCH,
    });
    pres.layout = "HTML_CANVAS";
    pres.author = "PPT Maker";
    pres.title = "Generated Presentation";

    for (const slideData of scene.slides) {
        const slideWidthPx = slideData.width;
        const slideHeightPx = slideData.height;
        if (slideWidthPx !== firstSlide.width || slideHeightPx !== firstSlide.height) {
            throw new Error("All scene graph slides must use the same canvas dimensions.");
        }

        const slideWidthInches = slideWidthPx / CSS_PIXELS_PER_INCH;
        const slideHeightInches = slideHeightPx / CSS_PIXELS_PER_INCH;

        const toInchesX = (px) =>
            pxToInches(px, slideWidthPx, slideWidthInches);
        const toInchesY = (px) =>
            pxToInches(px, slideHeightPx, slideHeightInches);

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
                    if (style.background && !style.backgroundImage) {
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
                    const radius = radiusValue(style.borderRadius);
                    const hasRadius = radius > 0;
                    if (hasRadius) {
                        const minDim = Math.min(frame.width, frame.height);
                        // Use roundRect for partial rounding, ellipse for full rounding
                        if (radius >= minDim / 2) {
                            opts.shapeType = pres.ShapeType.ellipse;
                        } else {
                            opts.shapeType = pres.ShapeType.roundRect;
                            opts.rectRadius = pptxRadius(style.borderRadius, frame);
                        }
                    }

                    // Border
                    const lineResult = buildLineProps(style, frame);
                    if (lineResult) {
                        if (Array.isArray(lineResult)) {
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

                    drawPerSideBorders(slide, lineResult, basePos);

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
                        opts.fontSize = style.fontSize * 0.75;
                    }

                    if (style.fontWeight >= 700) opts.bold = true;
                    if (style.fontStyle === "italic") opts.italic = true;

                    // Color
                    if (style.color) {
                        opts.color = normalizeColor(style.color);
                    }

                    // Text alignment
                    if (["left", "center", "right", "justify"].includes(style.textAlign)) {
                        opts.align = style.textAlign;
                    }

                    // Character spacing (CSS px -> PowerPoint points). The
                    // OOXML serializer accepts signed tracking values as well.
                    if (style.letterSpacing) {
                        opts.charSpacing = style.letterSpacing * 0.75;
                    }

                    // PptxGenJS lineSpacing is measured in points, matching the
                    // CSS pixel-to-point conversion used for font size.
                    const lineHeight = style.lineHeight || (style.fontSize ? style.fontSize * 1.2 : 0);
                    if (lineHeight > 0) opts.lineSpacing = lineHeight * 0.75;

                    // Text decoration
                    if (style.textDecoration === "underline") {
                        opts.underline = true;
                    } else if (style.textDecoration === "line-through") {
                        opts.strike = "sngStrike";
                    }

                    // Background fill for text box
                    if (style.background && !style.backgroundImage) {
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

                    const textRadius = radiusValue(style.borderRadius);
                    if (textRadius > 0) {
                        opts.shape = textRadius >= Math.min(frame.width, frame.height) / 2
                            ? pres.ShapeType.ellipse
                            : pres.ShapeType.roundRect;
                        if (opts.shape === pres.ShapeType.roundRect) {
                            opts.rectRadius = toInchesX(textRadius);
                        }
                    }

                    // Border
                    const lineProps = buildLineProps(style);
                    if (lineProps && !Array.isArray(lineProps)) opts.line = lineProps.line;

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

                    // PptxGenJS text margins use points; convert CSS px to points.
                    opts.margin = [style.paddingTop || 0, style.paddingRight || 0, style.paddingBottom || 0, style.paddingLeft || 0].map((value) => value * 0.75);

                    // Vertical alignment from flex/align-items
                    const alignVal =
                        style.alignItems ||
                        style.containerAlignItems ||
                        "";
                    if (alignVal === "center" || alignVal === "stretch" || style.verticalAlign === "middle") {
                        opts.valign = "middle";
                    } else if (
                        style.verticalAlign === "bottom" ||
                        alignVal === "flex-end" ||
                        alignVal === "end"
                    ) {
                        opts.valign = "bottom";
                    } else {
                        opts.valign = "top";
                    }

                    // Text transform
                    let text = cleanText(el.text);
                    if (style.whiteSpace === "nowrap") opts.wrap = false;
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

                    const textRuns = Array.isArray(el.runs) && el.runs.length
                        ? el.runs.map((run) => ({
                              // Keep boundary spaces: adjacent run spaces carry
                              // the separation between differently styled text.
                              text: mapTextTransform(normalizeRunWhitespace(run.text), style.textTransform),
                              options: { ...textRunOptions(run, style), ...(run.breakLine ? { breakLine: true } : {}) },
                          }))
                        : null;
                    if (textRuns && textRuns.some((run) => run.options.breakLine || run.text.includes("\n"))) {
                        // The extractor records Chromium's actual line breaks.
                        // Prevent PowerPoint's different font metrics from
                        // introducing additional wraps inside those lines.
                        opts.wrap = false;
                    }
                    slide.addText(textRuns || mapTextTransform(text, style.textTransform), opts);
                    drawPerSideBorders(slide, lineProps, basePos);
                    break;
                }

                // ==========================================
                // IMAGE
                // ==========================================
                case "image": {
                    const opts = { ...basePos };

                    if (el.alt) opts.altText = el.alt;
                    if (el.href) opts.hyperlink = { url: el.href };
                    if (style.rotate) opts.rotate = style.rotate;

                    if (el.src?.startsWith("data:")) opts.data = el.src.replace(/^data:/i, "");
                    else opts.path = el.src;

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

                    // PptxGenJS supports circular picture crops. It cannot
                    // natively clip a picture to an arbitrary rounded rectangle.
                    const radius = radiusValue(style.borderRadius);
                    if (radius > 0) {
                        const minDim = Math.min(frame.width, frame.height);
                        if (radius >= minDim / 2) {
                            opts.rounding = true;
                        } else if (el.src?.startsWith("data:")) {
                            const clippedData = roundedImageSvg(el.src, frame, style.borderRadius, style.objectFit);
                            if (clippedData) {
                                opts.data = clippedData;
                                delete opts.path;
                                delete opts.sizing;
                                delete opts.rounding;
                            }
                        }
                    }

                    // Opacity -> transparency
                    if (style.opacity !== undefined && style.opacity < 1) {
                        opts.transparency = Math.round(
                            (1 - style.opacity) * 100,
                        );
                    }

                    if (style.boxShadow) {
                        const shadow = parseBoxShadow(style.boxShadow);
                        if (shadow) opts.shadow = shadow;
                    }

                    slide.addImage(opts);

                    // PPTX images have no line option, so overlay editable vector borders.
                    const imageBorders = buildLineProps(style);
                    if (imageBorders && !Array.isArray(imageBorders)) {
                        const radius = radiusValue(style.borderRadius);
                        const outline = {
                            ...basePos,
                            fill: { color: "FFFFFF", transparency: 100 },
                            line: imageBorders.line,
                        };
                        if (radius >= Math.min(frame.width, frame.height) / 2) {
                            slide.addShape(pres.ShapeType.ellipse, outline);
                        } else if (radius > 0) {
                            outline.rectRadius = pptxRadius(style.borderRadius, frame);
                            slide.addShape(pres.ShapeType.roundRect, outline);
                        } else {
                            slide.addShape(pres.ShapeType.rect, outline);
                        }
                    }
                    drawPerSideBorders(slide, imageBorders, basePos);
                    break;
                }
            }
        }
    }

    const fileName = outputFile || `${process.cwd()}/${OUTPUT_FILE}`;
    const buffer = await pres.write({ outputType: "nodebuffer" });
    if (outputFile) {
        await fs.writeFile(outputFile, buffer);
        return buffer;
    }
    await fs.writeFile(fileName, buffer);
    console.log(`Presentation saved to ${fileName}`);
    return buffer;
}
