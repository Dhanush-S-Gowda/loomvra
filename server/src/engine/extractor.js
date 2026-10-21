export default () => {

    function px(value) {
        if (!value) return 0;

        return parseFloat(String(value).replace("px", "")) || 0;
    }

    function borderRadii(style) {
        return {
            topLeft: px(style.borderTopLeftRadius),
            topRight: px(style.borderTopRightRadius),
            bottomRight: px(style.borderBottomRightRadius),
            bottomLeft: px(style.borderBottomLeftRadius),
        };
    }

    function imageClipRadii(element, imageRect, imageStyle) {
        const ownRadius = borderRadii(imageStyle);
        if (Math.max(...Object.values(ownRadius)) > 0) return ownRadius;
        for (let parent = element.parentElement; parent && parent !== document.querySelector(".slide"); parent = parent.parentElement) {
            const style = window.getComputedStyle(parent);
            if (!/hidden|clip/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) continue;
            const radii = borderRadii(style);
            if (Math.max(...Object.values(radii)) <= 0) continue;
            const rect = parent.getBoundingClientRect();
            const sameFrame = Math.abs(rect.x - imageRect.x) < 1 && Math.abs(rect.y - imageRect.y) < 1 && Math.abs(rect.width - imageRect.width) < 1 && Math.abs(rect.height - imageRect.height) < 1;
            if (sameFrame) return radii;
        }
        return ownRadius;
    }

    function rgbaToHex(color) {
        if (!color) {
            return null;
        }

        if (color === "transparent" || color === "rgba(0, 0, 0, 0)") {
            return null;
        }

        const nums = color.match(/[\d.]+/g);

        if (!nums || nums.length < 3) {
            return null;
        }

        const r = parseInt(nums[0]);
        const g = parseInt(nums[1]);
        const b = parseInt(nums[2]);

        return (
            "#" +
            [r, g, b]
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("")
                .toUpperCase()
        );
    }

    function rgbaToAlpha(color) {
        if (!color) {
            return 1.0;
        }

        if (color === "transparent" || color === "rgba(0, 0, 0, 0)") {
            return 0.0;
        }

        const nums = color.match(/[\d.]+/g);

        if (!nums || nums.length < 4) {
            return 1.0;
        }

        return parseFloat(nums[3]);
    }

    function textRun(text, element) {
        const runStyle = window.getComputedStyle(element);
        return {
            text,
            style: {
                fontFamily: runStyle.fontFamily,
                fontSize: px(runStyle.fontSize),
                fontWeight: parseInt(runStyle.fontWeight) || 400,
                fontStyle: runStyle.fontStyle,
                color: rgbaToHex(runStyle.color),
                colorAlpha: rgbaToAlpha(runStyle.color),
                textDecoration: runStyle.textDecorationLine || runStyle.textDecoration,
                letterSpacing: px(runStyle.letterSpacing),
            },
        };
    }

    function textNodeBounds(node, fallbackRect) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);
        if (!rects.length) return fallbackRect;
        const left = Math.min(...rects.map((rect) => rect.left));
        const top = Math.min(...rects.map((rect) => rect.top));
        const right = Math.max(...rects.map((rect) => rect.right));
        const bottom = Math.max(...rects.map((rect) => rect.bottom));
        return { x: left, y: top, width: right - left, height: bottom - top };
    }

    function glyphImage(text, style, rect, slideRect) {
        if (!rect.width || !rect.height) return null;
        const scale = 3;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(rect.width * scale));
        canvas.height = Math.max(1, Math.ceil(rect.height * scale));
        const context = canvas.getContext("2d");
        context.scale(scale, scale);
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.fillStyle = style.color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, rect.width / 2, rect.height / 2);
        return {
            kind: "image",
            src: canvas.toDataURL("image/png"),
            alt: text,
            frame: {
                x: rect.x - slideRect.x,
                y: rect.y - slideRect.y,
                width: rect.width,
                height: rect.height,
            },
            style: { objectFit: "contain", opacity: parseFloat(style.opacity) || 1, zIndex: getZIndex(style) },
        };
    }

    function splitCssArguments(value) {
        const parts = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < value.length; i += 1) {
            if (value[i] === "(") depth += 1;
            else if (value[i] === ")") depth -= 1;
            else if (value[i] === "," && depth === 0) {
                parts.push(value.slice(start, i).trim());
                start = i + 1;
            }
        }
        parts.push(value.slice(start).trim());
        return parts;
    }

    function gradientDataUrl(backgroundImage, width, height) {
        const match = String(backgroundImage || "").match(/^(linear|radial)-gradient\((.*)\)$/i);
        if (!match) return null;
        const type = match[1].toLowerCase();
        const args = splitCssArguments(match[2]);
        if (args.length < 2) return null;
        let orientation = "";
        if (/^(?:to\s|[-+]?\d*\.?\d+(?:deg|turn|rad)\b|(?:circle|ellipse)\b)/i.test(args[0])) orientation = args.shift();
        const stops = args.map((arg, index) => {
            const stop = arg.match(/^(rgba?\([^)]*\)|#[\da-f]{3,8}|[a-z]+)\s*(-?[\d.]+%)?$/i);
            if (!stop) return null;
            const hex = rgbaToHex(stop[1]);
            if (!hex) return null;
            return `<stop offset="${stop[2] || `${Math.round((index / Math.max(args.length - 1, 1)) * 100)}%`}" stop-color="${hex}" stop-opacity="${rgbaToAlpha(stop[1])}"/>`;
        });
        if (stops.some((stop) => !stop)) return null;
        let gradient;
        if (type === "linear") {
            let x1 = "0%", y1 = "0%", x2 = "0%", y2 = "100%";
            if (/^to\s+right/i.test(orientation)) [x2, y2] = ["100%", "0%"];
            else if (/^to\s+left/i.test(orientation)) [x1, x2, y2] = ["100%", "0%", "0%"];
            else if (/^to\s+top/i.test(orientation)) [y1, y2] = ["100%", "0%"];
            else if (/(-?[\d.]+)deg/i.test(orientation)) {
                const degrees = parseFloat(orientation) * Math.PI / 180;
                const dx = Math.sin(degrees) * 50;
                const dy = -Math.cos(degrees) * 50;
                x1 = `${50 - dx}%`; y1 = `${50 - dy}%`; x2 = `${50 + dx}%`; y2 = `${50 + dy}%`;
            }
            gradient = `<linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.join("")}</linearGradient>`;
        } else {
            gradient = `<radialGradient id="g" cx="50%" cy="50%" r="70%">${stops.join("")}</radialGradient>`;
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${gradient}</defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    }

    function backgroundImageElement(style, rect, slideRect, zIndex) {
        if (!style.backgroundImage || style.backgroundImage === "none") return [];
        const layers = splitCssArguments(style.backgroundImage);
        const sizes = splitCssArguments(style.backgroundSize || "auto");
        const positions = splitCssArguments(style.backgroundPosition || "0% 0%");
        const repeats = splitCssArguments(style.backgroundRepeat || "repeat");
        return layers.map((layer, index) => {
            const data = gradientDataUrl(layer, rect.width, rect.height);
            const url = layer.match(/url\(["']?(.*?)["']?\)/i)?.[1];
            const src = data || url;
            if (!src) return null;
            const size = sizes[index % sizes.length].trim();
            const objectFit = size === "cover"
                ? "cover"
                : size === "contain" || size === "auto"
                    ? "contain"
                    : "fill";
            return {
                kind: "image",
                src,
                alt: "CSS background image",
                frame: {
                    x: rect.x - slideRect.x,
                    y: rect.y - slideRect.y,
                    width: rect.width,
                    height: rect.height,
                },
                style: {
                    objectFit,
                    objectPosition: positions[index % positions.length],
                    backgroundRepeat: repeats[index % repeats.length],
                    backgroundLayer: layers.length - index,
                    borderRadius: borderRadii(style),
                    opacity: parseFloat(style.opacity) || 1,
                    zIndex,
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderTopAlpha: rgbaToAlpha(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderRightAlpha: rgbaToAlpha(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderBottomAlpha: rgbaToAlpha(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
                    borderLeftAlpha: rgbaToAlpha(style.borderLeftColor),
                    borderTopStyle: style.borderTopStyle,
                    borderRightStyle: style.borderRightStyle,
                    borderBottomStyle: style.borderBottomStyle,
                    borderLeftStyle: style.borderLeftStyle,
                },
            };
        }).filter(Boolean).reverse();
    }

    function textRunWithEmojiImages(node, owner, slideRect) {
        const original = node.textContent;
        const style = window.getComputedStyle(node.parentElement || owner);
        if (typeof Intl.Segmenter !== "function") return textRun(original, node.parentElement || owner);
        const segments = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(original)];
        let output = "";
        let previousTop = null;
        for (const part of segments) {
            const glyph = part.segment;
            if (/^\s+$/u.test(glyph)) {
                if (output && !output.endsWith(" ") && !output.endsWith("\n")) output += " ";
                continue;
            }
            const range = document.createRange();
            range.setStart(node, part.index);
            range.setEnd(node, part.index + glyph.length);
            const rect = range.getBoundingClientRect();
            if (previousTop !== null && rect.height && Math.abs(rect.top - previousTop) > 1) output += "\n";
            if (rect.height) previousTop = rect.top;

            if (!/\p{Extended_Pictographic}/u.test(glyph)) {
                output += glyph;
                continue;
            }
            const glyphStyle = {
                fontStyle: style.fontStyle,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                color: style.color,
                opacity: style.opacity,
            };
            const image = glyphImage(glyph, glyphStyle, rect, slideRect);
            if (image) scene.slides[0].elements.push(image);
            // Replace the font-dependent emoji with an em space of roughly the
            // same advance. The glyph itself is preserved as a transparent PNG.
            const emSpaces = Math.max(1, Math.round(rect.width / Math.max(parseFloat(style.fontSize), 1)));
            output += "\u2003".repeat(emSpaces);
        }
        const normalized = output
            .split("\n")
            .map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim())
            .join("\n")
            .trim();
        const trailingInlineSpace = /[ \t]+$/.test(original) && !/[\r\n]/.test(original);
        const renderedText = trailingInlineSpace ? `${normalized} ` : normalized;
        const bounds = document.createRange();
        bounds.selectNodeContents(node);
        return { ...textRun(renderedText, node.parentElement || owner), lineTop: bounds.getBoundingClientRect().top };
    }

    function getZIndex(style) {
        if (style.zIndex === "auto" || style.zIndex === "") {
            return 0;
        }

        const z = parseInt(style.zIndex);

        return isNaN(z) ? 0 : z;
    }

    function isVisible(rect, style) {
        return !(
            rect.width <= 0 ||
            rect.height <= 0 ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            parseFloat(style.opacity) === 0
        );
    }

    function isTextTag(tag) {
        return ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "li"].includes(
            tag,
        );
    }

    function hasVisualBackground(style) {
        return (
            style.backgroundColor &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
            style.backgroundColor !== "transparent"
        );
    }

    function svgDataUrl(svg) {
        const clone = svg.cloneNode(true);
        const nodes = [clone, ...clone.querySelectorAll("*")];
        for (const node of nodes) {
            const computed = window.getComputedStyle(node);
            for (const property of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "display", "visibility"]) {
                const value = computed.getPropertyValue(property);
                if (value && value !== "initial" && value !== "normal") node.style.setProperty(property, value);
            }
        }
        if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${svg.clientWidth || 24} ${svg.clientHeight || 24}`);
        const markup = new XMLSerializer().serializeToString(clone);
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
    }

    function pseudoGlyph(element, pseudo) {
        const pseudoStyle = window.getComputedStyle(element, pseudo);
        const value = pseudoStyle.content;
        if (!value || value === "none" || value === "normal") return null;
        const quoted = value.length >= 2 && value[0] === value[value.length - 1]
            ? value.slice(1, -1)
            : value;
        const text = quoted
            .replace(/\\([\da-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
            .replace(/\\(.)/g, "$1");
        if (!text.trim()) return null;
        return { text, style: pseudoStyle };
    }

    // =====================================
    // ROOT SLIDE
    // =====================================

    const slide = document.querySelector(".slide");

    if (!slide) {
        throw new Error("Missing .slide root element");
    }

    const slideStyle = window.getComputedStyle(slide);

    const slideRect = slide.getBoundingClientRect();

    const scene = {
        slides: [
            {
                background: rgbaToHex(slideStyle.backgroundColor) || "#FFFFFF",

                width: slideRect.width,
                height: slideRect.height,

                elements: [],
            },
        ],
    };

    // The root canvas background is painted behind all child elements and
    // must be emitted explicitly because querySelectorAll excludes the root.
    const rootBackground = backgroundImageElement(slideStyle, slideRect, slideRect, Number.MIN_SAFE_INTEGER);
    scene.slides[0].elements.push(...rootBackground);

    const elements = Array.from(slide.querySelectorAll("*"));

    // =====================================
    // EXTRACT VISUAL ELEMENTS
    // =====================================

    elements.forEach((el) => {
        const tag = el.tagName.toLowerCase();

        const style = window.getComputedStyle(el);

        const rect = el.getBoundingClientRect();

        if (!isVisible(rect, style)) {
            return;
        }

        // ---------------------------------
        // Relative to slide
        // ---------------------------------

        const x = rect.x - slideRect.x;

        const y = rect.y - slideRect.y;

        // =================================
        // INLINE SVG ICON / VECTOR IMAGE
        // =================================

        if (tag === "svg") {
            scene.slides[0].elements.push({
                kind: "image",
                src: svgDataUrl(el),
                alt: el.getAttribute("aria-label") || el.getAttribute("title") || "",
                href: el.closest("a")?.href || "",
                frame: { x, y, width: rect.width, height: rect.height },
                style: {
                    objectFit: "contain",
                    objectPosition: "50% 50%",
                    opacity: parseFloat(style.opacity),
                    borderRadius: borderRadii(style),
                    zIndex: getZIndex(style),
                },
            });
            return;
        }

        // Icon fonts commonly render their glyph through ::before/::after.
        if (["i", "span", "div"].includes(tag)) {
            const glyph = pseudoGlyph(el, "::before") || pseudoGlyph(el, "::after");
            if (glyph) {
                const glyphStyle = {
                    fontStyle: glyph.style.fontStyle,
                    fontWeight: glyph.style.fontWeight,
                    fontSize: glyph.style.fontSize,
                    fontFamily: glyph.style.fontFamily,
                    color: glyph.style.color,
                    opacity: glyph.style.opacity,
                };
                const image = glyphImage(glyph.text, glyphStyle, rect, slideRect);
                if (image) scene.slides[0].elements.push(image);
                if (tag === "i") return;
            }
        }

        // =================================
        // IMAGE
        // =================================

        if (tag === "img") {
            scene.slides[0].elements.push({
                kind: "image",

                src: el.src,
                alt: el.alt || "",
                href: el.closest("a")?.href || "",

                frame: {
                    x,
                    y,
                    width: rect.width,
                    height: rect.height,
                },

                style: {
                    borderRadius: imageClipRadii(el, rect, style),
                    objectFit: style.objectFit,
                    objectPosition: style.objectPosition,
                    rotate: 0,

                    // Border properties (all sides)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderTopAlpha: rgbaToAlpha(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderRightAlpha: rgbaToAlpha(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderBottomAlpha: rgbaToAlpha(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
                    borderLeftAlpha: rgbaToAlpha(style.borderLeftColor),
                    borderTopStyle: style.borderTopStyle,
                    borderRightStyle: style.borderRightStyle,
                    borderBottomStyle: style.borderBottomStyle,
                    borderLeftStyle: style.borderLeftStyle,
                    boxShadow:
                        style.boxShadow !== "none" ? style.boxShadow : null,
                    opacity: parseFloat(style.opacity),
                    zIndex: getZIndex(style),
                },
            });

            return;
        }

        // =================================
        // TEXT
        // =================================

        const ownTextNodes = Array.from(el.childNodes).filter(
            (node) =>
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.length > 0,
        );

        const extractedRuns = ownTextNodes.map((node) =>
            textRunWithEmojiImages(node, el, slideRect),
        );
        for (let i = 0; i < extractedRuns.length - 1; i += 1) {
            if (extractedRuns[i + 1].lineTop > extractedRuns[i].lineTop + 1) {
                extractedRuns[i].breakLine = true;
            }
        }
        const ownText = extractedRuns.map((run) => run.text).join("");

        const hasDirectText = ownText.length > 0;

        const childrenContainText = Array.from(el.children).some((child) => {
            const childText = child.innerText && child.innerText.trim();
            return !!childText;
        });

        if (hasDirectText) {
            let frameRect = rect;
            let containerDisplay = null;
            let containerJustifyContent = null;
            let containerAlignItems = null;
            let containerTextAlign = null;

            if (tag === "a" && el.parentElement) {
                const parentStyle = window.getComputedStyle(el.parentElement);

                const parentHasVisualStyle =
                    hasVisualBackground(parentStyle) ||
                    px(parentStyle.borderTopWidth) > 0 ||
                    px(parentStyle.borderRightWidth) > 0 ||
                    px(parentStyle.borderBottomWidth) > 0 ||
                    px(parentStyle.borderLeftWidth) > 0 ||
                    px(parentStyle.paddingTop) > 0 ||
                    px(parentStyle.paddingRight) > 0 ||
                    px(parentStyle.paddingBottom) > 0 ||
                    px(parentStyle.paddingLeft) > 0 ||
                    ["flex", "inline-flex", "inline-block"].includes(
                        parentStyle.display,
                    );

                if (parentHasVisualStyle) {
                    frameRect = el.parentElement.getBoundingClientRect();

                    containerDisplay = parentStyle.display;
                    containerJustifyContent = parentStyle.justifyContent;
                    containerAlignItems = parentStyle.alignItems;
                    containerTextAlign = parentStyle.textAlign;
                }
            }

            const textObj = {
                kind: "text",

                text: ownText,
                runs: extractedRuns,

                frame: {
                    x: frameRect.x - slideRect.x,
                    y: frameRect.y - slideRect.y,
                    width: frameRect.width,
                    height: frameRect.height,
                },

                style: {
                    // Typography
                    fontFamily: style.fontFamily,
                    fontSize: px(style.fontSize),
                    fontWeight: parseInt(style.fontWeight) || 400,
                    fontStyle: style.fontStyle,
                    lineHeight: px(style.lineHeight),
                    letterSpacing: px(style.letterSpacing),
                    textDecoration: style.textDecoration,
                    textDecorationLine: style.textDecorationLine || style.textDecoration,
                    textTransform: style.textTransform,
                    textIndent: px(style.textIndent),
                    wordSpacing: px(style.wordSpacing),
                    textAlignLast: style.textAlignLast,
                    direction: style.direction,
                    verticalAlign: style.verticalAlign,
                    whiteSpace: style.whiteSpace,
                    wordBreak: style.wordBreak,
                    overflowWrap: style.overflowWrap,
                    textOverflow: style.textOverflow,
                    writingMode: style.writingMode,
                    fontVariant: style.fontVariant,
                    fontStretch: style.fontStretch,
                    lineHeightValue: style.lineHeight,
                    color: rgbaToHex(style.color),
                    colorAlpha: rgbaToAlpha(style.color),
                    textAlign: style.textAlign,
                    // Visual properties
                    background: rgbaToHex(style.backgroundColor),
                    backgroundAlpha: rgbaToAlpha(style.backgroundColor),
                    backgroundImage: style.backgroundImage !== "none" ? style.backgroundImage : null,
                    backgroundSize: style.backgroundSize,
                    backgroundPosition: style.backgroundPosition,
                    backgroundRepeat: style.backgroundRepeat,
                    backgroundBlendMode: style.backgroundBlendMode,
                    opacity: parseFloat(style.opacity),
                    // Border properties (all sides individually)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderTopAlpha: rgbaToAlpha(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderRightAlpha: rgbaToAlpha(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderBottomAlpha: rgbaToAlpha(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
                    borderLeftAlpha: rgbaToAlpha(style.borderLeftColor),
                    borderTopStyle: style.borderTopStyle,
                    borderRightStyle: style.borderRightStyle,
                    borderBottomStyle: style.borderBottomStyle,
                    borderLeftStyle: style.borderLeftStyle,
                    // Radius and shadow
                    borderRadius: borderRadii(style),
                    boxShadow:
                        style.boxShadow && style.boxShadow !== "none"
                            ? style.boxShadow
                            : null,
                    // Spacing
                    paddingTop: px(style.paddingTop),
                    paddingRight: px(style.paddingRight),
                    paddingBottom: px(style.paddingBottom),
                    paddingLeft: px(style.paddingLeft),
                    marginTop: px(style.marginTop),
                    marginRight: px(style.marginRight),
                    marginBottom: px(style.marginBottom),
                    marginLeft: px(style.marginLeft),
                    // Layout
                    display: style.display,
                    containerDisplay: containerDisplay,
                    containerJustifyContent: containerJustifyContent,
                    containerAlignItems: containerAlignItems,
                    containerTextAlign: containerTextAlign,
                    flexDirection: style.flexDirection,
                    justifyContent: style.justifyContent,
                    alignItems: style.alignItems,
                    flexDirection: style.flexDirection,
                    justifyContent: style.justifyContent,
                    alignItems: style.alignItems,
                    zIndex: getZIndex(style),
                },
            };

            // Extract href if element is <a> tag
            if (tag === "a") {
                textObj.href = el.href || "";
            }

            const textBackground = backgroundImageElement(style, frameRect, slideRect, getZIndex(style));
            if (childrenContainText) {
                // Mixed content (for example, text with inline <strong>/<em>
                // nodes) has direct text between child elements. Export each
                // direct text node at its Chromium-measured bounds so no words
                // disappear and inline children keep their own styles.
                const parentHasVisualStyle = hasVisualBackground(style) ||
                    textObj.style.backgroundImage ||
                    textObj.style.borderTopWidth || textObj.style.borderRightWidth ||
                    textObj.style.borderBottomWidth || textObj.style.borderLeftWidth ||
                    textObj.style.boxShadow;
                if (parentHasVisualStyle) {
                    scene.slides[0].elements.push({
                        kind: "shape",
                        frame: { x, y, width: rect.width, height: rect.height },
                        style: textObj.style,
                    });
                }
                scene.slides[0].elements.push(...textBackground);
                ownTextNodes.forEach((node, index) => {
                    const bounds = textNodeBounds(node, rect);
                    const run = extractedRuns[index];
                    const nodeStyle = {
                        ...textObj.style,
                        background: null,
                        backgroundImage: null,
                        borderTopWidth: 0,
                        borderRightWidth: 0,
                        borderBottomWidth: 0,
                        borderLeftWidth: 0,
                        boxShadow: null,
                        paddingTop: 0,
                        paddingRight: 0,
                        paddingBottom: 0,
                        paddingLeft: 0,
                        textAlign: "left",
                    };
                    scene.slides[0].elements.push({
                        ...textObj,
                        text: run.text,
                        runs: [run],
                        frame: {
                            x: bounds.x - slideRect.x,
                            y: bounds.y - slideRect.y,
                            width: bounds.width,
                            height: bounds.height,
                        },
                        style: nodeStyle,
                    });
                });
            } else {
                scene.slides[0].elements.push(...textBackground);
                scene.slides[0].elements.push(textObj);
            }

            return;
        }

        // =================================
        // SHAPE
        // =================================

        const hasBackground = hasVisualBackground(style);
        const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== "none";

        const hasBorder =
            px(style.borderTopWidth) > 0 ||
            px(style.borderRightWidth) > 0 ||
            px(style.borderBottomWidth) > 0 ||
            px(style.borderLeftWidth) > 0;

        const hasShadow =
            style.boxShadow !== null &&
            style.boxShadow !== "none" &&
            style.boxShadow !== "";

        const meaningfulShape = hasBackground || hasBackgroundImage || hasBorder || hasShadow;

        if (meaningfulShape) {
            scene.slides[0].elements.push({
                kind: "shape",

                frame: {
                    x,
                    y,
                    width: rect.width,
                    height: rect.height,
                },

                style: {
                    background: rgbaToHex(style.backgroundColor),
                    backgroundAlpha: rgbaToAlpha(style.backgroundColor),
                    backgroundImage: style.backgroundImage !== "none" ? style.backgroundImage : null,
                    backgroundSize: style.backgroundSize,
                    backgroundPosition: style.backgroundPosition,
                    backgroundRepeat: style.backgroundRepeat,
                    backgroundBlendMode: style.backgroundBlendMode,
                    borderRadius: borderRadii(style),
                    // Border properties (all sides individually)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderTopAlpha: rgbaToAlpha(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderRightAlpha: rgbaToAlpha(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderBottomAlpha: rgbaToAlpha(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
                    borderLeftAlpha: rgbaToAlpha(style.borderLeftColor),
                    borderTopStyle: style.borderTopStyle,
                    borderRightStyle: style.borderRightStyle,
                    borderBottomStyle: style.borderBottomStyle,
                    borderLeftStyle: style.borderLeftStyle,
                    boxShadow:
                        style.boxShadow && style.boxShadow !== "none"
                            ? style.boxShadow
                            : null,
                    // Spacing
                    paddingTop: px(style.paddingTop),
                    paddingRight: px(style.paddingRight),
                    paddingBottom: px(style.paddingBottom),
                    paddingLeft: px(style.paddingLeft),
                    marginTop: px(style.marginTop),
                    marginRight: px(style.marginRight),
                    marginBottom: px(style.marginBottom),
                    marginLeft: px(style.marginLeft),
                    opacity: parseFloat(style.opacity),
                    overflow: style.overflow,
                    clipPath: style.clipPath !== "none" ? style.clipPath : null,
                    transform: style.transform !== "none" ? style.transform : null,
                    transformOrigin: style.transformOrigin,
                    filter: style.filter !== "none" ? style.filter : null,
                    mixBlendMode: style.mixBlendMode,
                    zIndex: getZIndex(style),                },
            });
            const backgroundImage = backgroundImageElement(style, rect, slideRect, getZIndex(style));
            scene.slides[0].elements.push(...backgroundImage);
        }
    });

    // =====================================
    // SORT BY Z INDEX
    // =====================================

    scene.slides[0].elements.sort(
        (a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0),
    );

    return scene;
};
