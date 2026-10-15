export default () => {
    // =====================================
    // HELPERS
    // =====================================

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
                scene.slides[0].elements.push({
                    kind: "text",
                    text: glyph.text,
                    frame: { x, y, width: rect.width, height: rect.height },
                    style: {
                        fontFamily: glyph.style.fontFamily,
                        fontSize: px(glyph.style.fontSize),
                        fontWeight: parseInt(glyph.style.fontWeight) || 400,
                        fontStyle: glyph.style.fontStyle,
                        color: rgbaToHex(glyph.style.color),
                        textAlign: "center",
                        lineHeight: px(glyph.style.lineHeight),
                        opacity: parseFloat(glyph.style.opacity),
                        whiteSpace: "nowrap",
                        paddingTop: 0,
                        paddingRight: 0,
                        paddingBottom: 0,
                        paddingLeft: 0,
                        zIndex: getZIndex(style),
                    },
                });
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
                    borderRadius: borderRadii(style),
                    objectFit: style.objectFit,
                    objectPosition: style.objectPosition,
                    rotate: 0,

                    // Border properties (all sides)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
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
                node.textContent.trim().length > 0,
        );

        const ownText = ownTextNodes
            .map((node) => node.textContent.trim())
            .join(" ");

        const hasDirectText = ownText.length > 0;

        const childrenContainText = Array.from(el.children).some((child) => {
            const childText = child.innerText && child.innerText.trim();

            return !!childText;
        });

        /*
                    IMPORTANT:

                    Extract text only if:
                    - element has direct text
                    - children do NOT contain text

                    This prevents:
                    - duplicated parent text
                    - giant merged text blobs
                    */

        if (hasDirectText && !childrenContainText) {
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
                    textTransform: style.textTransform,
                    verticalAlign: style.verticalAlign,
                    whiteSpace: style.whiteSpace,
                    wordBreak: style.wordBreak,
                    color: rgbaToHex(style.color),
                    textAlign: style.textAlign,
                    // Visual properties
                    background: rgbaToHex(style.backgroundColor),
                    backgroundAlpha: rgbaToAlpha(style.backgroundColor),
                    opacity: parseFloat(style.opacity),
                    // Border properties (all sides individually)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
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

            scene.slides[0].elements.push(textObj);

            return;
        }

        // =================================
        // SHAPE
        // =================================

        const hasBackground = hasVisualBackground(style);

        const hasBorder =
            px(style.borderTopWidth) > 0 ||
            px(style.borderRightWidth) > 0 ||
            px(style.borderBottomWidth) > 0 ||
            px(style.borderLeftWidth) > 0;

        const hasShadow =
            style.boxShadow !== null &&
            style.boxShadow !== "none" &&
            style.boxShadow !== "";

        const meaningfulShape = hasBackground || hasBorder || hasShadow;

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
                    borderRadius: borderRadii(style),
                    // Border properties (all sides individually)
                    borderTopWidth: px(style.borderTopWidth),
                    borderRightWidth: px(style.borderRightWidth),
                    borderBottomWidth: px(style.borderBottomWidth),
                    borderLeftWidth: px(style.borderLeftWidth),
                    borderTopColor: rgbaToHex(style.borderTopColor),
                    borderRightColor: rgbaToHex(style.borderRightColor),
                    borderBottomColor: rgbaToHex(style.borderBottomColor),
                    borderLeftColor: rgbaToHex(style.borderLeftColor),
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
                    zIndex: getZIndex(style),                },
            });
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
