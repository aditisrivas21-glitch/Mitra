```javascript
// Centralized API wrapper for Mitra.
// All backend requests go through request() for consistent error handling.

// Netlify production URL comes from the VITE_API_URL environment variable.
// For local development, create frontend/.env.local with:
// VITE_API_URL=http://127.0.0.1:8000

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// Construct the complete API URL.
function getApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE}/api${normalizedPath}`
}

// Send a request to the backend.
async function request(path, options = {}) {
  const url = getApiUrl(path)

  let response

  try {
    response = await fetch(url, options)
  } catch (error) {
    console.error('Mitra network error:', error)

    if (import.meta.env.PROD && !BASE) {
      throw new Error(
        'Backend URL is missing. Set VITE_API_URL in Netlify and redeploy.'
      )
    }

    throw new Error(
      `Cannot connect to the backend at ${url}. ` +
      'Check your internet connection, backend status, and CORS configuration.'
    )
  }

  // Read the response body only once.
  const responseText =
    response.status === 204 || response.status === 205
      ? ''
      : await response.text()

  let data = null

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = responseText
    }
  }

  // Handle unsuccessful HTTP responses.
  if (!response.ok) {
    let detail = `Request failed (${response.status})`

    if (typeof data?.detail === 'string') {
      detail = data.detail
    } else if (Array.isArray(data?.detail)) {
      detail = data.detail
        .map((item) => item.msg || 'Invalid input')
        .join('; ')
    } else if (typeof data?.message === 'string') {
      detail = data.message
    } else if (typeof data === 'string' && data.trim()) {
      detail = data
    }

    console.error('Mitra API error:', {
      url,
      status: response.status,
      detail,
    })

    throw new Error(detail)
  }

  // Successful requests with no response body.
  if (!responseText) {
    return null
  }

  // Return JSON directly, or wrap plain text in an object.
  if (typeof data === 'string') {
    return { message: data }
  }

  return data
}

// Helper for JSON request bodies.
const jsonBody = (method, body) => ({
  method,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})

// Health check.
export const getHealth = () => request('/health')

// Conversation operations.
export const listConversations = () =>
  request('/conversations')

export const createConversation = () =>
  request('/conversations', jsonBody('POST', {}))

export const getConversation = (id) =>
  request(`/conversations/${encodeURIComponent(id)}`)

export const deleteConversation = (id) =>
  request(`/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

// Send a message.
export const sendMessage = (id, content) =>
  request(
    `/conversations/${encodeURIComponent(id)}/messages`,
    jsonBody('POST', { content })
  )

// Upload a document.
export function uploadDocument(conversationId, file) {
  const form = new FormData()
  form.append('file', file)

  return request(
    `/conversations/${encodeURIComponent(conversationId)}/documents`,
    {
      method: 'POST',
      body: form,
    }
  )
}

// Delete a document.
export const deleteDocument = (id) =>
  request(`/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

// Summarize an uploaded document.
export const summarizeDocument = (id, style) =>
  request(
    `/documents/${encodeURIComponent(id)}/summarize`,
    jsonBody('POST', { style })
  )

// Summarize plain text.
export const summarizeText = (text, style) =>
  request(
    '/summarize',
    jsonBody('POST', { text, style })
  )
```
