import crypto from "crypto";
import path from "path";
import { chromium } from "playwright";
import { getProject, getSlidesByProject } from "../storage/db.js";
import { processSlide, renderSlide } from "../pipeline/index.js";
import StorageMng from "./StorageMng.js";
import extractor from "../engine/extractor.js";
import { generatePresentation } from "../engine/ppt.js";

const WIDTH = 1280;
const HEIGHT = 720;
const DATA_URL = /^data:([^;,]+)(?:;[^,]*)?,([\s\S]+)$/i;

function extension(url) {
  try {
    const value = path.extname(new URL(url).pathname).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(value) ? value : ".bin";
  } catch {
    return ".bin";
  }
}

async function localAsset(url, projectId) {
  if (!url || DATA_URL.test(url)) return url;
  let filename = path.basename(url.split("?")[0]);
  if (url.startsWith("/images/") || url.includes("/images/")) {
    filename = decodeURIComponent(url.split("/images/").pop().split("?")[0]);
  } else {
    filename = `export-${projectId}-${crypto.createHash("sha1").update(url).digest("hex")}${extension(url)}`;
    await StorageMng.download(url, filename);
  }
  const data = await StorageMng.read(filename);
  const mime = filename.endsWith(".svg") ? "image/svg+xml" : filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? "image/jpeg" : filename.endsWith(".webp") ? "image/webp" : "image/png";
  return `data:${mime};base64,${data.toString("base64")}`;
}

async function materializeAssets(html, projectId) {
  const replacements = [];
  const pattern = /(\bsrc=["'])([^"']+)(["'])/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const url = match[2];
    if (/^(?:https?:|\/images\/|data:image\/)/i.test(url) && !/^data:/i.test(url)) {
      replacements.push({ start: match.index + match[1].length, end: match.index + match[1].length + url.length, url });
    }
  }
  let output = html;
  for (const item of replacements.reverse()) {
    output = `${output.slice(0, item.start)}${await localAsset(item.url, projectId)}${output.slice(item.end)}`;
  }
  const cssUrls = [...output.matchAll(/url\((['"]?)(https?:[^)'"\s]+|\/images\/[^)'"\s]+)\1\)/gi)];
  for (const match of cssUrls.reverse()) {
    const replacement = await localAsset(match[2], projectId);
    output = `${output.slice(0, match.index)}url(${replacement})${output.slice(match.index + match[0].length)}`;
  }
  return output;
}

async function buildSlides(projectId) {
  const project = getProject(projectId);
  if (!project || project.slides_state !== "completed") {
    throw new Error("Slides are not ready for export.");
  }
  return Promise.all(getSlidesByProject(projectId).map(async (row) => {
    const slide = processSlide(JSON.parse(row.html_content));
    const document = await materializeAssets(renderSlide(slide, row.seq_num), projectId);
    return { number: row.seq_num, document };
  }));
}

export async function exportPdf(projectId) {
  const slides = await buildSlides(projectId);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    const bodies = slides.map(({ document }) => document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "").join('<div class="export-break"></div>');
    const styles = slides.map(({ document }) => (document.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
      .map((tag) => tag.replace(/^<style[^>]*>|<\/style>$/gi, ""))
      .join("\n")).join("\n");
    await page.setContent(`<!doctype html><html><head><style>@page{size:13.333in 7.5in;margin:0}html,body{margin:0;padding:0;width:13.333in;background:white}.export-break{break-after:page;page-break-after:always} ${styles}</style></head><body>${bodies}</body></html>`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);
    const pdf = await page.pdf({ width: "13.333in", height: "7.5in", printBackground: true, preferCSSPageSize: false, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
    return pdf;
  } finally {
    await browser.close();
  }
}

export async function exportPptx(projectId) {
  const slides = await buildSlides(projectId);
  const browser = await chromium.launch({ headless: true });
  try {
    const scene = { slides: [] };
    for (const { document, number } of slides) {
      const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
      await page.setContent(document, { waitUntil: "load" });
      await page.evaluate(() => document.fonts?.ready);
      scene.slides.push({ ...(await page.evaluate(extractor)).slides[0], number });
      await page.close();
    }
    return generatePresentation(scene);
  } finally {
    await browser.close();
  }
}
