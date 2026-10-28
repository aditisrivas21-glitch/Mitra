// Thin wrapper around fetch(). Every backend call goes through request(), so error handling
// (network down, validation errors, server errors) is written once and shown the same way everywhere.
const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, options)
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => d.msg).join('; ')
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail)
  }
  return res.status === 204 ? null : res.json()
}

const jsonBody = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const getHealth = () => request('/health')
export const listConversations = () => request('/conversations')
export const createConversation = () => request('/conversations', jsonBody('POST', {}))
export const getConversation = (id) => request(`/conversations/${id}`)
export const deleteConversation = (id) => request(`/conversations/${id}`, { method: 'DELETE' })
export const sendMessage = (id, content) =>
  request(`/conversations/${id}/messages`, jsonBody('POST', { content }))

export function uploadDocument(conversationId, file) {
  const form = new FormData()
  form.append('file', file) // the browser sets the multipart Content-Type for us
  return request(`/conversations/${conversationId}/documents`, { method: 'POST', body: form })
}
export const deleteDocument = (id) => request(`/documents/${id}`, { method: 'DELETE' })
export const summarizeDocument = (id, style) =>
  request(`/documents/${id}/summarize`, jsonBody('POST', { style }))
export const summarizeText = (text, style) => request('/summarize', jsonBody('POST', { text, style }))
