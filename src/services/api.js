const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

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

export const getPosts = params => request(`/posts${queryString(params)}`)
export const getPost = postId => request(`/posts/${encodeURIComponent(postId)}`)
export const createPost = body => request('/posts', { method: 'POST', body })
export const updatePost = (postId, body) => request(`/posts/${encodeURIComponent(postId)}`, { method: 'PUT', body })
export const deletePost = (postId, password) => request(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE', body: { password } })
export const sendChat = (message, context = {}) => request('/chat', { method: 'POST', body: { message, context } })

export async function getAllTours({ size = 500 } = {}) {
  const first = await request(`/tours${queryString({ page: 1, size })}`)
  const items = [...(first?.items || [])]
  const totalPages = Number(first?.totalPages || 1)
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await request(`/tours${queryString({ page, size })}`)
    items.push(...(next?.items || []))
  }
  return items
}
