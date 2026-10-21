import { getProject } from "./api";

export function fetchProjectAPI(projectId) {
  return getProject(projectId);
}
