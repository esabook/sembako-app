<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	type Me = { tenant_id: number; is_demo?: boolean };

	let me = $state<Me | null>(null);
	let keluar = $state(false);

	onMount(async () => {
		const res = await api.get<Me>('/auth/me');
		if (res.success) me = res.data;
	});

	const tampil = $derived(!!me?.is_demo);

	// Keluar mode demo = switch-context balik ke toko asli (home_tenant).
	// Fallback: toko lain mana pun yang bukan konteks demo aktif.
	async function keluarDemo() {
		if (keluar || !me) return;
		keluar = true;
		let tokoId: number | null = null;
		const home = localStorage.getItem('home_tenant');
		if (home) tokoId = Number(home);
		if (!tokoId) {
			const ctx = await api.get<{ id: number; nama: string }[]>('/auth/accessible-context');
			if (ctx.success) tokoId = ctx.data.find((t) => t.id !== me!.tenant_id)?.id ?? null;
		}
		if (!tokoId) {
			keluar = false;
			return;
		}
		const sw = await api.post('/auth/switch-context', { toko_id: tokoId, cabang_id: null });
		if (sw.success) {
			localStorage.removeItem('home_tenant');
			location.href = '/dashboard';
		} else {
			keluar = false;
		}
	}
</script>

{#if tampil}
	<div
		class="flex flex-col gap-2 px-3 py-2 text-xs font-semibold text-white md:flex-row md:items-center md:justify-between"
		style="background:var(--accent)"
	>
		<span class="flex gap-2">
			<FlaskConical size="1rem" />
			MODE DEMO: Data contoh dari toko cabang-demo, toko asli Anda tidak terpengaruh.
		</span>
		<button
			class="btn ml-auto flex btn-xs disabled:opacity-60"
			disabled={keluar}
			onclick={keluarDemo}
		>
			Keluar mode demo
			<ChevronRight size="1rem" />
		</button>
	</div>
{/if}
