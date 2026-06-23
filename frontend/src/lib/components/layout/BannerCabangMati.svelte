<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import { cabangListVersion } from '$lib/stores/cabang-version.js';
	import { api } from '$lib/utils/api.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	type Cabang = { id: number; is_active: boolean };

	let semuaMati = $state(false);

	async function cekCabang(tenantId: number) {
		const res = await api.get<Cabang[]>(`/toko/${tenantId}/cabang`);
		if (res.success && res.data.length > 0) {
			semuaMati = res.data.every((c) => !c.is_active);
		} else {
			semuaMati = false;
		}
	}

	$effect(() => {
		void $cabangListVersion;
		const tenantId = $user?.tenant_id;
		if (tenantId) cekCabang(tenantId);
	});
</script>

{#if semuaMati}
	<div
		class="flex items-center justify-between px-3 py-1.5 text-xs font-medium"
		style="background:var(--danger);color:#fff"
	>
		<span class="flex items-center gap-2">
			<TriangleAlert size="0.9rem" />
			Semua cabang dinonaktifkan — transaksi tidak dapat dilakukan.
		</span>
		<a
			href="/pengaturan/toko"
			class="flex shrink-0 items-center gap-1 underline opacity-90 hover:opacity-100"
		>
			Atur Cabang
			<ChevronRight size="0.9rem" />
		</a>
	</div>
{/if}
