import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.resolve(__dirname, "../../Images");

/**
 * S3-like storage manager for images stored in the local Images directory.
 * Provides put, get, getUrl, and delete operations.
 */
const StorageMng = {
    /**
     * Save a file to the Images directory.
     * @param {string} filename - The name of the file (e.g., "image-123.jpg")
     * @param {Buffer|string} data - The file content as Buffer or base64 string
     * @returns {Promise<string>} The filename that was saved
     */
    async put(filename, data) {
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        const filePath = path.join(IMAGES_DIR, filename);
        await fs.writeFile(filePath, data);
        return filename;
    },

    /**
     * Get the local file system path for an image.
     * @param {string} filename
     * @returns {Promise<string>} Absolute path to the file
     */
    async get(filename) {
        const filePath = path.join(IMAGES_DIR, filename);
        await fs.access(filePath);
        return filePath;
    },

    /**
     * Get the URL path for an image (to be served via express static).
     * @param {string} filename
     * @returns {string} URL path like "/images/filename"
     */
    getUrl(filename) {
        return `/images/${filename}`;
    },

    /**
     * Delete an image from the Images directory.
     * @param {string} filename
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
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