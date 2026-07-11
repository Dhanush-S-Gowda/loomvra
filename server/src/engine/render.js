import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";
import extractor from "./extractor.js";

const HTML_FILE = "slide.html";
const OUTPUT_JSON = "scene_graph.json";
const OUTPUT_SCREENSHOT = "slide_screenshot.png";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;

async function generateSceneGraph() {
    const browser = await chromium.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage({
            viewport: {
                width: VIEWPORT_WIDTH,
                height: VIEWPORT_HEIGHT,
            },
        });

        const htmlPath = path.resolve(HTML_FILE);

        await page.goto(`file://${htmlPath}`, {
            waitUntil: "networkidle",
        });

        await page.screenshot({
            path: OUTPUT_SCREENSHOT,
        });

        const sceneGraph = await page.evaluate(extractor);

        await fs.writeFile(
            OUTPUT_JSON,
            JSON.stringify(sceneGraph, null, 2),
            "utf8",
        );

        console.log("Scene graph saved.");
    } finally {
        await browser.close();
    }
}

generateSceneGraph().catch(console.error);
