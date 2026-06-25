<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import TabPelanggan from './TabPelanggan.svelte';
	import TabKartu from './TabKartu.svelte';
	import TabRiwayat from './TabRiwayat.svelte';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir');
	});

	type Tab = 'pelanggan' | 'kartu' | 'riwayat';
	let tab = $derived<Tab>((page.url.searchParams.get('tab') as Tab) ?? 'pelanggan');

	let tabKartuRef = $state<{ muat: () => void } | null>(null);
	let riwayatId = $state<number | null>(null);
	let riwayatNama = $state('');

	const TABS = $derived([
		{ key: 'pelanggan', label: 'Pelanggan' },
		{ key: 'kartu', label: 'Kartu Anggota' },
		{ key: 'riwayat', label: 'Riwayat Transaksi' }
		// ...(tab === 'riwayat' && riwayatId
		// 	? [{ key: 'riwayat', label: `Riwayat — ${riwayatNama}` }]
		// 	: [])
	]);

	function gantiTab(t: Tab) {
		goto(`?tab=${t}`, { replaceState: true, keepFocus: true, noScroll: true });
		if (t === 'kartu') tabKartuRef?.muat();
	}

	function bukaRiwayat(id: number, nama: string) {
		riwayatId = id;
		riwayatNama = nama;
		gantiTab('riwayat');
	}

	let modalHelpOpen = $state(false);
</script>

<svelte:head><title>Pelanggan — Stokasir</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="font-bold" style="color:var(--text)">Pelanggan</h1>
	</div>
	<TabBar
		tabs={TABS}
		active={tab}
		storageKey="pelanggan"
		onchange={(key) => gantiTab(key as Tab)}
	/>

	{#if tab === 'pelanggan'}
		<TabPelanggan onbukariwayat={bukaRiwayat} />
	{:else if tab === 'kartu'}
		<TabKartu bind:this={tabKartuRef} />
	{:else if tab === 'riwayat'}
		<TabRiwayat pelangganId={riwayatId} namaPelanggan={riwayatNama} />
	{/if}
</div>

<!-- Help (fixed bottom-right) -->
<button
	onclick={() => (modalHelpOpen = true)}
	class="fixed right-5 bottom-5 z-40 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-lg"
	style="background:var(--surface2);border:1px solid var(--border);color:var(--text-dim)"
	title="Panduan modul Pelanggan & Kartu Anggota">?</button
>

{#if modalHelpOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) modalHelpOpen = false;
		}}
		style="background:rgba(0,0,0,0.5)"
	>
		<div
			class="max-h-[80vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border p-5 text-sm"
			style="background:var(--surface);border-color:var(--border);color:var(--text)"
		>
			<p class="text-base font-bold" style="color:var(--accent)">
				Panduan — Pelanggan & Kartu Anggota
			</p>

			<section>
				<p class="mb-1 font-bold" style="color:var(--accent)">Tab Pelanggan</p>
				<ul class="space-y-1 text-xs" style="color:var(--text-dim)">
					<li>· Kelola data pelanggan: tambah, edit, nonaktifkan.</li>
					<li>· Kode pelanggan otomatis kapital semua huruf.</li>
					<li>· Pencarian bisa pakai nama, kode, nomor HP, atau nomor kartu anggota.</li>
					<li>
						· Tombol <strong style="color:var(--accent)">+ Kartu</strong>: ketik min. 3 digit nomor
						kartu untuk mencari kartu yang tersedia.
					</li>
					<li>
						· Tombol <strong style="color:var(--danger)">Lepas Kartu</strong> melepas kartu dari pelanggan;
						kartu kembali tersedia.
					</li>
					<li>· Simbol ♂ / ♀ menandakan jenis kelamin pelanggan.</li>
				</ul>
			</section>

			<section>
				<p class="mb-1 font-bold" style="color:var(--accent)">Tab Kartu Anggota</p>
				<ul class="space-y-1 text-xs" style="color:var(--text-dim)">
					<li>· Kartu adalah entitas mandiri — generate dulu, assign ke pelanggan belakangan.</li>
					<li>
						· Tombol <strong style="color:var(--accent)">+ Generate Kartu</strong> membuat satu atau banyak
						kartu sekaligus (maks. 50).
					</li>
					<li>· Nomor kartu 10 digit, unik, digenerate secara acak.</li>
					<li>
						· Status kartu: <strong style="color:var(--accent)">Tersedia</strong> (belum di-assign) atau
						terikat ke pelanggan.
					</li>
					<li>
						· Tombol <strong style="color:var(--warn)">Lepas</strong> melepas kartu dari pelanggan tanpa
						menghapus data poin.
					</li>
					<li>
						· Tombol <strong style="color:var(--danger)">Nonaktif</strong> menonaktifkan kartu permanen.
					</li>
				</ul>
			</section>

			<section>
				<p class="mb-1 font-bold" style="color:var(--accent)">Tier & Diskon Member</p>
				<ul class="space-y-1 text-xs" style="color:var(--text-dim)">
					<li>· <strong style="color:var(--text-dim)">Reguler</strong> — member baru.</li>
					<li>· <strong style="color:#b0b8c1">Silver</strong> — member aktif.</li>
					<li>· <strong style="color:#f5c518">Gold</strong> — member loyal.</li>
					<li>· Diskon member diterapkan otomatis di kasir saat pelanggan dipilih.</li>
				</ul>
			</section>

			<div class="flex justify-end pt-1">
				<Button onclick={() => (modalHelpOpen = false)} variant="primary">Tutup</Button>
			</div>
		</div>
	</div>
{/if}
