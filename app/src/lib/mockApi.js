import { getProject } from "./api";

/**
 * Fetch project data from the real backend.
 * Returns the JSON response from GET /project/:id.
 */
export function fetchProjectAPI(projectId) {
  return getProject(projectId);
}