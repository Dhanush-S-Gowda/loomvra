import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.resolve(__dirname, "../../Images");
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ||
    `http://localhost:3000`).replace(/\/$/, "");

const StorageMng = {
    async put(filename, data) {
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        const safeFilename = path.basename(filename);
        const filePath = path.join(IMAGES_DIR, safeFilename);
        await fs.writeFile(filePath, data);
        return safeFilename;
    },

    async get(filename) {
        const filePath = path.join(IMAGES_DIR, path.basename(filename));
        await fs.access(filePath);
        return filePath;
    },

    async download(url, filename) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        return this.put(filename, buffer);
    },

    async read(filename) {
        return fs.readFile(await this.get(filename));
    },

    getUrl(filename) {
        const safeFilename = path.basename(filename);
        return `${PUBLIC_BASE_URL}/images/${encodeURIComponent(safeFilename)}`;
    },

    async delete(filename) {
        const filePath = path.join(IMAGES_DIR, filename);
        try {
            await fs.unlink(filePath);
            return true;
        } catch {
            return false;
        }
    }
};

export default StorageMng;
