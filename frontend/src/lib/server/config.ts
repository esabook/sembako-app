import { env } from '$env/dynamic/public'

export const backendUrl = env.PUBLIC_API_URL ?? 'http://localhost:3000'
