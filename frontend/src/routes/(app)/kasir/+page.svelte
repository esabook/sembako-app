<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		keranjang, tipeTransaksi, metodeBayar,
		pelangganDipilih, nominalBayar, itemAktifIdx,
		subtotal, diskonMember, diskonTotal, total, kembalian,
		resetKasir,
		kasirMode, initKasirMode, setModeOverride,
		type KasirMode,
	} from '$lib/stores/kasir';
	import {
		// state
		searchVal, searchResults, searchSelectedIdx, cariLoading,
		pelangganQuery, pelangganList, pelangganSelectedIdx,
		konfirmasiHapusIdx, popupSearch, popupCheckout,
		snap, checkoutTime,
		scanSessionId, scanUrl, qrDataUrl, qrLarge, scannerStatus,
		prosesLoading,
		// actions
		cariBarang, openSearch, closeSearch, scanDariPhone,
		tambahKeKeranjang, ubahJumlah, hapusItem, ubahDiskon,
		muatPelanggan, pilihPelanggan,
		openCheckout, tutupCheckout, prosesBayar,
		initKasirScan, cleanupKasirScan,
		kirimStrukWA,
		kirimNotifHutangWA,
		loadPromoAktif, promoTotalBerlaku, diskonPromoTotal, totalAkhir,
		kasBankDipilih,
	} from './kasir.store';
	import { rupiah, formatTgl, formatJam, METODE, METODE_LABEL } from './kasir.logic';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';

	// ── Akun kas/bank (untuk selector checkout) ──────────────────────────────
	let daftarKasBank = $state<{ id: number; nama: string; tipe: string }[]>([])

	// ── Pengaturan toko (untuk struk) ────────────────────────────────────────
	let namaToko   = $state('Toko Sembako')
	let alamatToko = $state('')
	let strHeader  = $state('')
	let strFooter  = $state('Terima kasih sudah berbelanja!')
	let strUkuran  = $state('80')

	// ── Derived (struk: live atau dari snapshot) ──────────────────────────────
	const strukItems    = $derived($snap?.items    ?? $keranjang);
	const strukSubtotal = $derived($snap?.subtotal ?? $subtotal);
	const strukDiskon   = $derived($snap?.diskon   ?? $diskonMember);
	const strukTotal    = $derived($snap?.total    ?? $total);
	const strukMetode   = $derived($snap?.metode   ?? $metodeBayar);
	const strukNominal  = $derived($snap ? $snap.nominal  : Number($nominalBayar));
	const strukKembali  = $derived($snap ? $snap.kembalian : $kembalian);
	const strukPelanggan = $derived($snap?.pelanggan ?? $pelangganDipilih);

	// ── Mode GUIDED / NORMAL / PRO ────────────────────────────────────────────
	const MODE_ORDER: KasirMode[] = ['guided', 'normal', 'pro'];
	const MODE_LABEL: Record<KasirMode, string> = { guided: 'GUIDED', normal: 'NORMAL', pro: 'PRO' };
	function cycleMode() {
		const cur = $kasirMode;
		const next = MODE_ORDER[(MODE_ORDER.indexOf(cur) + 1) % MODE_ORDER.length]!;
		setModeOverride(next);
	}

	// Reset confirm (GUIDED mode only)
	let konfirmasiReset = $state(false);

	// ── DOM refs ──────────────────────────────────────────────────────────────
	let searchInputEl:   HTMLInputElement | undefined = $state();
	let pelangganInputEl: HTMLInputElement | undefined = $state();
	let bayarInputEl:    HTMLInputElement | undefined = $state();

	// ── Fokus otomatis saat popup terbuka ─────────────────────────────────────
	$effect(() => {
		if ($popupSearch)   setTimeout(() => searchInputEl?.focus(), 0);
	});
	$effect(() => {
		if ($popupCheckout) setTimeout(() => bayarInputEl?.focus(), 50);
	});

	// ── Debounce cari barang (DOM concern — exception per CLAUDE_v2.md) ───────
	let cariTimer: ReturnType<typeof setTimeout>;
	function handleSearchInput() {
		clearTimeout(cariTimer);
		cariTimer = setTimeout(() => cariBarang($searchVal), 200);
	}

	// ── Debounce cari pelanggan ────────────────────────────────────────────────
	let pelangganTimer: ReturnType<typeof setTimeout>;
	function handlePelangganInput(q: string) {
		clearTimeout(pelangganTimer);
		pelangganTimer = setTimeout(() => muatPelanggan(q), 200);
	}

	// ── Barcode scanner: buffer untuk USB/BT scanner ──────────────────────────
	let lastKeyTime = 0;
	let barcodeBuffer = '';

	// ── Keyboard: search popup ────────────────────────────────────────────────
	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			searchSelectedIdx.update((i) => Math.min(i + 1, Math.min(7, $searchResults.length - 1)));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			searchSelectedIdx.update((i) => Math.max(i - 1, 0));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const idx = $searchSelectedIdx >= 0 ? $searchSelectedIdx : 0;
			const sel = $searchResults[idx];
			if (sel) tambahKeKeranjang(sel);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if ($qrLarge) { qrLarge.set(false); return; }
			closeSearch();
		}
	}

	// ── Keyboard: pelanggan dalam checkout ────────────────────────────────────
	function onPelangganKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			pelangganSelectedIdx.update((i) => Math.min(i + 1, $pelangganList.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			pelangganSelectedIdx.update((i) => Math.max(i - 1, 0));
		} else if (e.key === 'Enter' && $pelangganSelectedIdx >= 0) {
			e.preventDefault();
			const p = $pelangganList[$pelangganSelectedIdx];
			if (p) pilihPelanggan(p);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			pelangganList.set([]);
		}
	}

	// ── Keyboard: global ──────────────────────────────────────────────────────
	function onKeydown(e: KeyboardEvent) {
		if (konfirmasiReset) {
			if (e.key === 'Enter') { e.preventDefault(); konfirmasiReset = false; resetKasir(); }
			else if (e.key === 'Escape') { e.preventDefault(); konfirmasiReset = false; }
			return;
		}

		if ($konfirmasiHapusIdx !== null) {
			if (e.key === 'Enter') { e.preventDefault(); hapusItem($konfirmasiHapusIdx); }
			else if (e.key === 'Escape') { e.preventDefault(); konfirmasiHapusIdx.set(null); }
			return;
		}

		const inInput = ['INPUT', 'TEXTAREA'].includes(
			(document.activeElement as HTMLElement)?.tagName ?? ''
		);

		// barcode scanner detection (hanya di main screen)
		if (!inInput && !$popupSearch && !$popupCheckout) {
			const now = Date.now();
			if (now - lastKeyTime < 50 && e.key.length === 1) {
				barcodeBuffer += e.key;
			} else if (e.key === 'Enter' && barcodeBuffer.length > 3) {
				const code = barcodeBuffer;
				barcodeBuffer = ''; lastKeyTime = 0;
				searchVal.set(code);
				openSearch();
				void cariBarang(code);
				return;
			} else {
				barcodeBuffer = e.key.length === 1 ? e.key : '';
			}
			lastKeyTime = now;
		}

		switch (e.key) {
			case 'F3':
				e.preventDefault();
				if (!$popupCheckout) { $popupSearch ? closeSearch() : openSearch(); }
				break;
			case 'F10':
				e.preventDefault();
				if (!$popupSearch && !$popupCheckout && $keranjang.length > 0) openCheckout();
				break;
			case 'F11':
				e.preventDefault();
				if (!$popupSearch && !$popupCheckout) {
					if (shiftAktif) void bukaTutupShift(); else void bukaBukaShift();
				}
				break;
			case 'F12':
				e.preventDefault();
				if (!$popupSearch && !$popupCheckout && $keranjang.length > 0) {
					if ($kasirMode === 'guided') konfirmasiReset = true;
					else resetKasir();
				}
				break;
			case 'Escape':
				e.preventDefault();
				if ($qrLarge)       { qrLarge.set(false);  return; }
				if ($popupCheckout) { tutupCheckout();      return; }
				if ($popupSearch)   { closeSearch();        return; }
				break;
		}

		// navigasi keranjang
		if (!$popupSearch && !$popupCheckout && !inInput && $keranjang.length > 0) {
			if (e.key === 'ArrowRight' && $itemAktifIdx >= 0) {
				e.preventDefault(); ubahJumlah($itemAktifIdx, 1);
			} else if (e.key === 'ArrowLeft' && $itemAktifIdx >= 0) {
				e.preventDefault();
				const cur = $keranjang[$itemAktifIdx];
				if (cur && cur.jumlah <= 1) konfirmasiHapusIdx.set($itemAktifIdx);
				else ubahJumlah($itemAktifIdx, -1);
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				itemAktifIdx.update((i) => Math.min(i < 0 ? 0 : i + 1, $keranjang.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				itemAktifIdx.update((i) => Math.max(i - 1, 0));
			}
		}
	}

	// ── Shift management ─────────────────────────────────────────────────────

	type ShiftAktif = {
		id: number; tanggal: string; jam_buka: string; kas_awal: number;
		jumlah_transaksi: number; total_penjualan: number; status: string;
	}

	let shiftAktif = $state<ShiftAktif | null>(null)
	let modalBukaShift = $state(false)
	let modalTutupShift = $state(false)
	let kasAwal = $state(0)
	let kasFisik = $state(0)
	let catatanShift = $state('')
	let savingShift = $state(false)

	async function muatShiftAktif() {
		const res = await api.get<ShiftAktif | null>('/shift/aktif')
		if (res.success) shiftAktif = res.data
	}

	async function bukaBukaShift() {
		await muatShiftAktif()
		if (shiftAktif) { toast.warn('Shift hari ini sudah dibuka'); return }
		kasAwal = 0; catatanShift = ''
		modalBukaShift = true
	}

	async function simpanBukaShift() {
		savingShift = true
		const res = await api.post<ShiftAktif>('/shift/buka', { kas_awal: kasAwal, catatan: catatanShift || undefined })
		savingShift = false
		if (!res.success) { toast.error(res.error ?? 'Gagal buka shift'); return }
		shiftAktif = res.data!
		modalBukaShift = false
		toast.sukses('Shift dibuka')
	}

	async function bukaTutupShift() {
		if (!shiftAktif) { toast.warn('Buka shift terlebih dahulu'); return }
		await muatShiftAktif()
		kasFisik = 0; catatanShift = ''
		modalTutupShift = true
	}

	async function simpanTutupShift() {
		savingShift = true
		const res = await api.post('/shift/tutup', { kas_fisik: kasFisik, catatan: catatanShift || undefined })
		savingShift = false
		if (!res.success) { toast.error(res.error ?? 'Gagal tutup shift'); return }
		shiftAktif = null
		modalTutupShift = false
		toast.sukses('Shift ditutup')
	}

	// ── Cetak struk (popup window, thermal receipt) ──────────────────────────
	function cetakStruk() {
		const lebar = strUkuran === '58' ? '58mm' : '80mm'
		const rp = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
		const tgl = $checkoutTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
		const jam = $checkoutTime.toTimeString().slice(0, 5)
		const METODE_STR: Record<string, string> = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', hutang: 'Hutang' }

		const itemsHtml = strukItems.map((item) => `
			<div style="font-weight:600">${item.nama_barang}</div>
			<div style="display:flex;justify-content:space-between;font-size:8.5pt;color:#444">
				<span>${item.jumlah}${item.singkatan_satuan ? ' ' + item.singkatan_satuan : ''} &times; ${rp(item.harga_jual)}</span>
				<span style="color:#000">${rp(item.harga_jual * item.jumlah - item.diskon_item)}</span>
			</div>
			${item.diskon_item > 0 ? `<div style="font-size:8pt;color:#b36000">&nbsp;&nbsp;diskon &minus;${rp(item.diskon_item)}</div>` : ''}
		`).join('')

		const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Struk</title>
<style>
@page{size:${lebar} auto;margin:4mm 5mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:9.5pt;color:#000;width:100%}
hr{border:none;border-top:1px dashed #000;margin:5px 0}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:12pt">${namaToko}</div>
${alamatToko ? `<div style="text-align:center;font-size:8pt">${alamatToko}</div>` : ''}
${strHeader ? `<div style="text-align:center;font-size:8pt">${strHeader}</div>` : ''}
<div style="text-align:center;font-size:8pt;color:#555">${tgl} &middot; ${jam}</div>
${strukPelanggan ? `<div style="text-align:center;font-size:8.5pt">Pelanggan: <b>${strukPelanggan.nama}</b></div>` : ''}
<hr>
${itemsHtml}
<hr>
${strukDiskon > 0 ? `<div style="display:flex;justify-content:space-between;font-size:8.5pt"><span>Diskon member</span><span>&minus;${rp(strukDiskon)}</span></div>` : ''}
<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:11pt;margin-top:2px">
	<span>TOTAL</span><span>Rp ${rp(strukTotal)}</span>
</div>
<hr>
<div style="display:flex;justify-content:space-between;font-size:8.5pt">
	<span>${METODE_STR[strukMetode] ?? strukMetode}</span><span>${rp(strukNominal)}</span>
</div>
<div style="display:flex;justify-content:space-between;font-size:8.5pt">
	<span>Kembali</span><span>${rp(strukKembali)}</span>
</div>
${strukMetode === 'hutang' ? '<div style="text-align:center;font-weight:bold;font-size:8.5pt;margin-top:3px">[ TRANSAKSI HUTANG ]</div>' : ''}
<hr>
<div style="text-align:center;font-size:8pt">${strFooter}</div>
${$snap?.noTransaksi ? `<div style="text-align:center;font-size:7.5pt;color:#888;margin-top:2px">${$snap.noTransaksi}</div>` : ''}
</body></html>`

		const w = window.open('', '_blank', 'width=420,height=700,menubar=no,toolbar=no')
		if (!w) { toast.error('Popup diblokir browser — izinkan popup untuk halaman ini'); return }
		w.document.write(html)
		w.document.close()
		w.onload = () => { w.print(); w.close() }
	}

	onMount(() => {
		initKasirMode();
		void loadPromoAktif();
		void api.get<{ id: number; nama: string; tipe: string }[]>('/keuangan/kas-bank').then((res) => {
			if (res.success) daftarKasBank = res.data;
		});
		void initKasirScan(page.data.user?.id ?? 0, location.host, location.protocol);
		void muatShiftAktif();
		void api.get<Record<string, string>>('/pengaturan').then((res) => {
			if (!res.success) return
			const s = res.data
			if (s.nama_toko)    namaToko   = s.nama_toko
			if (s.alamat)       alamatToko = s.alamat
			if (s.struk_header) strHeader  = s.struk_header
			if (s.struk_footer) strFooter  = s.struk_footer
			if (s.struk_ukuran) strUkuran  = s.struk_ukuran
		})
		return () => {
			clearTimeout(cariTimer);
			clearTimeout(pelangganTimer);
			cleanupKasirScan();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- ─── Main: Keranjang + Bottom Bar ─────────────────────────────────────── -->
<div class="flex flex-1 min-h-0 flex-col">

	<!-- Keranjang table -->
	<div class="flex-1 overflow-y-auto min-h-0 rounded border" style="border-color:var(--border)">
		{#if $keranjang.length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-3" style="color:var(--text-dim)">
				{#if $kasirMode === 'guided'}
					<p class="text-xs font-bold tracking-widest" style="color:var(--text-dim)">PANDUAN KASIR</p>
					<div class="flex flex-col gap-2 text-sm text-left">
						<div class="flex items-center gap-3">
							<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:var(--accent);color:var(--bg)">1</span>
							<span>Tekan <kbd class="px-1.5 py-0.5 rounded border font-mono text-xs" style="border-color:var(--border)">F3</kbd> atau klik tombol di bawah untuk cari barang</span>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:var(--surface2);color:var(--text-dim)">2</span>
							<span>Tekan <kbd class="px-1.5 py-0.5 rounded border font-mono text-xs" style="border-color:var(--border)">Enter</kbd> untuk tambah barang ke keranjang</span>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:var(--surface2);color:var(--text-dim)">3</span>
							<span>Tekan <kbd class="px-1.5 py-0.5 rounded border font-mono text-xs" style="border-color:var(--border)">F10</kbd> untuk proses pembayaran</span>
						</div>
					</div>
				{:else}
					<p class="text-sm">Keranjang kosong</p>
				{/if}
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
					{#each $keranjang as item, idx (item.barang_id)}
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
										onclick={(e) => { e.stopPropagation(); if (item.jumlah <= 1) konfirmasiHapusIdx.set(idx); else ubahJumlah(idx, -1); }}
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
								{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
							</td>
							<td class="px-2 py-2 text-center">
								<button
									onclick={(e) => { e.stopPropagation(); konfirmasiHapusIdx.set(idx); }}
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
				<span class="text-sm" style="color:var(--text-dim)">TOTAL&nbsp;</span>
				<span class="font-mono text-4xl font-bold">{rupiah($totalAkhir)}</span>
			</span>
		</div>
		<div class="flex items-center gap-2">
			<!-- mode badge: klik untuk ganti manual -->
			<button
				onclick={cycleMode}
				title="Mode kasir — klik untuk ganti"
				class="px-2 py-0.5 rounded text-xs font-bold font-mono border transition-all"
				style="{$kasirMode === 'guided'
					? 'border-color:var(--info);color:var(--info)'
					: $kasirMode === 'pro'
					? 'border-color:var(--accent);color:var(--accent)'
					: 'border-color:var(--border);color:var(--text-dim)'}">
				{MODE_LABEL[$kasirMode]}
			</button>
			<a href="/kasir/retur"
				class="px-3 py-1 rounded text-xs border transition-all"
				style="border-color:var(--border);color:var(--text-dim)">
				{$kasirMode === 'pro' ? 'Retur' : 'Retur'}
			</a>
			<!-- Shift indicator + buka/tutup -->
			{#if shiftAktif}
				<button
					onclick={bukaTutupShift}
					class="px-3 py-1 rounded text-xs border transition-all"
					style="border-color:var(--warn);color:var(--warn)">
					{$kasirMode === 'pro' ? 'F11' : 'F11 · Tutup Shift'}
				</button>
			{:else}
				<button
					onclick={bukaBukaShift}
					class="px-3 py-1 rounded text-xs border transition-all"
					style="border-color:var(--border);color:var(--text-dim)">
					{$kasirMode === 'pro' ? 'F11' : 'F11 · Buka Shift'}
				</button>
			{/if}
			{#if $keranjang.length > 0}
				<button
					onclick={() => { if ($kasirMode === 'guided') konfirmasiReset = true; else resetKasir(); }}
					class="px-3 py-1 rounded text-xs border transition-all"
					style="border-color:var(--border);color:var(--danger)">
					{$kasirMode === 'pro' ? 'F12' : 'F12 · Reset'}
				</button>
			{/if}
			<button
				onclick={openCheckout}
				disabled={$keranjang.length === 0}
				class="px-3 py-1 rounded font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
				style="background:var(--accent);color:var(--bg)">
				{$kasirMode === 'pro' ? 'F10' : 'F10 · PROSES BAYAR'}
			</button>
		</div>
	</div>
</div>

<!-- ─── Spotlight Search ──────────────────────────────────────────────────── -->
{#if $popupSearch}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center pt-20 px-4"
		style="background:rgba(0,0,0,0.65)"
		onclick={closeSearch}
		role="none">
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
					{#each (['eceran', 'grosir'] as const) as t (t)}
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
					bind:value={$searchVal}
					oninput={handleSearchInput}
					onkeydown={onSearchKeydown}
					class="flex-1 bg-transparent outline-none text-base"
					style="color:var(--text)"
				/>
				{#if $cariLoading}
					<span class="text-xs shrink-0" style="color:var(--text-dim)">mencari...</span>
				{/if}
				<kbd class="text-xs shrink-0 px-1.5 py-0.5 rounded border font-mono"
					style="border-color:var(--border);color:var(--text-dim)">ESC</kbd>
			</div>

			<!-- results -->
			{#if $searchResults.length > 0}
				<div class="max-h-96 overflow-y-auto">
					{#each $searchResults.slice(0, 8) as br, i (br.id)}
						<button
							onclick={() => tambahKeKeranjang(br)}
							class="w-full text-left px-4 py-3 border-t transition-colors"
							style="border-color:var(--border);background:{$searchSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
						>
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-3 min-w-0">
									{#if br.foto_path}
										<img src="/uploads/{br.foto_path.replace('med_', 'thumb_')}" alt={br.nama_barang}
											class="w-9 h-9 rounded object-cover shrink-0"
											style="border:1px solid var(--border)" />
									{:else}
										<div class="w-9 h-9 rounded shrink-0" style="background:var(--surface2);border:1px solid var(--border)"></div>
									{/if}
									<div class="min-w-0">
										<span class="text-xs font-mono mr-2" style="color:var(--text-dim)">{br.kode_barang}</span>
										<span class="font-medium">{br.nama_barang}</span>
										<span class="text-xs ml-2"
											style="color:{br.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--text-dim)'}">
											stok {br.stok_sekarang} {br.singkatan_satuan ?? ''}
										</span>
									</div>
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
			{:else if $searchVal && !$cariLoading}
				<p class="px-4 py-6 text-sm text-center" style="color:var(--text-dim)">Barang tidak ditemukan</p>
			{:else}
				<p class="px-4 py-4 text-xs text-center" style="color:var(--text-dim)">
					Ketik nama, kode, atau scan barcode — harga aktif: <span style="color:var(--accent)">{$tipeTransaksi.toUpperCase()}</span>
				</p>
			{/if}
		</div>

		<!-- QR panel: scan dari HP -->
		<div
			class="shrink-0 rounded-xl border p-3 flex flex-col items-center gap-2 shadow-2xl cursor-pointer select-none"
			style="background:var(--surface);border-color:var(--border)"
			onclick={() => { if ($qrDataUrl) qrLarge.set(true); }}
			role="none"
			title="Klik untuk perbesar QR">
			{#if $qrDataUrl}
				<img src={$qrDataUrl} alt="Scan dari HP" class="w-24 h-24 rounded" style="image-rendering:pixelated" />
			{:else}
				<div class="w-24 h-24 rounded animate-pulse" style="background:var(--surface2)"></div>
			{/if}
			<div class="flex items-center gap-1.5">
				<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{$scannerStatus === 'connected' ? 'var(--accent)' : $scannerStatus === 'disconnected' ? 'var(--warn)' : 'var(--border)'}"></span>
				<p class="text-xs" style="color:var(--text-dim)">
					{$scannerStatus === 'connected' ? 'HP terhubung' : $scannerStatus === 'disconnected' ? 'HP terputus' : 'HP scanner'}
				</p>
			</div>
			{#if $scanSessionId}
				<p class="font-mono text-xs tracking-widest" style="color:var(--accent)">{$scanSessionId}</p>
			{/if}
			<p class="text-xs" style="color:var(--text-dim)">↗ klik perbesar</p>
		</div>

		<!-- Large QR overlay -->
		{#if $qrLarge}
			<div
				class="fixed inset-0 z-[60] flex items-center justify-center"
				style="background:rgba(0,0,0,0.88)"
				onclick={() => qrLarge.set(false)}
				role="none">
				<div class="flex flex-col items-center gap-4" onclick={(e) => e.stopPropagation()} role="none">
					<img src={$qrDataUrl} alt="Scan dari HP" class="w-80 h-80 rounded-xl" style="image-rendering:pixelated" />
					<p class="text-sm" style="color:var(--text-dim)">Arahkan HP ke QR · atau ketik manual:</p>
					<div class="rounded-lg border px-4 py-3 text-center" style="background:var(--surface);border-color:var(--border)">
						<p class="text-xs mb-1" style="color:var(--text-dim)">Buka di browser HP</p>
						<p class="font-mono text-base tracking-wide" style="color:var(--accent)">{$scanUrl}</p>
					</div>
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
							<p class="font-mono text-lg font-bold tracking-widest" style="color:var(--accent)">{$scanSessionId}</p>
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
{#if $popupCheckout}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.7)"
		onclick={() => { if (!$snap) tutupCheckout(); }}
		role="none">
		<div
			class="w-full max-w-3xl rounded-xl border overflow-hidden flex shadow-2xl"
			style="background:var(--surface);border-color:var(--border);max-height:90vh"
			onclick={(e) => e.stopPropagation()}
			role="none">

			<!-- ── Kolom 1: Input / Sukses ── -->
			<div class="flex-1 flex flex-col p-6 gap-4 overflow-y-auto min-w-0">

				{#if $snap}
					<!-- sukses state -->
					<div class="flex flex-col items-center justify-center flex-1 gap-3 py-8 text-center">
						<div class="text-5xl" style="color:var(--accent)">✓</div>
						<p class="font-bold text-lg">Transaksi Berhasil</p>
						<p class="font-mono text-sm" style="color:var(--text-dim)">{$snap.noTransaksi}</p>
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
							{#each (['eceran', 'grosir'] as const) as t (t)}
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
									placeholder="Cari nama/kartu pelanggan (min. 3 karakter)"
									value={$pelangganQuery}
									oninput={(e) => handlePelangganInput((e.target as HTMLInputElement).value)}
									onkeydown={onPelangganKeydown}
									class="w-full px-3 py-2 rounded border text-sm outline-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
								{#if $pelangganList.length > 0}
									<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border max-h-40 overflow-y-auto shadow-lg"
										style="background:var(--surface);border-color:var(--border)">
										{#each $pelangganList as p, i (p.id)}
											<button
												onclick={() => pilihPelanggan(p)}
												class="w-full text-left px-3 py-2 text-sm border-t"
												style="border-color:var(--border);background:{$pelangganSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
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
							{#each METODE as m (m)}
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

					<!-- akun kas/bank (hanya untuk transfer/QRIS) -->
					{#if $metodeBayar === 'transfer' || $metodeBayar === 'qris'}
						<div class="flex flex-col gap-1.5">
							<p class="text-xs" style="color:var(--text-dim)">AKUN TUJUAN</p>
							<div class="flex flex-wrap gap-1.5">
								{#each daftarKasBank as kb (kb.id)}
									<button
										onclick={() => kasBankDipilih.set(kb.id)}
										class="px-3 py-1.5 rounded text-xs font-bold border transition-all"
										style="{$kasBankDipilih === kb.id
											? 'background:var(--info);color:var(--bg);border-color:var(--info)'
											: 'border-color:var(--border);color:var(--text-dim)'}"
									>{kb.nama}</button>
								{/each}
							</div>
						</div>
					{/if}

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
							{#if Number($nominalBayar) >= $totalAkhir && $totalAkhir > 0}
								<div class="flex justify-between px-1 text-sm">
									<span style="color:var(--text-dim)">Kembalian</span>
									<span class="font-bold font-mono" style="color:var(--accent)">Rp {rupiah($kembalian)}</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Promo total berlaku -->
					{#if $promoTotalBerlaku.length > 0}
						<div class="flex flex-col gap-1">
							{#each $promoTotalBerlaku as p (p.id)}
								<div class="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
									style="background:var(--surface2);border:1px solid var(--accent);color:var(--accent)">
									<span>🎁</span>
									<span class="font-bold">{p.nama}</span>
									<span style="color:var(--text-dim)">—</span>
									<span>Hemat Rp {rupiah($diskonPromoTotal)}</span>
								</div>
							{/each}
						</div>
					{/if}

					<!-- GUIDED: step hint di checkout -->
					{#if $kasirMode === 'guided'}
						<div class="flex gap-1 text-xs" style="color:var(--text-dim)">
							<span class="px-1.5 rounded" style="background:var(--surface2)">① Pilih metode</span>
							<span>→</span>
							<span class="px-1.5 rounded" style="background:var(--surface2)">② Input nominal</span>
							<span>→</span>
							<span class="px-1.5 rounded" style="background:var(--surface2)">③ Klik SELESAI</span>
						</div>
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
							onclick={() => void prosesBayar()}
							disabled={$prosesLoading}
							class="flex-1 py-2.5 rounded font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
							style="background:var(--accent);color:var(--bg)">
							{$prosesLoading ? 'MEMPROSES...' : 'SELESAI ✓'}
						</button>
					</div>
				{/if}
			</div>

			<!-- ── Kolom 2: Preview Struk ── -->
			<div class="w-60 shrink-0 border-l flex flex-col" style="border-color:var(--border);background:var(--surface2)">
				<div class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed" style="color:var(--text)">

					<div class="text-center mb-2">
						<div class="font-bold text-sm tracking-widest">TOKO SEMBAKO</div>
						<div class="text-xs" style="color:var(--text-dim)">
							{formatTgl($checkoutTime)} · {formatJam($checkoutTime)}
						</div>
						{#if strukPelanggan}
							<div class="mt-0.5" style="color:var(--accent)">{strukPelanggan.nama}</div>
						{/if}
					</div>

					<div class="border-t border-dashed my-2" style="border-color:var(--text-dim);opacity:0.3"></div>

					{#each strukItems as item (item.barang_id)}
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

					{#if $snap}
						<div class="text-center mt-1 text-xs" style="color:var(--accent)">{$snap.noTransaksi}</div>
					{/if}
				</div>

				<!-- cetak / wa -->
				<div class="shrink-0 p-3 border-t flex flex-col gap-2" style="border-color:var(--border)">
					<button
						onclick={cetakStruk}
						class="w-full py-2 rounded text-xs border font-medium transition-all hover:opacity-80"
						style="border-color:var(--border);color:var(--text-dim)">
						Cetak Struk
					</button>
					<button
						disabled={!$snap}
						onclick={() => $snap && kirimStrukWA($snap)}
						class="w-full py-2 rounded text-xs border font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="border-color:var(--border);color:var(--text-dim)">
						Kirim Struk WA
					</button>
					{#if strukMetode === 'hutang'}
					<button
						disabled={!$snap}
						onclick={() => $snap && kirimNotifHutangWA($snap)}
						class="w-full py-2 rounded text-xs border font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="border-color:var(--warn);color:var(--warn)">
						Notif Hutang WA
					</button>
					{/if}
				</div>
			</div>

		</div>
	</div>
{/if}

<!-- ─── Modal Buka Shift ─────────────────────────────────────────────────────── -->
{#if modalBukaShift}
	<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6)"
		role="dialog" aria-modal="true" tabindex="-1"
		onkeydown={(e) => { if (e.key === 'Escape') modalBukaShift = false }}>
		<div class="rounded-lg border p-6 w-80" style="background:var(--surface);border-color:var(--border)"
			role="presentation" onclick={(e) => e.stopPropagation()}>
			<h2 class="font-bold text-base mb-4">Buka Shift</h2>
			<div class="flex flex-col gap-3">
				<div>
					<label for="kas-awal" class="block text-xs mb-1" style="color:var(--text-dim)">Kas Awal (uang di laci)</label>
					<input id="kas-awal" type="number" min="0" step="1000"
						bind:value={kasAwal}
						class="w-full px-3 py-2 rounded border text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
				<div>
					<label for="catatan-buka" class="block text-xs mb-1" style="color:var(--text-dim)">Catatan (opsional)</label>
					<input id="catatan-buka" type="text"
						bind:value={catatanShift} placeholder="..."
						class="w-full px-3 py-2 rounded border text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
			</div>
			<div class="flex gap-2 justify-end mt-5">
				<button onclick={() => modalBukaShift = false}
					class="px-4 py-1.5 rounded text-sm border"
					style="border-color:var(--border);color:var(--text-dim)">Batal</button>
				<button onclick={simpanBukaShift} disabled={savingShift}
					class="px-4 py-1.5 rounded text-sm font-bold disabled:opacity-60"
					style="background:var(--accent);color:var(--bg)">
					{savingShift ? 'Menyimpan...' : 'Buka Shift'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal Tutup Shift ────────────────────────────────────────────────────── -->
{#if modalTutupShift && shiftAktif}
	<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6)"
		role="dialog" aria-modal="true" tabindex="-1"
		onkeydown={(e) => { if (e.key === 'Escape') modalTutupShift = false }}>
		<div class="rounded-lg border p-6 w-96" style="background:var(--surface);border-color:var(--border)"
			role="presentation" onclick={(e) => e.stopPropagation()}>
			<h2 class="font-bold text-base mb-1">Tutup Shift</h2>
			<p class="text-xs mb-4" style="color:var(--text-dim)">
				Shift dibuka {shiftAktif.jam_buka} · {shiftAktif.jumlah_transaksi} transaksi
			</p>
			<div class="flex flex-col gap-3">
				<div class="rounded border p-3 text-sm" style="background:var(--surface2);border-color:var(--border)">
					<div class="flex justify-between mb-1">
						<span style="color:var(--text-dim)">Kas Awal</span>
						<span>{rupiah(shiftAktif.kas_awal)}</span>
					</div>
					<div class="flex justify-between">
						<span style="color:var(--text-dim)">Total Penjualan Tunai</span>
						<span style="color:var(--accent)">+{rupiah(shiftAktif.total_penjualan)}</span>
					</div>
				</div>
				<div>
					<label for="kas-fisik" class="block text-xs mb-1" style="color:var(--text-dim)">Kas Fisik (hitung uang di laci)</label>
					<input id="kas-fisik" type="number" min="0" step="1000"
						bind:value={kasFisik}
						class="w-full px-3 py-2 rounded border text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
				<div>
					<label for="catatan-tutup" class="block text-xs mb-1" style="color:var(--text-dim)">Catatan (opsional)</label>
					<input id="catatan-tutup" type="text"
						bind:value={catatanShift} placeholder="..."
						class="w-full px-3 py-2 rounded border text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
			</div>
			<div class="flex gap-2 justify-end mt-5">
				<button onclick={() => modalTutupShift = false}
					class="px-4 py-1.5 rounded text-sm border"
					style="border-color:var(--border);color:var(--text-dim)">Batal</button>
				<button onclick={simpanTutupShift} disabled={savingShift}
					class="px-4 py-1.5 rounded text-sm font-bold disabled:opacity-60"
					style="background:var(--warn);color:var(--bg)">
					{savingShift ? 'Menyimpan...' : 'Tutup Shift'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal konfirmasi reset (GUIDED mode) ────────────────────────────────── -->
{#if konfirmasiReset}
	<div class="fixed inset-0 z-40 flex items-center justify-center" style="background:rgba(0,0,0,0.55)">
		<div class="rounded-lg border p-6 text-center w-72" style="background:var(--surface);border-color:var(--border)">
			<p class="font-bold mb-1">Reset keranjang?</p>
			<p class="text-sm mb-5" style="color:var(--text-dim)">{$keranjang.length} item akan dihapus dari keranjang</p>
			<div class="flex gap-2 justify-center">
				<button
					onclick={() => { konfirmasiReset = false; resetKasir(); }}
					class="px-4 py-1.5 rounded font-bold text-sm active:scale-95 transition-all"
					style="background:var(--danger);color:#fff">Ya, reset (Enter)</button>
				<button
					onclick={() => konfirmasiReset = false}
					class="px-4 py-1.5 rounded text-sm border active:scale-95 transition-all"
					style="border-color:var(--border);color:var(--text-dim)">Batal (ESC)</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal konfirmasi hapus ──────────────────────────────────────────────── -->
{#if $konfirmasiHapusIdx !== null}
	<div class="fixed inset-0 z-40 flex items-center justify-center" style="background:rgba(0,0,0,0.55)">
		<div class="rounded-lg border p-6 text-center w-72" style="background:var(--surface);border-color:var(--border)">
			<p class="font-bold mb-1">Hapus dari keranjang?</p>
			<p class="text-sm mb-5" style="color:var(--text-dim)">{$keranjang[$konfirmasiHapusIdx]?.nama_barang ?? ''}</p>
			<div class="flex gap-2 justify-center">
				<button
					onclick={() => hapusItem($konfirmasiHapusIdx!)}
					class="px-4 py-1.5 rounded font-bold text-sm active:scale-95 transition-all"
					style="background:var(--danger);color:#fff">Ya (Enter)</button>
				<button
					onclick={() => konfirmasiHapusIdx.set(null)}
					class="px-4 py-1.5 rounded text-sm border active:scale-95 transition-all"
					style="border-color:var(--border);color:var(--text-dim)">Batal (ESC)</button>
			</div>
		</div>
	</div>
{/if}
