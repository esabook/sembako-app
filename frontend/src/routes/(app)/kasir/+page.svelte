<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		keranjang,
		itemAktifIdx,
		subtotal,
		diskonTotal,
		kasirMode,
		initKasirMode,
		setModeOverride,
		type KasirMode
	} from '$lib/stores/kasir';
	import {
		// state
		searchVal,
		konfirmasiHapusIdx,
		popupSearch,
		popupCheckout,
		snap,
		qrLarge,
		draftStatus,
		// actions
		cariBarang,
		openSearch,
		closeSearch,
		dummyJumlah,
		ubahJumlah,
		hapusItem,
		ubahDiskon,
		openCheckout,
		tutupCheckout,
		initKasirScan,
		cleanupKasirScan,
		loadPromoAktif,
		totalAkhir,
		initDraftSync,
		restoreDraft,
		resetKasirDenganDraft
	} from './kasir.store';
	import { rupiah } from './kasir.logic';
	import ShiftBuka from './ShiftBuka.svelte';
	import ShiftTutup from './ShiftTutup.svelte';
	import KasirHelp from './KasirHelp.svelte';
	import KasirCheckout from './KasirCheckout.svelte';
	import KasirQrPanel from './KasirQrPanel.svelte';
	import KasirSpotlight from './KasirSpotlight.svelte';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { tinykeys } from 'tinykeys';
	import {
		fetchStokMenipis,
		type StokMenipis
	} from './kasir.api';

	// ── ConfirmDialog hapus item keranjang ────────────────────────────────────
	let konfirmasiHapusOpen = $state(false);
	$effect(() => { konfirmasiHapusOpen = $konfirmasiHapusIdx !== null; });

	// ── Pengaturan toko (dipakai cetakStrukHistori + KasirCheckout) ───────────
	let namaToko  = $state('Stokasir');
	let alamatToko = $state('');
	let strHeader  = $state('');
	let strFooter  = $state('Terima kasih sudah berbelanja!');
	let strUkuran  = $state('80');

	// ── Mode GUIDED / NORMAL / PRO ────────────────────────────────────────────
	const MODE_ORDER: KasirMode[] = ['guided', 'normal', 'pro'];
	const MODE_LABEL: Record<KasirMode, string> = { guided: 'GUIDED', normal: 'NORMAL', pro: 'PRO' };
	function cycleMode() {
		const cur = $kasirMode;
		const next = MODE_ORDER[(MODE_ORDER.indexOf(cur) + 1) % MODE_ORDER.length]!;
		setModeOverride(next);
	}

	// Reset confirm
	let konfirmasiReset = $state(false);

	// Panduan shortcut keyboard
	let showHelp = $state(false);

	// ── DOM refs ──────────────────────────────────────────────────────────────
	let diskonInputRefs = $state<(HTMLInputElement | undefined)[]>([]);


	// ── Stok menipis ─────────────────────────────────────────────────────────
	let stokMenipis = $state<StokMenipis[]>([]);
	let stokAlertDismissed = $state(false);

	// ── History transaksi ─────────────────────────────────────────────────────
	// ── Refresh stok menipis setelah checkout berhasil ───────────────────────
	$effect(() => {
		if ($snap) {
			stokAlertDismissed = false;
			fetchStokMenipis().then((d) => { stokMenipis = d; }).catch(() => {});
		}
	});

	// ── Keyboard: global ──────────────────────────────────────────────────────
	function closeAll() {
		if ($popupSearch) closeSearch();
		if ($popupCheckout) tutupCheckout();
		modalBukaShift = false;
		modalTutupShift = false;
		showHelp = false;
	}

	const inInput = () => ['INPUT', 'TEXTAREA'].includes(
		(document.activeElement as HTMLElement)?.tagName ?? ''
	);

	// Barcode scanner: timing < 50ms antar karakter — tidak bisa pakai tinykeys
	function setupBarcodeDetector(): () => void {
		let lastKeyTime = 0;
		let barcodeBuffer = '';
		function handleKey(e: KeyboardEvent) {
			if (inInput() || $popupSearch || $popupCheckout) return;
			const now = Date.now();
			if (now - lastKeyTime < 50 && e.key.length === 1) {
				barcodeBuffer += e.key;
			} else if (e.key === 'Enter' && barcodeBuffer.length > 3) {
				const code = barcodeBuffer;
				barcodeBuffer = '';
				lastKeyTime = 0;
				searchVal.set(code);
				openSearch();
				void cariBarang(code);
				e.stopImmediatePropagation();
				return;
			} else {
				barcodeBuffer = e.key.length === 1 ? e.key : '';
			}
			lastKeyTime = now;
		}
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);
	}

	// ── Shift management ─────────────────────────────────────────────────────

	type ShiftAktif = {
		id: number;
		tanggal: string;
		jam_buka: string;
		kas_awal: number;
		jumlah_transaksi: number;
		total_penjualan: number;
		status: string;
	};


	let shiftAktif = $state<ShiftAktif | null>(null);
	let modalBukaShift = $state(false);
	let modalTutupShift = $state(false);

	async function muatShiftAktif() {
		const res = await api.get<ShiftAktif | null>('/shift/aktif');
		if (res.success) shiftAktif = res.data;
	}

	async function bukaBukaShift() {
		await muatShiftAktif();
		if (shiftAktif) { toast.warn('Shift hari ini sudah dibuka'); return; }
		modalBukaShift = true;
	}

	function bukaTutupShift() {
		if (!shiftAktif) { toast.warn('Buka shift terlebih dahulu'); return; }
		modalTutupShift = true;
	}

	function handleProsesBayar() {
		if ($keranjang.length === 0) return;
		if (!shiftAktif) {
			toast.warn('Buka shift dulu sebelum transaksi (F11)');
			void bukaBukaShift();
			return;
		}
		closeAll();
		openCheckout();
	}

	onMount(() => {
		initKasirMode();
		void loadPromoAktif();
		void restoreDraft();
		void initKasirScan(page.data.user?.id ?? 0, location.host, location.protocol);
		muatShiftAktif().then(() => { if (!shiftAktif) modalBukaShift = true });
		fetchStokMenipis().then((d) => { stokMenipis = d; }).catch(() => {});
		void api.get<Record<string, string>>('/pengaturan').then((res) => {
			if (!res.success) return;
			const s = res.data;
			if (s.nama_toko)    namaToko   = s.nama_toko;
			if (s.alamat)       alamatToko = s.alamat;
			if (s.struk_header) strHeader  = s.struk_header;
			if (s.struk_footer) strFooter  = s.struk_footer;
			if (s.struk_ukuran) strUkuran  = s.struk_ukuran;
		});
		const cleanupDraft = initDraftSync();
		// barcode detector harus didaftarkan SEBELUM tinykeys agar stopImmediatePropagation bekerja
		const cleanupBarcode = setupBarcodeDetector();
		const cleanupKeys = tinykeys(window, {
			'F1': (e) => {
				e.preventDefault();
				if (showHelp) { showHelp = false; return; }
				closeAll();
				showHelp = true;
			},
			'F3': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($popupSearch) { closeSearch(); return; }
				closeAll();
				openSearch();
			},
			'F7': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				closeAll();
				void goto('/kasir/history');
			},
			'F8': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				closeAll();
				void goto('/kasir/retur');
			},
			'F10': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($keranjang.length === 0) return;
				if ($popupCheckout) { tutupCheckout(); return; }
				handleProsesBayar();
			},
			'F11': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if (modalBukaShift || modalTutupShift) {
					modalBukaShift = false;
					modalTutupShift = false;
					return;
				}
				closeAll();
				if (shiftAktif) bukaTutupShift();
				else void bukaBukaShift();
			},
			'F12': (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($keranjang.length === 0) return;
				closeAll();
				konfirmasiReset = true;
			},
			'Escape': (e) => {
				e.preventDefault();
				if (showHelp) { showHelp = false; return; }
				if ($qrLarge) { qrLarge.set(false); return; }
				if ($popupCheckout) { tutupCheckout(); return; }
				if ($popupSearch) { closeSearch(); return; }
				if (modalBukaShift) { modalBukaShift = false; return; }
				if (modalTutupShift) { modalTutupShift = false; return; }
			},
			'ArrowUp': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.preventDefault();
				itemAktifIdx.update((i) => Math.max(i - 1, 0));
			},
			'ArrowDown': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.preventDefault();
				itemAktifIdx.update((i) => Math.min(i < 0 ? 0 : i + 1, $keranjang.length));
			},
			'ArrowLeft': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) { dummyJumlah.update((n: number) => Math.max(1, n - 1)); return; }
				const cur = $keranjang[$itemAktifIdx];
				if (cur && cur.jumlah <= 1) konfirmasiHapusIdx.set($itemAktifIdx);
				else ubahJumlah($itemAktifIdx, -1);
			},
			'ArrowRight': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) { dummyJumlah.update((n: number) => n + 1); return; }
				ubahJumlah($itemAktifIdx, 1);
			},
			'Enter': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) { openSearch(); return; }
				const el = diskonInputRefs[$itemAktifIdx];
				el?.focus();
				el?.select();
			},
			'Delete': (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.stopPropagation();
				konfirmasiHapusIdx.set($itemAktifIdx);
			},
		});
		return () => {
			cleanupKasirScan();
			cleanupDraft();
			cleanupBarcode();
			cleanupKeys();
		};
	});
