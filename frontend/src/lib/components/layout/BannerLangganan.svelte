<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	type StatusLangganan = {
		status_langganan: 'trial' | 'aktif' | 'suspended';
		sisa_hari: number | null;
	};

	let data = $state<StatusLangganan | null>(null);

	onMount(async () => {
		const res = await api.get<StatusLangganan>('/langganan');
		if (res.success) data = res.data;
	});

	// trial sisa ≤3 hari → kuning; suspended → merah sticky.
	const tampil = $derived(
		!!data &&
			(data.status_langganan === 'suspended' ||
				(data.status_langganan === 'trial' && (data.sisa_hari ?? 99) <= 3))
	);
	const suspended = $derived(data?.status_langganan === 'suspended');
	const pesan = $derived(
		suspended
			? 'Akun nonaktif — transaksi terkunci. Upload bukti bayar.'
			: `Trial sisa ${data?.sisa_hari ?? 0} hari — segera berlangganan.`
	);
</script>

{#if tampil}
	<a
		href="/pengaturan/langganan"
		class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white {suspended
			? 'sticky top-0 z-40'
			: ''}"
		style="background:{suspended ? 'var(--danger)' : 'var(--warn)'}"
	>
		<TriangleAlert size={14} />
		<span>{pesan}</span>
		<span class="ml-auto underline">Kelola →</span>
	</a>
{/if}
