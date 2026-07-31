const BASE_URL = "http://localhost:3000";

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
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

/** POST /start-crafting/:id */
export function startCrafting(id) {
  return request(`/start-crafting/${id}`, { method: "POST" });
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
