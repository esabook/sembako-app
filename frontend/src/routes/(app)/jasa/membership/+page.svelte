<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchPaketMembership, fetchKreditMembership } from '../jasa.api';
	import type { PaketMembership, KreditMembership } from '../jasa.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let paket = $state<PaketMembership[]>([]);
	let kredit = $state<KreditMembership[]>([]);
	let loading = $state(false);
	let tab = $state<'paket' | 'kredit'>('kredit');

	const paketCols = [
		{ key: 'kode_paket', label: 'Kode', width: 100 },
		{ key: 'nama', label: 'Nama Paket' },
		{ key: 'layanan_nama', label: 'Layanan' },
		{ key: 'jumlah_sesi', label: 'Sesi', width: 70 },
		{ key: 'harga', label: 'Harga', width: 110 },
		{ key: 'masa_berlaku_hari', label: 'Berlaku (hr)', width: 100 },
	];

	const kreditCols = [
		{ key: 'pelanggan_nama', label: 'Pelanggan' },
		{ key: 'paket_nama', label: 'Paket' },
		{ key: 'sisa_kuota', label: 'Sisa', width: 70 },
		{ key: 'tanggal_mulai', label: 'Mulai', width: 100 },
		{ key: 'tanggal_expired', label: 'Expired', width: 100 },
		{ key: 'status', label: 'Status', width: 90 },
	];

	const WARNA_KREDIT: Record<string, string> = {
		aktif: 'var(--accent)',
		habis: 'var(--text-dim)',
		expired: 'var(--danger)',
	};

	async function muat() {
		loading = true;
		[paket, kredit] = await Promise.all([fetchPaketMembership(), fetchKreditMembership()]);
		loading = false;
	}

	onMount(muat);
</script>

<div class="p-3 md:p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Membership & Paket</h1>
	</div>

	<div class="mb-4 flex w-fit overflow-hidden rounded-lg border border-[var(--border)]">
		{#each [['kredit', 'Kredit Pelanggan'], ['paket', 'Definisi Paket']] as [v, l]}
			<button
				class="px-4 py-2 text-sm transition-colors
					{tab === v ? 'bg-[var(--accent)] text-black font-semibold' : 'text-[var(--text)]'}"
				onclick={() => (tab = v as 'paket' | 'kredit')}
			>{l}</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else if tab === 'kredit'}
		<DataTable columns={kreditCols} rowCount={kredit.length} pageSize={25} emptyText="Belum ada kredit membership.">
			{#snippet body(hidden)}
				{#each kredit as r (r.id)}
					<tr>
						{#if !hidden.has('pelanggan_nama')}<td class="px-3 py-2">{r.pelanggan_nama}</td>{/if}
						{#if !hidden.has('paket_nama')}<td class="px-3 py-2">{r.paket_nama}</td>{/if}
						{#if !hidden.has('sisa_kuota')}<td class="px-3 py-2 text-center">{r.sisa_kuota}</td>{/if}
						{#if !hidden.has('tanggal_mulai')}<td class="px-3 py-2 text-sm">{r.tanggal_mulai}</td>{/if}
						{#if !hidden.has('tanggal_expired')}<td class="px-3 py-2 text-sm">{r.tanggal_expired ?? '∞'}</td>{/if}
						{#if !hidden.has('status')}
							<td class="px-3 py-2">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium text-black"
									style="background:{WARNA_KREDIT[r.status] ?? 'var(--surface2)'}">
									{r.status}
								</span>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{:else}
		<DataTable columns={paketCols} rowCount={paket.length} pageSize={25} emptyText="Belum ada paket membership.">
			{#snippet body(hidden)}
				{#each paket as r (r.id)}
					<tr>
						{#if !hidden.has('kode_paket')}<td class="px-3 py-2 font-mono text-xs">{r.kode_paket}</td>{/if}
						{#if !hidden.has('nama')}<td class="px-3 py-2 font-medium">{r.nama}</td>{/if}
						{#if !hidden.has('layanan_nama')}<td class="px-3 py-2 text-sm">{r.layanan_nama ?? '—'}</td>{/if}
						{#if !hidden.has('jumlah_sesi')}<td class="px-3 py-2 text-center">{r.jumlah_sesi}</td>{/if}
						{#if !hidden.has('harga')}<td class="px-3 py-2 text-right font-mono">Rp {r.harga.toLocaleString('id-ID')}</td>{/if}
						{#if !hidden.has('masa_berlaku_hari')}<td class="px-3 py-2 text-center">{r.masa_berlaku_hari === 0 ? '∞' : r.masa_berlaku_hari}</td>{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>
