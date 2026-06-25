import { env as privateEnv } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'

// Server-side: pakai BACKEND_URL (private, tidak expose ke browser).
// Fallback ke PUBLIC_API_URL untuk compat lokal/LAN, lalu localhost.
export const backendUrl =
	privateEnv.BACKEND_URL ?? publicEnv.PUBLIC_API_URL ?? 'http://localhost:3000'
