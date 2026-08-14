const BASE_URL = "http://localhost:3000";
export const API_BASE_URL = BASE_URL;

// Design plans created before the server URL fix may contain a frontend-origin
// image URL (localhost:5173/images/...). Always resolve local image paths to
// the API server, which owns the /images static route.
export function resolveImageUrl(src) {
  if (typeof src !== "string" || !src) return src;
  try {
    const url = new URL(src, window.location.origin);
    if (url.pathname.startsWith("/images/")) {
      return `${API_BASE_URL}${url.pathname}${url.search}`;
    }
    return src;
  } catch {
    return src;
  }
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response body (e.g. empty or HTML error page).
      data = null;
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

/** GET /all-projects?page=&pageSize= */
export function getAllProjects(page = 1, pageSize = 50) {
  return request(`/all-projects?page=${page}&pageSize=${pageSize}`);
}

/** POST /create-project */
export function createProject(name, userDesc) {
  return request("/create-project", {
    method: "POST",
    body: JSON.stringify({ name, userDesc }),
  });
}

/** Download a generated project export. */
export async function downloadProjectExport(id, format) {
  const response = await fetch(`${API_BASE_URL}/project/${id}/export/${format}`);
  if (!response.ok) {
    let message = `Export failed (${response.status})`;
    try {
      message = (await response.json()).error || message;
    } catch {
      // Keep the status-based fallback when the server did not return JSON.
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `presentation.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** GET /project/:id */
export function getProject(id) {
  return request(`/project/${id}`);
}

/** PATCH /project/:id */
export function updateProject(id, body) {
  return request(`/project/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** PATCH /project/:id/title */
export function renameProject(id, title) {
  return request(`/project/${id}/title`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

/** DELETE /project/:id */
export function deleteProject(id) {
  return request(`/project/${id}`, { method: "DELETE" });
}

/** POST /retry-design */
export function retryDesign(projectId) {
  return request("/retry-design", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

/** POST /retry-slides/:id */
export function retrySlides(projectId) {
  return request(`/retry-slides/${projectId}`, { method: "POST" });
}


/** POST /start-crafting/:id */
export function startCrafting(id) {
  return request(`/start-crafting/${id}`, { method: "POST" });
}

/** GET /models */
export function getModels() {
  return request("/models");
}

/** GET /settings */
export function getSettings() {
  return request("/settings");
}

/** PATCH /settings */
export function updateSettings(body) {
  return request("/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** POST /settings/verify/openrouter */
export function verifyOpenRouterKey(apiKey) {
  return request("/settings/verify/openrouter", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

/** POST /settings/verify/pexels */
export function verifyPexelsKey(apiKey) {
  return request("/settings/verify/pexels", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}
