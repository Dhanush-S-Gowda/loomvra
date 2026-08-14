import { chromium } from "playwright";
import renderSlide from "./slideRenderer.js";

const WIDTH = 1280;
const HEIGHT = 720;

function overlap(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

/** Render the actual slide and reject geometry defects that HTML validation cannot see. */
export async function assertRenderedSlide(slide, slideNumber) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await page.setContent(renderSlide(slide, slideNumber), { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => {
      const root = document.querySelector(".slide");
      if (!root) return { errors: ["Missing .slide root element."] };
      const rootRect = root.getBoundingClientRect();
      const nodes = [...root.querySelectorAll(".slide-content > *, .slide-header > *, .slide-footer > *")]
        .filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            label: `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(/\s+/)[0]}` : ""}`,
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            position: style.position,
            text: (el.textContent || "").trim().slice(0, 40),
          };
        });
      const errors = [];
      for (const node of nodes) {
        if (node.rect.left < rootRect.left - 1 || node.rect.top < rootRect.top - 1 || node.rect.right > rootRect.right + 1 || node.rect.bottom > rootRect.bottom + 1) {
          errors.push(`${node.label} is outside the slide canvas`);
        }
      }
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]; const b = nodes[j];
          if (a.position === "absolute" || b.position === "absolute") continue;
          const area = overlap(a.rect, b.rect);
          const smaller = Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
          if (area > 4 && area / smaller > 0.15) errors.push(`${a.label} overlaps ${b.label}`);
        }
      }
      return { errors };
    });
    if (result.errors.length) throw new Error(`Rendered layout validation failed: ${result.errors.slice(0, 3).join("; ")}`);
    return slide;
  } finally {
    await browser.close();
  }
}

export default assertRenderedSlide;
