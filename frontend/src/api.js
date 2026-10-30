const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://mitra-backend-cj81.onrender.com"
).replace(/\/+$/, "");

export default API_BASE_URL;

function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}/api${normalizedPath}`;
}

async function request(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP error: ${response.status}`);
  }

  return response.json();
}

export async function checkHealth() {
  return request("/health");
}

export async function getConversations() {
  return request("/conversations");
}

export async function getMessages(conversationId) {
  return request(`/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId, message) {
  return request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/documents/upload", {
    method: "POST",
    body: formData,
  });
}
