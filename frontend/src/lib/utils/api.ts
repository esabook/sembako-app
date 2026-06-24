import { env } from '$env/dynamic/public'

// Di dev: Vite proxy /api → localhost:3000
// Di prod Nginx/Pi: Nginx forward /api → localhost:3000
// Di CF Pages: PUBLIC_API_URL dari wrangler.toml [vars] dibaca runtime
const BASE_URL = env.PUBLIC_API_URL ?? '/api'

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

function handleUnauthorized() {
  if (typeof window !== 'undefined') window.location.href = '/login'
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'include',
      ...init,
    })
    if (res.status === 401) { handleUnauthorized(); return { success: false, error: 'Sesi berakhir' } }
    return res.json() as Promise<ApiResponse<T>>
  } catch {
    return { success: false, error: 'Network error' }
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (res.status === 401) { handleUnauthorized(); return { success: false, error: 'Sesi berakhir' } }
      return res.json() as Promise<ApiResponse<T>>
    } catch {
      return { success: false, error: 'Network error' }
    }
  },
}