</script>

<div class="flex h-full flex-col">
<!-- ─── Alert stok menipis ────────────────────────────────────────────────── -->
{#if stokMenipis.length > 0 && !stokAlertDismissed}
	<div
		class="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-sm"
		style="background:color-mix(in srgb,var(--warn) 12%,var(--surface));border-color:var(--warn);color:var(--text)"
	>
		<div class="flex min-w-0 items-center gap-2">
			<span class="shrink-0 font-bold" style="color:var(--warn)">⚠ Stok menipis</span>
			<span class="truncate" style="color:var(--text-dim)">
				{stokMenipis.slice(0, 3).map((b) => `${b.nama_barang} (${b.stok_sekarang}/${b.stok_minimum}${b.satuan ? ' ' + b.satuan : ''})`).join(' · ')}
				{#if stokMenipis.length > 3}<span>+{stokMenipis.length - 3} lainnya</span>{/if}
			</span>
		</div>
		<button
			onclick={() => (stokAlertDismissed = true)}
			class="shrink-0 rounded px-2 py-0.5 text-xs"
			style="color:var(--text-dim)"
		>✕</button>
	</div>
{/if}

<!-- ─── Main: Keranjang + Bottom Bar ─────────────────────────────────────── -->
<div class="flex min-h-0 flex-1 flex-col">
	<!-- Keranjang table -->
	<div class="min-h-0 flex-1 overflow-y-auto rounded border" style="border-color:var(--border)">
		{#if $keranjang.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center gap-3 m-4"
				style="color:var(--text-dim)"
			>
				{#if $kasirMode === 'guided'}
					<p class="text-xs font-bold tracking-widest" style="color:var(--text-dim)">
						PANDUAN KASIR
					</p>
					<div class="flex flex-col gap-2 text-left text-sm">
						<div class="flex items-center gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--accent);color:var(--bg)">1</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">F3</kbd
								> atau klik tombol di bawah untuk cari barang</span
							>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--text-dim)">2</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">Enter</kbd
								> untuk pilih / konfirmasi</span
							>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--text-dim)">3</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">F10</kbd
								> untuk proses pembayaran</span
							>
						</div>
					</div>
				{:else}
					<p class="text-sm mt-4">Keranjang kosong</p>
				{/if}
				<button
					onclick={openSearch}
					class="rounded border px-4 py-2 font-mono text-sm transition-all"
					style="border-color:var(--accent);color:var(--accent);margin-bottom:2rem"
				>
					F3 · Cari / scan barang
				</button>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="sticky top-0" style="background:var(--surface2)">
					<tr style="color:var(--text-dim)">
						<th class="w-6 px-3 py-2 text-left font-medium">#</th>
						<th class="px-3 py-2 text-left font-medium">Barang</th>
						<th class="w-28 px-3 py-2 text-right font-medium">Harga</th>
						<th class="w-28 px-2 py-2 text-center font-medium">Jml</th>
						<th class="w-24 px-3 py-2 text-right font-medium">Diskon</th>
						<th class="w-28 px-3 py-2 text-right font-medium">Subtotal</th>
						<th class="w-8 px-2 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each $keranjang as item, idx (`${item.barang_id}-${item.tipe_harga}`)}
						<tr
							class="cursor-pointer border-t"
							style={$itemAktifIdx === idx
								? 'background:var(--surface2);outline:1px solid var(--accent);'
								: 'border-color:var(--border)'}
							onclick={() => itemAktifIdx.set(idx)}
						>
							<td class="px-3 py-2" style="color:var(--text-dim)">{idx + 1}</td>
							<td class="px-3 py-2">
								<div class="flex items-center gap-1.5">
									<span>{item.nama_barang}</span>
									<span class="rounded px-1 text-xs font-bold" style="background:var(--surface2);color:var(--accent)">{item.tipe_harga === 'grosir' ? 'GRS' : 'ECR'}</span>
								</div>
								<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
							</td>
							<td class="px-3 py-2 text-right font-mono">{rupiah(item.harga_jual)}</td>
							<td class="px-2 py-1">
								<div class="flex items-center justify-center gap-1">
									<button
										onclick={(e) => {
											e.stopPropagation();
											if (item.jumlah <= 1) konfirmasiHapusIdx.set(idx);
											else ubahJumlah(idx, -1);
										}}
										class="h-6 w-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">&lt;</button
									>
									<span class="w-8 text-center font-mono">{item.jumlah}</span>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ubahJumlah(idx, 1);
										}}
										class="h-6 w-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">&gt;</button
									>
								</div>
								<div class="mt-0.5 text-center text-xs" style="color:var(--text-dim)">
									{item.singkatan_satuan}
								</div>
							</td>
							<td class="px-3 py-1 text-right">
								<input
									bind:this={diskonInputRefs[idx]}
									type="number"
									min="0"
									step="500"
									value={item.diskon_item}
									oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === 'Escape') {
											e.preventDefault();
											e.stopPropagation();
											(e.target as HTMLInputElement).blur();
										}
									}}
									class="w-20 [appearance:textfield] rounded border px-2 py-0.5 text-right text-xs outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
							</td>
							<td class="px-3 py-2 text-right font-mono font-medium">
								{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
							</td>
							<td class="px-4 py-4 text-center">
								<button
									onclick={(e) => {
										e.stopPropagation();
										konfirmasiHapusIdx.set(idx);
									}}
									class="text-m"
									style="color:var(--danger)">✕</button
								>
							</td>
						</tr>
					{/each}
					<!-- Dummy row: klik nama/enter → buka cari barang -->
					<tr
						class="border-t"
						style={$itemAktifIdx === $keranjang.length
							? 'background:var(--surface2);outline:1px solid var(--accent);'
							: `border-color:var(--border);opacity:0.4`}
						onclick={() => itemAktifIdx.set($keranjang.length)}
					>
						<td class="px-3 py-2" style="color:var(--text-dim)">+</td>
						<td class="px-3 py-2">
							<button
								class="text-sm italic"
								style="color:var(--text-dim)"
								onclick={(e) => { e.stopPropagation(); openSearch(); }}
							>Tambah barang...</button>
						</td>
						<td></td>
						<td class="px-2 py-1">
							<div class="flex items-center justify-center gap-1">
								<button
									onclick={(e) => { e.stopPropagation(); dummyJumlah.update((n: number) => Math.max(1, n - 1)); }}
									class="h-6 w-6 rounded text-center leading-none"
									style="background:var(--surface);color:var(--text-dim)">&lt;</button
								>
								<span class="w-8 text-center font-mono">{$dummyJumlah}</span>
								<button
									onclick={(e) => { e.stopPropagation(); dummyJumlah.update((n: number) => n + 1); }}
									class="h-6 w-6 rounded text-center leading-none"
									style="background:var(--surface);color:var(--text-dim)">&gt;</button
								>
							</div>
						</td>
						<td></td>
						<td></td>
						<td></td>
					</tr>
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Bottom bar -->
	<div
		class="flex shrink-0 flex-col gap-2 border-t px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4"
		style="border-color:var(--border)"
	>
		<!-- Totals: tampil di atas di HP, kanan di desktop -->
		<div class="flex items-center justify-between gap-3 md:order-2 md:justify-end md:gap-5">
			<table class="text-xs md:text-sm">
				<tbody>
					<tr>
						<td style="color:var(--text-dim)">Subtotal</td>
						<td class="font-mono" style="color:var(--text)">&nbsp;{rupiah($subtotal)}</td>
					</tr>
					<tr>
						<td style="color:var(--text-dim)">Diskon</td>
						<td class="font-mono">&nbsp;{rupiah($diskonTotal)}</td>
					</tr>
				</tbody>
			</table>
			<span class="font-mono text-3xl font-bold md:text-6xl">{rupiah($totalAkhir)}</span>
		</div>

		<!-- Buttons: wrap di HP, single row di desktop -->
		<div class="flex flex-wrap items-center gap-2 md:order-1">

			<!-- mode badge: klik untuk ganti manual -->
			<button
				onclick={cycleMode}
				title="Mode kasir — klik untuk ganti"
				class="rounded border px-3 py-1 font-mono text-xs font-bold transition-all"
				style={$kasirMode === 'guided'
					? 'border-color:var(--info);color:var(--info)'
					: $kasirMode === 'pro'
						? 'border-color:var(--accent);color:var(--accent)'
						: 'border-color:var(--border);color:var(--text-dim)'}
			>
				{MODE_LABEL[$kasirMode]}
			</button>
			<!-- Shift indicator + buka/tutup -->
			{#if shiftAktif}
				<button
					onclick={bukaTutupShift}
					class="rounded border px-3 py-1 text-xs transition-all"
					style="border-color:var(--accent);color:var(--accent)"
				>
					{$kasirMode === 'pro' ? 'F11' : `F11 · Shift ${shiftAktif.jam_buka}`}
				</button>
			{:else}
				<button
					onclick={bukaBukaShift}
					class="rounded border px-3 py-1 text-xs font-bold transition-all"
					style="border-color:var(--warn);color:var(--warn)"
				>
					{$kasirMode === 'pro' ? 'F11' : 'F11 · Buka Shift ⚠'}
				</button>
			{/if}

			{#if $keranjang.length > 0}
				<button
				onclick={handleProsesBayar}
				disabled={!shiftAktif}
				class="rounded px-4 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 sm:px-3 sm:py-1"
				style="background:var(--accent);color:var(--bg)"
			>
				{$kasirMode === 'pro' ? 'F10' : 'F10 · PROSES BAYAR'}
			</button>
			{/if}
			
						<!-- draft status indicator -->
			{#if $draftStatus === 'saving'}
				<span class="font-mono text-xs" style="color:var(--text-dim)">Menyimpan...</span>
			{:else if $draftStatus === 'saved'}
				<span class="font-mono text-xs" style="color:var(--text-dim)">✓ Tersimpan</span>
			{:else if $draftStatus === 'error'}
				<span class="font-mono text-xs" style="color:var(--danger)">Gagal simpan</span>
			{/if}
		</div>
	</div>
</div>
</div>

<!-- ─── Spotlight Search ──────────────────────────────────────────────────── -->
{#if $popupSearch}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center px-2 pt-20"
		style="background:rgba(0,0,0,0.65)"
		onclick={closeSearch}
		role="none"
	>
		<div
			class="flex w-full max-w-3xl items-start gap-3"
			onclick={(e) => e.stopPropagation()}
			role="none"
		>
			<!-- spotlight box -->
			<KasirSpotlight />

			<!-- QR panel: scan dari HP -->
			<KasirQrPanel />
		</div>
		<!-- end flex row -->
	</div>
{/if}

<!-- ─── Checkout Popup ────────────────────────────────────────────────────── -->
<KasirCheckout {namaToko} {alamatToko} {strHeader} {strFooter} {strUkuran} />

<!-- ─── Shift Buka / Tutup ────────────────────────────────────────────────────── -->
<ShiftBuka
	bind:open={modalBukaShift}
	onberhasil={(shift) => { shiftAktif = shift }}
/>
<ShiftTutup
	bind:open={modalTutupShift}
	{shiftAktif}
	onberhasil={() => { shiftAktif = null }}
/>

<!-- ─── Modal konfirmasi reset (GUIDED mode) ────────────────────────────────── -->
<ConfirmDialog
	bind:open={konfirmasiReset}
	judul="Reset keranjang?"
	pesan="{$keranjang.length} item akan dihapus dari keranjang"
	labelKiri="Batal"
	labelKanan="Reset"
	warnaKanan="var(--danger)"
	onkanan={resetKasirDenganDraft}
/>

<!-- ─── Modal konfirmasi hapus ──────────────────────────────────────────────── -->
<ConfirmDialog
	bind:open={konfirmasiHapusOpen}
	judul="Hapus dari keranjang?"
	pesan={$konfirmasiHapusIdx !== null ? ($keranjang[$konfirmasiHapusIdx]?.nama_barang ?? '') : ''}
	labelKiri="Batal"
	labelKanan="Hapus"
	warnaKanan="var(--danger)"
	onkiri={() => konfirmasiHapusIdx.set(null)}
	onkanan={() => $konfirmasiHapusIdx !== null && hapusItem($konfirmasiHapusIdx)}
/>

<!-- ─── Modal panduan shortcut keyboard ─────────────────────────────────────── -->
<KasirHelp bind:open={showHelp} oncariBara={openSearch} />


