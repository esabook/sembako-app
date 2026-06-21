<script lang="ts">
	import { onMount } from 'svelte';
	import { withLoading } from '$lib/utils/async';
	import { dedupe } from '$lib/utils/async';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import { fetchKdsItems, updateStatusKds } from './kds.api';
	import { labelWaktu, menitBerlalu } from './kds.logic';
	import type { KdsItem, StatusKds } from './kds.types';

	let items = $state<KdsItem[]>([]);
	let loading = $state(false);

	const KOLOM: { status: StatusKds; label: string; warna: string; next: StatusKds | null }[] = [
		{ status: 'pending', label: 'Antrian', warna: 'var(--warn)', next: 'cooking' },
		{ status: 'cooking', label: 'Dimasak', warna: 'var(--info)', next: 'served' },
		{ status: 'served', label: 'Selesai', warna: 'var(--accent)', next: null },
	];

	function itemsByStatus(status: StatusKds): KdsItem[] {
		return items.filter((i) => i.status_kds === status);
	}

	async function muat() {
		const hasil = await withLoading(() => dedupe('kds-poll', fetchKdsItems), {
			loadingKey: 'kds-muat',
			modul: 'kds',
			aksi: 'muat',
			errorPesan: 'Gagal muat antrian dapur',
			bisaRetry: false,
		});
		if (hasil) items = hasil;
	}

	async function majuStatus(item: KdsItem, next: StatusKds) {
		// optimistic flip
		items = items.map((i) => (i.id === item.id ? { ...i, status_kds: next } : i));
		await withLoading(() => updateStatusKds(item.id, next), {
			loadingKey: `kds-${item.id}`,
			modul: 'kds',
			aksi: 'ubah-status',
			errorPesan: 'Gagal ubah status',
		});
	}

	let intervalId: ReturnType<typeof setInterval>;
	onMount(() => {
		void muat();
		intervalId = setInterval(muat, 7_000);
		return () => clearInterval(intervalId);
	});
</script>

<!-- KDS fullscreen — layout overrides sidebar via (kasir) group -->
<div class="flex h-full flex-col overflow-hidden" style="background:var(--bg);color:var(--text)">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
		<h1 class="text-sm font-bold uppercase tracking-widest" style="color:var(--accent)">
			Kitchen Display
		</h1>
		{#if loading}
			<span class="text-xs text-[var(--text-dim)]">Memuat…</span>
		{/if}
	</div>

	<OfflineIndicator />

	<!-- 3 kolom status — overflow-x-auto di layar sempit -->
	<div class="flex min-h-0 flex-1 gap-2 overflow-x-auto p-2 sm:gap-4 sm:p-4">
		{#each KOLOM as kolom (kolom.status)}
			<div class="flex min-w-[260px] flex-1 flex-col gap-2 overflow-hidden">
				<!-- Kolom header -->
				<div
					class="rounded-md px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-black"
					style="background:{kolom.warna}"
				>
					{kolom.label}
					<span class="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-xs">
						{itemsByStatus(kolom.status).length}
					</span>
				</div>

				<!-- Tiket order — scrollable dalam kolom -->
				<div class="flex flex-col gap-2 overflow-y-auto pb-2">
					{#each itemsByStatus(kolom.status) as item (item.id)}
						<div
							class="rounded-lg border border-[var(--border)] p-3"
							style="background:var(--surface)"
						>
							<!-- Meja + waktu -->
							<div class="mb-2 flex items-start justify-between gap-2">
								<span class="text-sm font-bold">
									{item.meja_kode ? `Meja ${item.meja_kode}` : item.no_transaksi}
								</span>
								<span
									class="shrink-0 text-xs"
									style="color:{menitBerlalu(item.created_at) >= 10 ? 'var(--danger)' : 'var(--text-dim)'}"
								>
									{labelWaktu(item.created_at)}
								</span>
							</div>

							<!-- Nama menu + qty -->
							<p class="text-base font-semibold">
								<span class="mr-1.5 rounded bg-[var(--surface2)] px-1.5 py-0.5 font-mono text-sm">
									×{item.jumlah}
								</span>
								{item.barang_nama}
							</p>

							<!-- Modifier chips -->
							{#if item.modifiers.length > 0}
								<div class="mt-1.5 flex flex-wrap gap-1">
									{#each item.modifiers as mod (mod)}
										<span
											class="rounded-full px-2 py-0.5 text-xs"
											style="background:var(--surface2);color:var(--text-dim)">{mod}</span
										>
									{/each}
								</div>
							{/if}

							<!-- Catatan -->
							{#if item.catatan}
								<p class="mt-1 text-xs italic text-[var(--warn)]">📌 {item.catatan}</p>
							{/if}

							<!-- Tombol maju status -->
							{#if kolom.next}
								<button
									class="btn btn-sm mt-3 w-full font-semibold"
									style="background:{kolom.warna};color:black;border:none"
									onclick={() => majuStatus(item, kolom.next!)}
								>
									{kolom.next === 'cooking' ? '▶ Mulai Masak' : '✓ Selesai'}
								</button>
							{/if}
						</div>
					{/each}

					{#if itemsByStatus(kolom.status).length === 0}
						<p class="py-8 text-center text-sm text-[var(--text-dim)]">—</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
