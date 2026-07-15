const baseUrl = (import.meta.env.VITE_API_BASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/docs$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, unavailable = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.unavailable = unavailable
  }
}

function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('API 서버에 연결할 수 없습니다.', { unavailable: true })
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('API 응답 형식이 올바르지 않습니다.', { status: response.status, unavailable: true })
  }
  if (!response.ok || payload?.success !== true) {
    throw new ApiError(payload?.message || '요청을 처리하지 못했습니다.', { status: response.status })
  }
  return payload.data
}

export const getPosts = (params, options = {}) => request(`/posts${queryString(params)}`, options)
export const getPost = postId => request(`/posts/${encodeURIComponent(postId)}`)
export const likePost = (postId, liked) => request(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST', body: { liked } })
export const getComments = postId => request(`/posts/${encodeURIComponent(postId)}/comments`)
export const createComment = (postId, content, password) => request(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: { content, password } })
export const deleteComment = (postId, commentId, password) => request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE', body: { password } })
export const createPost = body => request('/posts', { method: 'POST', body })
export const updatePost = (postId, body) => request(`/posts/${encodeURIComponent(postId)}`, { method: 'PUT', body })
export const deletePost = (postId, password) => request(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE', body: { password } })
export const sendChat = (message, context = {}) => request('/chat', { method: 'POST', body: { message, context } })
export async function sendChatStream(message, context = {}, { onToken, onSources } = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message, context }),
    })
  } catch {
    throw new ApiError('API 서버에 연결할 수 없습니다.', { unavailable: true })
  }
  if (!response.ok || !response.body) {
    let payload
    try { payload = await response.json() } catch { payload = null }
    throw new ApiError(payload?.message || '챗봇 응답을 불러오지 못했습니다.', { status: response.status, unavailable: response.status >= 500 })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  while (!completed) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const event of events) {
      const dataLine = event.split(/\r?\n/).find(line => line.startsWith('data:'))
      if (!dataLine) continue
      let payload
      try { payload = JSON.parse(dataLine.slice(5).trim()) } catch { continue }
      if (payload.type === 'token') await onToken?.(String(payload.data || ''))
      else if (payload.type === 'sources') onSources?.(payload.data || [])
      else if (payload.type === 'done') completed = true
    }
    if (done) break
  }
}
export const getTours = (params, options = {}) => request(`/tours${queryString(params)}`, options)
export async function getTour({ id, title, contentTypeId }) {
  const result = await getTours({ keyword: title, contentTypeId, page: 1, size: 50 })
  const items = result?.items || []
  const detail = items.find(item => String(item.id ?? item.contentid) === String(id))
  if (!detail) throw new ApiError('선택한 장소 정보를 찾지 못했습니다.', { status: 404 })
  return detail
}
