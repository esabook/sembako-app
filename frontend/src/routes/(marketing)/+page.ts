import { redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/public'
import type { PageLoad } from './$types'

// Landing prerender statis (mode online). Tanpa CORS origin sama dengan app.
export const prerender = true

export const load: PageLoad = () => {
	// Mode build-time: build LAN/offline `/` tetap mengarah ke app (regresi LAN nol),
	// hanya build cloud yang menampilkan landing publik.
	if (env.PUBLIC_DEPLOYMENT_MODE !== 'online') {
		redirect(307, '/kasir')
	}
}
