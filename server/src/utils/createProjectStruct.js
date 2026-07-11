import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export default async function createProjectStruct(project_id) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectPath = path.resolve(__dirname,"../../projects", project_id);
    const masterPath = path.join(projectPath, "master");
    const slidesPath = path.join(projectPath, "slides");
    const sceneGraphsPath = path.join(projectPath, "scene_graphs");
    const assetsPath = path.join(projectPath, "assets");
    const manifestTemplatePath = path.join(__dirname, "../templates/manifest.json");
    const htmlTemplatePath = path.join(__dirname, "../templates/master.html");
    const cssTemplatePath = path.join(__dirname, "../templates/index.css");
    try {
        await fs.mkdir(projectPath, { recursive: true });
        await fs.mkdir(masterPath);
        await fs.mkdir(slidesPath);
        await fs.mkdir(sceneGraphsPath);
        await fs.mkdir(assetsPath);

        await fs.copyFile(manifestTemplatePath, path.join(projectPath, "manifest.json"));
        await fs.copyFile(htmlTemplatePath, path.join(masterPath, "master.html"));
        await fs.copyFile(cssTemplatePath, path.join(masterPath, "index.css"));

        return {
            success: true,
            projectPath
        }
    } catch (error) {
        await fs.rm(projectPath, {
            recursive: true,
            force: true,
        });
        switch (error.code) {
            case "EEXIST":
                throw new Error(`Project ${project_id} already exists`);
            case "ENOENT":
                throw new Error(`Template file not found. Missing ${error.path}`);
            case "EPERM":
            case "EACCES":
                throw new Error(`Access denied. Missing permissions for ${error.path}`);
            default:
                throw error;
        }

    }
  }
