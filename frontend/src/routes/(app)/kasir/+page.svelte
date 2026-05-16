<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { api } from '$lib/utils/api.js';
	import {
		keranjang, tipeTransaksi, metodeBayar,
		pelangganDipilih, nominalBayar, itemAktifIdx,
		subtotal, diskonTotal, diskonMember, total, kembalian,
		resetKasir, type ItemKeranjang, type MetodeBayar,
	} from '$lib/stores/kasir.js';
	import { page } from '$app/state';

	type BarangResult = {
		id: number; kode_barang: string; nama_barang: string;
		harga_jual_eceran: number; harga_jual_grosir: number;
		stok_sekarang: number; satuan_dasar_id: number | null;
		singkatan_satuan: string | null;
	};
	type PelangganResult = {
		id: number; nama: string; saldo_piutang: number;
		gender: 'pria' | 'wanita' | null;
		no_kartu: string | null;
		tier: 'reguler' | 'silver' | 'gold' | null;
		diskon_member: number | null;
	};
	type Snap = {
		items: ItemKeranjang[]; subtotal: number; diskon: number; total: number;
		metode: MetodeBayar; nominal: number; kembalian: number;
		pelanggan: PelangganResult | null; tipe: 'eceran' | 'grosir';
		noTransaksi: string; waktu: Date;
	};

	// ── State ────────────────────────────────────────────────────────────────
	let searchVal        = $state('');
	let searchResults    = $state<BarangResult[]>([]);
	let searchLoading    = $state(false);
	let searchSelectedIdx = $state(-1);

	let pelangganQuery        = $state('');
	let pelangganList         = $state<PelangganResult[]>([]);
	let pelangganSelectedIdx  = $state(-1);

	let prosesLoading        = $state(false);
	let errorMsg             = $state('');
	let konfirmasiHapusIdx   = $state<number | null>(null);

	let popupSearch   = $state(false);
	let popupCheckout = $state(false);
	let snap          = $state<Snap | null>(null);
	let checkoutTime  = $state(new Date());

	// barcode scanner buffer
	let lastKeyTime   = 0;
	let barcodeBuffer = '';

	let scanSessionId   = $state('');
	let scanUrl         = $state('');
	let qrDataUrl       = $state('');
	let qrLarge         = $state(false);
	let scannerStatus   = $state<'idle' | 'connected' | 'disconnected'>('idle');
	let kasirSse: EventSource | null = null;
	let lastSseEventMs  = 0;
	let sseWatchdog: ReturnType<typeof setInterval> | null = null;
	const SSE_TIMEOUT_MS = 15_000;

	let searchInputEl = $state<HTMLInputElement>();
	let pelangganInputEl = $state<HTMLInputElement>();
	let bayarInputEl     = $state<HTMLInputElement>();

	// ── Derived struk values (live or from snapshot) ─────────────────────────
	const strukItems    = $derived(snap?.items    ?? $keranjang);
	const strukSubtotal = $derived(snap?.subtotal ?? $subtotal);
	const strukDiskon   = $derived(snap?.diskon   ?? $diskonMember);
	const strukTotal    = $derived(snap?.total    ?? $total);
	const strukMetode   = $derived(snap?.metode   ?? $metodeBayar);
	const strukNominal  = $derived(snap ? snap.nominal  : Number($nominalBayar));
	const strukKembali  = $derived(snap ? snap.kembalian : $kembalian);
	const strukPelanggan = $derived(snap?.pelanggan ?? $pelangganDipilih);

	// ── Helpers ───────────────────────────────────────────────────────────────
	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID').format(n);
	}
	const METODE: MetodeBayar[] = ['tunai', 'transfer', 'qris', 'hutang'];
	const METODE_LABEL: Record<MetodeBayar, string> = {
		tunai: 'TUNAI', transfer: 'TRANSFER', qris: 'QRIS', hutang: 'HUTANG',
	};
	function formatTgl(d: Date) {
		return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	function formatJam(d: Date) {
		return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	// ── Search ────────────────────────────────────────────────────────────────
	let searchTimer: ReturnType<typeof setTimeout>;
	async function cariBarang(q: string) {
		if (!q.trim()) { searchResults = []; searchSelectedIdx = -1; return; }
		clearTimeout(searchTimer);
		searchLoading = true;
		searchTimer = setTimeout(async () => {
			const res = await api.get<BarangResult[]>(`/barang?q=${encodeURIComponent(q)}`);
			searchLoading = false;
			if (res.success) {
				searchResults = res.data;
				searchSelectedIdx = res.data.length > 0 ? 0 : -1;
			}
		}, 200);
	}

	async function openSearch() {
		popupSearch = true;
		setTimeout(() => searchInputEl?.focus(), 0);
	}

	async function scanDariPhone(kode: string, qty = 1) {
		const res = await api.get<BarangResult[]>(`/barang?q=${encodeURIComponent(kode)}`);
		if (!res.success) return;
		if (!popupSearch && res.data.length === 1) {
			tambahKeKeranjang(res.data[0]!, qty);
			return;
		}
		searchVal = kode;
		searchResults = res.data;
		searchSelectedIdx = res.data.length > 0 ? 0 : -1;
		if (!popupSearch) openSearch();
	}

	function connectKasirSse() {
		kasirSse?.close();
		kasirSse = new EventSource(`/api/scan-relay/kasir/${scanSessionId}`);
		kasirSse.onopen = () => {
			scannerStatus = 'connected';
			lastSseEventMs = Date.now();
		};
		kasirSse.onmessage = (e) => {
			lastSseEventMs = Date.now();
			const msg = JSON.parse(e.data as string) as { type: string; kode?: string; qty?: number };
			if (msg.type === 'scan' && msg.kode) scanDariPhone(msg.kode, msg.qty ?? 1);
		};
		kasirSse.onerror = () => { scannerStatus = 'disconnected'; };
	}

	function startSseWatchdog() {
		if (sseWatchdog) clearInterval(sseWatchdog);
		sseWatchdog = setInterval(() => {
			if (lastSseEventMs > 0 && Date.now() - lastSseEventMs > SSE_TIMEOUT_MS) {
				scannerStatus = 'disconnected';
				connectKasirSse();
			}
		}, 5_000);
	}
	function closeSearch() {
		popupSearch = false;
		searchVal = '';
		searchResults = [];
		searchSelectedIdx = -1;
		searchLoading = false;
		clearTimeout(searchTimer);
	}

	// ── Keranjang ─────────────────────────────────────────────────────────────
	function tambahKeKeranjang(br: BarangResult, qty = 1) {
		const harga = $tipeTransaksi === 'grosir' ? br.harga_jual_grosir : br.harga_jual_eceran;
		keranjang.update((k) => {
			const idx = k.findIndex((i) => i.barang_id === br.id);
			if (idx >= 0) {
				const u = [...k];
				u[idx] = { ...u[idx]!, jumlah: Math.min(u[idx]!.jumlah + qty, u[idx]!.stok_sekarang) };
				itemAktifIdx.set(idx);
				return u;
			}
			itemAktifIdx.set(k.length);
			return [...k, {
				barang_id: br.id, kode_barang: br.kode_barang, nama_barang: br.nama_barang,
				satuan_id: br.satuan_dasar_id, singkatan_satuan: br.singkatan_satuan ?? '',
				jumlah: Math.min(qty, br.stok_sekarang), harga_jual: harga, diskon_item: 0, stok_sekarang: br.stok_sekarang,
			}];
		});
		closeSearch();
	}

	function ubahJumlah(idx: number, delta: number) {
		keranjang.update((k) => {
			const u = [...k];
			const item = u[idx];
			if (!item) return k;
			const newQty = item.jumlah + delta;
			if (newQty <= 0) {
				u.splice(idx, 1);
				itemAktifIdx.set(u.length > 0 ? Math.min(idx, u.length - 1) : -1);
				return u;
			}
			u[idx] = { ...item, jumlah: Math.min(newQty, item.stok_sekarang) };
			return u;
		});
	}

	function hapusItem(idx: number) {
		keranjang.update((k) => { const u = [...k]; u.splice(idx, 1); return u; });
		itemAktifIdx.set(-1);
		konfirmasiHapusIdx = null;
	}

	function ubahDiskon(idx: number, val: string) {
		keranjang.update((k) => {
			const u = [...k];
			if (u[idx]) u[idx] = { ...u[idx]!, diskon_item: Number(val) || 0 };
			return u;
		});
	}

	// ── Pelanggan ─────────────────────────────────────────────────────────────
	let pelangganTimer: ReturnType<typeof setTimeout>;
	async function muatPelanggan(q: string) {
		pelangganQuery = q;
		if (q.length < 3) { pelangganList = []; pelangganSelectedIdx = -1; return; }
		clearTimeout(pelangganTimer);
		pelangganTimer = setTimeout(async () => {
			const res = await api.get<PelangganResult[]>(`/pelanggan?q=${encodeURIComponent(q)}`);
			if (res.success) {
				pelangganList = res.data;
				pelangganSelectedIdx = res.data.length > 0 ? 0 : -1;
			}
		}, 200);
	}
	function pilihPelanggan(p: PelangganResult) {
		pelangganDipilih.set(p);
		pelangganList = [];
		pelangganQuery = '';
	}

	// ── Checkout ──────────────────────────────────────────────────────────────
	function openCheckout() {
		if ($keranjang.length === 0) return;
		errorMsg = '';
		snap = null;
		checkoutTime = new Date();
		popupCheckout = true;
		setTimeout(() => bayarInputEl?.focus(), 50);
	}
	function tutupCheckout() {
		popupCheckout = false;
		snap = null;
	}

	async function prosesBayar() {
		if ($metodeBayar === 'hutang' && !$pelangganDipilih) {
			errorMsg = 'Pilih pelanggan untuk transaksi hutang'; return;
		}
		if ($metodeBayar !== 'hutang' && Number($nominalBayar) < $total) {
			errorMsg = 'Nominal bayar kurang'; return;
		}
		prosesLoading = true;
		errorMsg = '';
		const res = await api.post<{ no_transaksi: string }>('/penjualan', {
			pelanggan_id: $pelangganDipilih?.id,
			tipe: $tipeTransaksi,
			metode_bayar: $metodeBayar,
			bayar: Number($nominalBayar) || $total,
			items: $keranjang.map((i) => ({
				barang_id: i.barang_id, satuan_id: i.satuan_id,
				jumlah: i.jumlah, harga_jual: i.harga_jual, diskon_item: i.diskon_item,
			})),
		});
		prosesLoading = false;
		if (!res.success) { errorMsg = (res as { success: false; error: string }).error; return; }

		// snapshot sebelum reset
		snap = {
			items: [...$keranjang], subtotal: $subtotal, diskon: $diskonMember,
			total: $total, metode: $metodeBayar,
			nominal: Number($nominalBayar) || $total,
			kembalian: $kembalian, pelanggan: $pelangganDipilih,
			tipe: $tipeTransaksi, noTransaksi: res.data.no_transaksi,
			waktu: checkoutTime,
		};
		resetKasir();
	}

	// ── Keyboard: search popup ────────────────────────────────────────────────
	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			searchSelectedIdx = Math.min(searchSelectedIdx + 1, Math.min(7, searchResults.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const sel = searchResults[searchSelectedIdx >= 0 ? searchSelectedIdx : 0];
			if (sel) tambahKeKeranjang(sel);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if (qrLarge) { qrLarge = false; return; }
			closeSearch();
		}
	}

	// ── Keyboard: pelanggan (dalam checkout) ──────────────────────────────────
	function onPelangganKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			pelangganSelectedIdx = Math.min(pelangganSelectedIdx + 1, pelangganList.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			pelangganSelectedIdx = Math.max(pelangganSelectedIdx - 1, 0);
		} else if (e.key === 'Enter' && pelangganSelectedIdx >= 0) {
			e.preventDefault(); pilihPelanggan(pelangganList[pelangganSelectedIdx]!);
		} else if (e.key === 'Escape') {
			e.preventDefault(); pelangganList = [];
		}
	}

	// ── Keyboard: global ──────────────────────────────────────────────────────
	function onKeydown(e: KeyboardEvent) {
		if (konfirmasiHapusIdx !== null) {
			if (e.key === 'Enter') { e.preventDefault(); hapusItem(konfirmasiHapusIdx); }
			else if (e.key === 'Escape') { e.preventDefault(); konfirmasiHapusIdx = null; }
			return;
		}

		const inInput = ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName ?? '');

		// barcode scanner detection (main screen only)
		if (!inInput && !popupSearch && !popupCheckout) {
			const now = Date.now();
			if (now - lastKeyTime < 50 && e.key.length === 1) {
				barcodeBuffer += e.key;
			} else if (e.key === 'Enter' && barcodeBuffer.length > 3) {
				const code = barcodeBuffer;
				barcodeBuffer = ''; lastKeyTime = 0;
				searchVal = code; openSearch(); cariBarang(code);
				return;
			} else {
				barcodeBuffer = e.key.length === 1 ? e.key : '';
			}
			lastKeyTime = now;
		}

		switch (e.key) {
			case 'F3':
				e.preventDefault();
				if (!popupCheckout) { popupSearch ? closeSearch() : openSearch(); }
				break;
			case 'F10':
				e.preventDefault();
				if (!popupSearch && !popupCheckout && $keranjang.length > 0) openCheckout();
				break;
			case 'F12':
				e.preventDefault();
				if (!popupSearch && !popupCheckout) resetKasir();
				break;
			case 'Escape':
				e.preventDefault();
				if (qrLarge)       { qrLarge = false;  return; }
				if (popupCheckout) { tutupCheckout();   return; }
				if (popupSearch)   { closeSearch();     return; }
				break;
		}

		// keranjang navigation
		if (!popupSearch && !popupCheckout && !inInput && $keranjang.length > 0) {
			if (e.key === 'ArrowRight' && $itemAktifIdx >= 0) {
				e.preventDefault(); ubahJumlah($itemAktifIdx, 1);
			} else if (e.key === 'ArrowLeft' && $itemAktifIdx >= 0) {
				e.preventDefault();
				const cur = $keranjang[$itemAktifIdx];
				if (cur && cur.jumlah <= 1) konfirmasiHapusIdx = $itemAktifIdx;
				else ubahJumlah($itemAktifIdx, -1);
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				itemAktifIdx.update(i => Math.min(i < 0 ? 0 : i + 1, $keranjang.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				itemAktifIdx.update(i => Math.max(i - 1, 0));
			}
		}
	}

	onMount(() => {
		scanSessionId = `kasir${page.data.user?.id ?? 0}`;
		scanUrl = `${location.protocol}//${location.host}/scan?s=${scanSessionId}`;
		QRCode.toDataURL(scanUrl, { width: 128, margin: 1 }).then((url) => { qrDataUrl = url; });
		connectKasirSse();
		startSseWatchdog();
		return () => {
			clearTimeout(searchTimer);
			clearTimeout(pelangganTimer);
			if (sseWatchdog) clearInterval(sseWatchdog);
			kasirSse?.close();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- ─── Main: Keranjang + Bottom Bar ─────────────────────────────────────── -->
<div class="flex flex-col flex-1 min-h-0">

	<!-- Keranjang table -->
	<div class="flex-1 overflow-y-auto min-h-0 rounded border" style="border-color:var(--border)">
		{#if $keranjang.length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-3" style="color:var(--text-dim)">
				<p class="text-sm">Keranjang kosong</p>
				<button
					onclick={openSearch}
					class="px-4 py-2 rounded border text-sm font-mono transition-all"
					style="border-color:var(--accent);color:var(--accent)">
					F3 · Cari / scan barang
				</button>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="sticky top-0" style="background:var(--surface2)">
					<tr style="color:var(--text-dim)">
						<th class="text-left px-3 py-2 font-medium w-6">#</th>
						<th class="text-left px-3 py-2 font-medium">Barang</th>
						<th class="text-right px-3 py-2 font-medium w-28">Harga</th>
						<th class="text-center px-2 py-2 font-medium w-28">Jml</th>
						<th class="text-right px-3 py-2 font-medium w-24">Diskon</th>
						<th class="text-right px-3 py-2 font-medium w-28">Subtotal</th>
						<th class="px-2 py-2 w-8"></th>
					</tr>
				</thead>
				<tbody>
					{#each $keranjang as item, idx}
						<tr
							class="border-t cursor-pointer"
							style="{$itemAktifIdx === idx
								? 'background:var(--surface2);outline:1px solid var(--accent);outline-offset:-1px'
								: 'border-color:var(--border)'}"
							onclick={() => itemAktifIdx.set(idx)}
						>
							<td class="px-3 py-2" style="color:var(--text-dim)">{idx + 1}</td>
							<td class="px-3 py-2">
								<div>{item.nama_barang}</div>
								<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
							</td>
							<td class="px-3 py-2 text-right font-mono">{rupiah(item.harga_jual)}</td>
							<td class="px-2 py-1">
								<div class="flex items-center justify-center gap-1">
									<button
										onclick={(e) => { e.stopPropagation(); if (item.jumlah <= 1) konfirmasiHapusIdx = idx; else ubahJumlah(idx, -1); }}
										class="w-6 h-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">−</button>
									<span class="w-8 text-center font-mono">{item.jumlah}</span>
									<button
										onclick={(e) => { e.stopPropagation(); ubahJumlah(idx, 1); }}
										class="w-6 h-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">+</button>
								</div>
								<div class="text-xs text-center mt-0.5" style="color:var(--text-dim)">{item.singkatan_satuan}</div>
							</td>
							<td class="px-3 py-1 text-right">
								<input
									type="number" min="0" step="500"
									value={item.diskon_item}
									oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
									onclick={(e) => e.stopPropagation()}
									class="w-20 text-right px-2 py-0.5 rounded border text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
							</td>
							<td class="px-3 py-2 text-right font-medium font-mono">
								{rupiah(item.harga_jual * item.jumlah)}
							</td>
							<td class="px-2 py-2 text-center">
								<button
									onclick={(e) => { e.stopPropagation(); konfirmasiHapusIdx = idx; }}
									class="text-xs" style="color:var(--danger)">✕</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Bottom bar -->
	<div class="shrink-0 border-t flex items-center justify-between gap-4 px-4 py-3"
		style="border-color:var(--border)">
		<div class="flex items-center gap-5 text-sm">
			<table class="text-sm">
				<tbody>
					<tr>
						<td style="color:var(--text-dim)">Subtotal</td>
						<td class="font-mono" style="color:var(--text)">&nbsp;&nbsp;{rupiah($subtotal)}</td>
					</tr>
					<tr>
						<td style="color:var(--text-dim)">Diskon</td>
						<td class="font-mono">&nbsp;−{rupiah($diskonTotal)}</td>
					</tr>
				</tbody>
			</table>
			<span class="ml-5 flex items-center gap-1">
			<span class="text-sm" style="color:var(--text-dim)">TOTAL&nbsp;</span><span class="font-mono text-4xl font-bold">{rupiah($total)}</span>
			</span>
		</div>
		<div class="flex items-center gap-2">
			{#if $keranjang.length > 0}
				<button
					onclick={() => resetKasir()}
					class="px-3 py-1 rounded text-xs border transition-all"
					style="border-color:var(--border);color:var(--danger)">F12 · Reset</button>
			{/if}
			<button
				onclick={openCheckout}
				disabled={$keranjang.length === 0}
				class="px-3 py-1 rounded font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
				style="background:var(--accent);color:var(--bg)">
				F10 · PROSES BAYAR
			</button>
		</div>
	</div>
</div>

<!-- ─── Spotlight Search ──────────────────────────────────────────────────── -->
{#if popupSearch}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex flex-col items-center pt-20 px-4"
		style="background:rgba(0,0,0,0.65)"
		onclick={closeSearch}
		role="none">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="flex items-start gap-3 w-full max-w-3xl"
			onclick={(e) => e.stopPropagation()}
			role="none">

		<!-- spotlight box -->
		<div
			class="flex-1 min-w-0 rounded-xl border overflow-hidden shadow-2xl"
			style="background:var(--surface);border-color:var(--border)"
			role="none">

			<!-- input row -->
			<div class="flex items-center gap-3 px-4 py-3 border-b" style="border-color:var(--border)">
				<!-- tipe toggle -->
				<div class="flex gap-1 shrink-0">
					{#each (['eceran', 'grosir'] as const) as t}
						<button
							onclick={() => tipeTransaksi.set(t)}
							class="px-2 py-0.5 rounded text-xs font-bold border transition-all"
							style="{$tipeTransaksi === t
								? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
								: 'border-color:var(--border);color:var(--text-dim)'}"
						>{t === 'eceran' ? 'ECR' : 'GRS'}</button>
					{/each}
				</div>
				<input
					bind:this={searchInputEl}
					type="text"
					placeholder="Cari nama atau kode barang..."
					bind:value={searchVal}
					oninput={() => cariBarang(searchVal)}
					onkeydown={onSearchKeydown}
					class="flex-1 bg-transparent outline-none text-base"
					style="color:var(--text)"
				/>
				{#if searchLoading}
					<span class="text-xs shrink-0" style="color:var(--text-dim)">mencari...</span>
				{/if}
				<kbd class="text-xs shrink-0 px-1.5 py-0.5 rounded border font-mono"
					style="border-color:var(--border);color:var(--text-dim)">ESC</kbd>
			</div>

			<!-- results -->
			{#if searchResults.length > 0}
				<div class="max-h-96 overflow-y-auto">
					{#each searchResults.slice(0, 8) as br, i}
						<button
							onclick={() => tambahKeKeranjang(br)}
							class="w-full text-left px-4 py-3 border-t transition-colors"
							style="border-color:var(--border);background:{searchSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
						>
							<div class="flex items-center justify-between gap-4">
								<div class="min-w-0">
									<span class="text-xs font-mono mr-2" style="color:var(--text-dim)">{br.kode_barang}</span>
									<span class="font-medium">{br.nama_barang}</span>
									<span class="text-xs ml-2"
										style="color:{br.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--text-dim)'}">
										stok {br.stok_sekarang} {br.singkatan_satuan ?? ''}
									</span>
								</div>
								<div class="flex gap-4 shrink-0 text-sm font-mono">
									<span style="color:{$tipeTransaksi === 'eceran' ? 'var(--accent)' : 'var(--text-dim)'}">
										<span class="text-xs mr-1" style="color:var(--text-dim)">ECR</span>
										{rupiah(br.harga_jual_eceran)}
									</span>
									<span style="color:{$tipeTransaksi === 'grosir' ? 'var(--accent)' : 'var(--text-dim)'}">
										<span class="text-xs mr-1" style="color:var(--text-dim)">GRS</span>
										{rupiah(br.harga_jual_grosir)}
									</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{:else if searchVal && !searchLoading}
				<p class="px-4 py-6 text-sm text-center" style="color:var(--text-dim)">Barang tidak ditemukan</p>
			{:else}
				<p class="px-4 py-4 text-xs text-center" style="color:var(--text-dim)">
					Ketik nama, kode, atau scan barcode — harga aktif: <span style="color:var(--accent)">{$tipeTransaksi.toUpperCase()}</span>
				</p>
			{/if}
		</div>

		<!-- QR panel: scan dari HP -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="shrink-0 rounded-xl border p-3 flex flex-col items-center gap-2 shadow-2xl cursor-pointer select-none"
			style="background:var(--surface);border-color:var(--border)"
			onclick={() => { if (qrDataUrl) qrLarge = true; }}
			role="none"
			title="Klik untuk perbesar QR">
			{#if qrDataUrl}
				<img src={qrDataUrl} alt="Scan dari HP" class="w-24 h-24 rounded" style="image-rendering:pixelated" />
			{:else}
				<div class="w-24 h-24 rounded animate-pulse" style="background:var(--surface2)"></div>
			{/if}
			<div class="flex items-center gap-1.5">
				<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{scannerStatus === 'connected' ? 'var(--accent)' : scannerStatus === 'disconnected' ? 'var(--warn)' : 'var(--border)'}"></span>
				<p class="text-xs" style="color:var(--text-dim)">
					{scannerStatus === 'connected' ? 'HP terhubung' : scannerStatus === 'disconnected' ? 'HP terputus' : 'HP scanner'}
				</p>
			</div>
			{#if scanSessionId}
				<p class="font-mono text-xs tracking-widest" style="color:var(--accent)">{scanSessionId}</p>
			{/if}
			<p class="text-xs" style="color:var(--text-dim)">↗ klik perbesar</p>
		</div>

		<!-- Large QR overlay -->
		{#if qrLarge}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="fixed inset-0 z-[60] flex items-center justify-center"
				style="background:rgba(0,0,0,0.88)"
				onclick={() => qrLarge = false}
				role="none">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="flex flex-col items-center gap-4" onclick={(e) => e.stopPropagation()} role="none">
					<img src={qrDataUrl} alt="Scan dari HP" class="w-80 h-80 rounded-xl" style="image-rendering:pixelated" />

					<p class="text-sm" style="color:var(--text-dim)">Arahkan HP ke QR · atau ketik manual:</p>

					<!-- URL manual -->
					<div class="rounded-lg border px-4 py-3 text-center" style="background:var(--surface);border-color:var(--border)">
						<p class="text-xs mb-1" style="color:var(--text-dim)">Buka di browser HP</p>
						<p class="font-mono text-base tracking-wide" style="color:var(--accent)">{scanUrl}</p>
					</div>

					<!-- fallback: host + session ID terpisah -->
					<div class="flex gap-6 text-center">
						<div>
							<p class="text-xs mb-0.5" style="color:var(--text-dim)">Alamat server</p>
							<p class="font-mono text-sm" style="color:var(--text)">{location.hostname}</p>
						</div>
						<div style="color:var(--border)">·</div>
						<div>
							<p class="text-xs mb-0.5" style="color:var(--text-dim)">Halaman</p>
							<p class="font-mono text-sm" style="color:var(--text)">/scan</p>
						</div>
						<div style="color:var(--border)">·</div>
						<div>
							<p class="text-xs mb-0.5" style="color:var(--text-dim)">Kode sesi</p>
							<p class="font-mono text-lg font-bold tracking-widest" style="color:var(--accent)">{scanSessionId}</p>
						</div>
					</div>

					<p class="text-xs" style="color:var(--text-dim)">klik luar / ESC untuk tutup</p>
				</div>
			</div>
		{/if}

		</div><!-- end flex row -->
	</div>
{/if}

<!-- ─── Checkout Popup ────────────────────────────────────────────────────── -->
{#if popupCheckout}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.7)"
		onclick={() => { if (!snap) tutupCheckout(); }}
		role="none">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="w-full max-w-3xl rounded-xl border overflow-hidden flex shadow-2xl"
			style="background:var(--surface);border-color:var(--border);max-height:90vh"
			onclick={(e) => e.stopPropagation()}
			role="none">

			<!-- ── Kolom 1: Input / Sukses ── -->
			<div class="flex-1 flex flex-col p-6 gap-4 overflow-y-auto min-w-0" style="min-width:0">

				{#if snap}
					<!-- sukses state -->
					<div class="flex flex-col items-center justify-center flex-1 gap-3 py-8 text-center">
						<div class="text-5xl" style="color:var(--accent)">✓</div>
						<p class="font-bold text-lg">Transaksi Berhasil</p>
						<p class="font-mono text-sm" style="color:var(--text-dim)">{snap.noTransaksi}</p>
						<button
							onclick={tutupCheckout}
							class="mt-4 px-6 py-2 rounded font-bold text-sm active:scale-95 transition-all"
							style="background:var(--accent);color:var(--bg)">
							Transaksi Baru (ESC)
						</button>
					</div>
				{:else}
					<!-- tipe + judul -->
					<div class="flex items-center justify-between">
						<h2 class="font-bold text-base">Proses Pembayaran</h2>
						<div class="flex gap-1">
							{#each (['eceran', 'grosir'] as const) as t}
								<button
									onclick={() => tipeTransaksi.set(t)}
									class="px-2 py-0.5 rounded text-xs font-bold border transition-all"
									style="{$tipeTransaksi === t
										? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}"
								>{t.toUpperCase()}</button>
							{/each}
						</div>
					</div>

					<!-- pelanggan -->
					<div class="flex flex-col gap-1.5">
						<p class="text-xs" style="color:var(--text-dim)">PELANGGAN <span style="opacity:0.5">(opsional)</span></p>
						{#if $pelangganDipilih}
							<div class="flex items-center justify-between px-3 py-2 rounded border"
								style="background:var(--surface2);border-color:var(--border)">
								<span class="text-sm">
									{$pelangganDipilih.nama}
									{#if $pelangganDipilih.gender === 'pria'}<span class="ml-1" style="color:#40c4ff">♂</span>
									{:else if $pelangganDipilih.gender === 'wanita'}<span class="ml-1" style="color:#ff80ab">♀</span>{/if}
									{#if $pelangganDipilih.diskon_member && $pelangganDipilih.diskon_member > 0}
										<span class="ml-2 text-xs" style="color:var(--accent)">−{$pelangganDipilih.diskon_member}%</span>
									{/if}
								</span>
								<button onclick={() => pelangganDipilih.set(null)} class="text-xs ml-2" style="color:var(--danger)">✕</button>
							</div>
						{:else}
							<div class="relative">
								<input
									bind:this={pelangganInputEl}
									type="text"
									placeholder="Cari nama pelanggan (min. 3 karakter)..."
									value={pelangganQuery}
									oninput={(e) => muatPelanggan((e.target as HTMLInputElement).value)}
									onkeydown={onPelangganKeydown}
									class="w-full px-3 py-2 rounded border text-sm outline-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
								{#if pelangganList.length > 0}
									<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border max-h-40 overflow-y-auto shadow-lg"
										style="background:var(--surface);border-color:var(--border)">
										{#each pelangganList as p, i}
											<button
												onclick={() => pilihPelanggan(p)}
												class="w-full text-left px-3 py-2 text-sm border-t"
												style="border-color:var(--border);background:{pelangganSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
											>
												{p.nama}
												{#if p.gender === 'pria'}<span class="ml-1" style="color:#40c4ff">♂</span>
												{:else if p.gender === 'wanita'}<span class="ml-1" style="color:#ff80ab">♀</span>{/if}
												{#if p.no_kartu}<span class="ml-2 font-mono text-xs" style="color:var(--accent)">{p.no_kartu}</span>{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- metode bayar -->
					<div class="flex flex-col gap-1.5">
						<p class="text-xs" style="color:var(--text-dim)">METODE BAYAR</p>
						<div class="grid grid-cols-4 gap-1.5">
							{#each METODE as m}
								<button
									onclick={() => metodeBayar.set(m)}
									class="py-2 rounded text-sm font-bold border transition-all"
									style="{$metodeBayar === m
										? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}"
								>{METODE_LABEL[m]}</button>
							{/each}
						</div>
					</div>

					<!-- nominal bayar -->
					{#if $metodeBayar !== 'hutang'}
						<div class="flex flex-col gap-1.5">
							<label for="nominal-checkout" class="text-xs" style="color:var(--text-dim)">NOMINAL BAYAR</label>
							<input
								id="nominal-checkout"
								bind:this={bayarInputEl}
								type="number" min="0" step="500"
								bind:value={$nominalBayar}
								placeholder="0"
								class="w-full px-3 py-3 rounded border text-right text-xl font-bold font-mono outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								style="background:var(--surface2);border-color:var(--border);color:var(--text)"
							/>
							{#if Number($nominalBayar) >= $total && $total > 0}
								<div class="flex justify-between px-1 text-sm">
									<span style="color:var(--text-dim)">Kembalian</span>
									<span class="font-bold font-mono" style="color:var(--accent)">Rp {rupiah($kembalian)}</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- error -->
					{#if errorMsg}
						<p class="text-xs px-3 py-2 rounded"
							style="background:color-mix(in srgb,var(--danger) 15%,transparent);color:var(--danger)">{errorMsg}</p>
					{/if}

					<!-- actions -->
					<div class="flex gap-2 mt-auto pt-2">
						<button
							onclick={tutupCheckout}
							class="flex-1 py-2 rounded text-sm border transition-all"
							style="border-color:var(--border);color:var(--text-dim)">
							Batal (ESC)
						</button>
						<button
							onclick={prosesBayar}
							disabled={prosesLoading}
							class="flex-1 py-2.5 rounded font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
							style="background:var(--accent);color:var(--bg)">
							{prosesLoading ? 'MEMPROSES...' : 'SELESAI ✓'}
						</button>
					</div>
				{/if}
			</div>

			<!-- ── Kolom 2: Preview Struk ── -->
			<div class="w-60 shrink-0 border-l flex flex-col" style="border-color:var(--border);background:var(--surface2)">
				<!-- struk content -->
				<div class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed" style="color:var(--text)">

					<div class="text-center mb-2">
						<div class="font-bold text-sm tracking-widest">TOKO SEMBAKO</div>
						<div class="text-xs" style="color:var(--text-dim)">
							{formatTgl(checkoutTime)} · {formatJam(checkoutTime)}
						</div>
						{#if strukPelanggan}
							<div class="mt-0.5" style="color:var(--accent)">{strukPelanggan.nama}</div>
						{/if}
					</div>

					<div class="border-t border-dashed my-2" style="border-color:var(--text-dim);opacity:0.3"></div>

					{#each strukItems as item}
						<div class="mb-1.5">
							<div class="truncate font-medium">{item.nama_barang}</div>
							<div class="flex justify-between" style="color:var(--text-dim)">
								<span>{item.jumlah} × {rupiah(item.harga_jual)}</span>
								<span style="color:var(--text)">{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}</span>
							</div>
							{#if item.diskon_item > 0}
								<div class="text-left" style="color:var(--accent)">−{rupiah(item.diskon_item)}</div>
							{/if}
						</div>
					{/each}

					<div class="border-t border-dashed my-2" style="border-color:var(--text-dim);opacity:0.3"></div>

					{#if strukDiskon > 0}
						<div class="flex justify-between mb-1" style="color:var(--accent)">
							<span>Diskon member</span>
							<span>−{rupiah(strukDiskon)}</span>
						</div>
					{/if}

					<div class="flex justify-between font-bold text-sm">
						<span>TOTAL</span>
						<span style="color:var(--accent)">Rp {rupiah(strukTotal)}</span>
					</div>

						<div class="mt-1 flex flex-col gap-0.5" style="color:var(--text-dim)">
							<div class="flex justify-between">
								<span>{METODE_LABEL[strukMetode]}</span>
								<span>{rupiah(strukNominal)}</span>
							</div>
								<div class="flex justify-between">
									<span>Kembali</span>
									<span style="color:var(--text)">{rupiah(strukKembali)}</span>
								</div>
						</div>
					{#if strukMetode === 'hutang'}
						<div class="text-center mt-1 text-xs font-bold" style="color:var(--warn)">── HUTANG ──</div>
					{/if}

					<div class="border-t border-dashed my-2" style="border-color:var(--text-dim);opacity:0.3"></div>
					<div class="text-center" style="color:var(--text-dim)">Terima kasih</div>

					{#if snap}
						<div class="text-center mt-1 text-xs" style="color:var(--accent)">{snap.noTransaksi}</div>
					{/if}
				</div>

				<!-- cetak / wa -->
				<div class="shrink-0 p-3 border-t flex flex-col gap-2" style="border-color:var(--border)">
					<button
						onclick={() => window.print()}
						class="w-full py-2 rounded text-xs border font-medium transition-all hover:opacity-80"
						style="border-color:var(--border);color:var(--text-dim)">
						Cetak Struk
					</button>
					<button
						disabled={!snap && !strukPelanggan}
						class="w-full py-2 rounded text-xs border font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="border-color:var(--border);color:var(--text-dim)">
						Kirim via WhatsApp
					</button>
				</div>
			</div>

		</div>
	</div>
{/if}

<!-- ─── Modal konfirmasi hapus ──────────────────────────────────────────────── -->
{#if konfirmasiHapusIdx !== null}
	<div class="fixed inset-0 z-40 flex items-center justify-center" style="background:rgba(0,0,0,0.55)">
		<div class="rounded-lg border p-6 text-center w-72" style="background:var(--surface);border-color:var(--border)">
			<p class="font-bold mb-1">Hapus dari keranjang?</p>
			<p class="text-sm mb-5" style="color:var(--text-dim)">{$keranjang[konfirmasiHapusIdx]?.nama_barang ?? ''}</p>
			<div class="flex gap-2 justify-center">
				<button
					onclick={() => hapusItem(konfirmasiHapusIdx!)}
					class="px-4 py-1.5 rounded font-bold text-sm active:scale-95 transition-all"
					style="background:var(--danger);color:#fff">Ya (Enter)</button>
				<button
					onclick={() => konfirmasiHapusIdx = null}
					class="px-4 py-1.5 rounded text-sm border active:scale-95 transition-all"
					style="border-color:var(--border);color:var(--text-dim)">Batal (ESC)</button>
			</div>
		</div>
	</div>
{/if}
