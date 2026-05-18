<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		keranjang,
		tipeTransaksi,
		metodeBayar,
		pelangganDipilih,
		nominalBayar,
		itemAktifIdx,
		subtotal,
		diskonMember,
		diskonTotal,
		total,
		kembalian,
		resetKasir,
		kasirMode,
		initKasirMode,
		setModeOverride,
		type KasirMode
	} from '$lib/stores/kasir';
	import {
		// state
		searchVal,
		searchResults,
		searchSelectedIdx,
		cariLoading,
		pelangganQuery,
		pelangganList,
		pelangganSelectedIdx,
		konfirmasiHapusIdx,
		popupSearch,
		popupCheckout,
		snap,
		checkoutTime,
		scanSessionId,
		scanUrl,
		qrDataUrl,
		qrLarge,
		scannerStatus,
		prosesLoading,
		// actions
		cariBarang,
		openSearch,
		closeSearch,
		scanDariPhone,
		tambahKeKeranjang,
		ubahJumlah,
		hapusItem,
		ubahDiskon,
		muatPelanggan,
		pilihPelanggan,
		openCheckout,
		tutupCheckout,
		prosesBayar,
		initKasirScan,
		cleanupKasirScan,
		kirimStrukWA,
		kirimNotifHutangWA,
		loadPromoAktif,
		promoTotalBerlaku,
		diskonPromoTotal,
		totalAkhir,
		kasBankDipilih
	} from './kasir.store';
	import { rupiah, formatTgl, formatJam, METODE, METODE_LABEL } from './kasir.logic';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';

	// ── Akun kas/bank (untuk selector checkout) ──────────────────────────────
	let daftarKasBank = $state<{ id: number; nama: string; tipe: string }[]>([]);

	// ── Pengaturan toko (untuk struk) ────────────────────────────────────────
	let namaToko = $state('Toko Sembako');
	let alamatToko = $state('');
	let strHeader = $state('');
	let strFooter = $state('Terima kasih sudah berbelanja!');
	let strUkuran = $state('80');

	// ── Derived (struk: live atau dari snapshot) ──────────────────────────────
	const strukItems = $derived($snap?.items ?? $keranjang);
	const strukSubtotal = $derived($snap?.subtotal ?? $subtotal);
	const strukDiskon = $derived($snap?.diskon ?? $diskonMember);
	const strukTotal = $derived($snap?.total ?? $total);
	const strukMetode = $derived($snap?.metode ?? $metodeBayar);
	const strukNominal = $derived($snap ? $snap.nominal : Number($nominalBayar));
	const strukKembali = $derived($snap ? $snap.kembalian : $kembalian);
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

	// Panduan shortcut keyboard
	let showHelp = $state(false);

	// ── DOM refs ──────────────────────────────────────────────────────────────
	let searchInputEl: HTMLInputElement | undefined = $state();
	let pelangganInputEl: HTMLInputElement | undefined = $state();
	let bayarInputEl: HTMLInputElement | undefined = $state();
	let helpCloseBtnEl: HTMLButtonElement | undefined = $state();

	// ── Fokus otomatis saat popup terbuka ─────────────────────────────────────
	$effect(() => {
		if ($popupSearch) setTimeout(() => searchInputEl?.focus(), 0);
	});
	$effect(() => {
		if (showHelp) setTimeout(() => helpCloseBtnEl?.focus(), 0);
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
			if ($qrLarge) {
				qrLarge.set(false);
				return;
			}
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
	function closeAll() {
		if ($popupSearch) closeSearch();
		if ($popupCheckout) tutupCheckout();
		modalBukaShift = false;
		modalTutupShift = false;
		showHelp = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (konfirmasiReset) {
			if (e.key === 'Enter') {
				e.preventDefault();
				konfirmasiReset = false;
				resetKasir();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				konfirmasiReset = false;
			}
			return;
		}

		if ($konfirmasiHapusIdx !== null) {
			if (e.key === 'Enter') {
				e.preventDefault();
				hapusItem($konfirmasiHapusIdx);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				konfirmasiHapusIdx.set(null);
			}
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
				barcodeBuffer = '';
				lastKeyTime = 0;
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
			case 'F1':
				e.preventDefault();
				if (showHelp) {
					showHelp = false;
					break;
				}
				closeAll();
				showHelp = true;
				break;
			case 'F3':
				e.preventDefault();
				if ($popupSearch) {
					closeSearch();
					break;
				}
				closeAll();
				openSearch();
				break;
			case 'F8':
				e.preventDefault();
				closeAll();
				void goto('/kasir/retur');
				break;
			case 'F10':
				e.preventDefault();
				if ($keranjang.length === 0) break;
				if ($popupCheckout) {
					tutupCheckout();
					break;
				}
				handleProsesBayar();
				break;
			case 'F11':
				e.preventDefault();
				if (modalBukaShift || modalTutupShift) {
					modalBukaShift = false;
					modalTutupShift = false;
					break;
				}
				closeAll();
				if (shiftAktif) void bukaTutupShift();
				else void bukaBukaShift();
				break;
			case 'F12':
				e.preventDefault();
				if ($keranjang.length === 0) break;
				closeAll();
				if ($kasirMode === 'guided') konfirmasiReset = true;
				else resetKasir();
				break;
			case 'Escape':
				e.preventDefault();
				if (showHelp) {
					showHelp = false;
					return;
				}
				if ($qrLarge) {
					qrLarge.set(false);
					return;
				}
				if ($popupCheckout) {
					tutupCheckout();
					return;
				}
				if ($popupSearch) {
					closeSearch();
					return;
				}
				if (modalBukaShift) {
					modalBukaShift = false;
					return;
				}
				if (modalTutupShift) {
					modalTutupShift = false;
					return;
				}
				break;
		}

		// navigasi keranjang
		if (!$popupSearch && !$popupCheckout && !inInput && $keranjang.length > 0) {
			if (e.key === 'ArrowRight' && $itemAktifIdx >= 0) {
				e.preventDefault();
				ubahJumlah($itemAktifIdx, 1);
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
		id: number;
		tanggal: string;
		jam_buka: string;
		kas_awal: number;
		jumlah_transaksi: number;
		total_penjualan: number;
		status: string;
	};

	type RekapShift = {
		shift_id: number;
		jam_buka: string;
		kas_awal: number;
		kas_sistem: number;
		jumlah_transaksi: number;
		total_semua: number;
		tunai: number;
		transfer: number;
		qris: number;
		hutang: number;
	};

	let shiftAktif = $state<ShiftAktif | null>(null);
	let modalBukaShift = $state(false);
	let modalTutupShift = $state(false);
	let kasAwal = $state(0);
	let kasFisik = $state(0);
	let catatanShift = $state('');
	let savingShift = $state(false);
	let rekapShift = $state<RekapShift | null>(null);
	let loadingRekap = $state(false);
	let selisihKas = $derived(rekapShift ? kasFisik - rekapShift.kas_sistem : 0);

	async function muatShiftAktif() {
		const res = await api.get<ShiftAktif | null>('/shift/aktif');
		if (res.success) shiftAktif = res.data;
	}

	async function bukaBukaShift() {
		await muatShiftAktif();
		if (shiftAktif) {
			toast.warn('Shift hari ini sudah dibuka');
			return;
		}
		kasAwal = 0;
		catatanShift = '';
		modalBukaShift = true;
	}

	async function simpanBukaShift() {
		savingShift = true;
		const res = await api.post<ShiftAktif>('/shift/buka', {
			kas_awal: kasAwal,
			catatan: catatanShift || undefined
		});
		savingShift = false;
		if (!res.success) {
			toast.error(res.error ?? 'Gagal buka shift');
			return;
		}
		shiftAktif = res.data!;
		modalBukaShift = false;
		toast.sukses('Shift dibuka');
	}

	async function bukaTutupShift() {
		if (!shiftAktif) {
			toast.warn('Buka shift terlebih dahulu');
			return;
		}
		kasFisik = 0;
		catatanShift = '';
		rekapShift = null;
		loadingRekap = true;
		modalTutupShift = true;
		const res = await api.get<RekapShift>('/shift/rekap-aktif');
		loadingRekap = false;
		if (res.success) rekapShift = res.data;
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

	async function simpanTutupShift() {
		savingShift = true;
		const res = await api.post('/shift/tutup', {
			kas_fisik: kasFisik,
			catatan: catatanShift || undefined
		});
		savingShift = false;
		if (!res.success) {
			toast.error(res.error ?? 'Gagal tutup shift');
			return;
		}
		shiftAktif = null;
		modalTutupShift = false;
		toast.sukses('Shift ditutup');
	}

	// ── Cetak struk (popup window, thermal receipt) ──────────────────────────
	function cetakStruk() {
		const lebar = strUkuran === '58' ? '58mm' : '80mm';
		const rp = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));
		const tgl = $checkoutTime.toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
		const jam = $checkoutTime.toTimeString().slice(0, 5);
		const METODE_STR: Record<string, string> = {
			tunai: 'Tunai',
			transfer: 'Transfer',
			qris: 'QRIS',
			hutang: 'Hutang'
		};

		const itemsHtml = strukItems
			.map(
				(item) => `
			<div style="font-weight:600">${item.nama_barang}</div>
			<div style="display:flex;justify-content:space-between;font-size:8.5pt;color:#444">
				<span>${item.jumlah}${item.singkatan_satuan ? ' ' + item.singkatan_satuan : ''} &times; ${rp(item.harga_jual)}</span>
				<span style="color:#000">${rp(item.harga_jual * item.jumlah - item.diskon_item)}</span>
			</div>
			${item.diskon_item > 0 ? `<div style="font-size:8pt;color:#b36000">&nbsp;&nbsp;diskon &minus;${rp(item.diskon_item)}</div>` : ''}
		`
			)
			.join('');

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
</body></html>`;

		const w = window.open('', '_blank', 'width=420,height=700,menubar=no,toolbar=no');
		if (!w) {
			toast.error('Popup diblokir browser — izinkan popup untuk halaman ini');
			return;
		}
		w.document.write(html);
		w.document.close();
		w.onload = () => {
			w.print();
			w.close();
		};
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
			if (!res.success) return;
			const s = res.data;
			if (s.nama_toko) namaToko = s.nama_toko;
			if (s.alamat) alamatToko = s.alamat;
			if (s.struk_header) strHeader = s.struk_header;
			if (s.struk_footer) strFooter = s.struk_footer;
			if (s.struk_ukuran) strUkuran = s.struk_ukuran;
		});
		return () => {
			clearTimeout(cariTimer);
			clearTimeout(pelangganTimer);
			cleanupKasirScan();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- ─── Main: Keranjang + Bottom Bar ─────────────────────────────────────── -->
<div class="flex min-h-0 flex-1 flex-col">
	<!-- Keranjang table -->
	<div class="min-h-0 flex-1 overflow-y-auto rounded border" style="border-color:var(--border)">
		{#if $keranjang.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center gap-3"
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
					<p class="text-sm">Keranjang kosong</p>
				{/if}
				<button
					onclick={openSearch}
					class="rounded border px-4 py-2 font-mono text-sm transition-all"
					style="border-color:var(--accent);color:var(--accent)"
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
					{#each $keranjang as item, idx (item.barang_id)}
						<tr
							class="cursor-pointer border-t"
							style={$itemAktifIdx === idx
								? 'background:var(--surface2);outline:1px solid var(--accent);outline-offset:-1px'
								: 'border-color:var(--border)'}
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
										onclick={(e) => {
											e.stopPropagation();
											if (item.jumlah <= 1) konfirmasiHapusIdx.set(idx);
											else ubahJumlah(idx, -1);
										}}
										class="h-6 w-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">−</button
									>
									<span class="w-8 text-center font-mono">{item.jumlah}</span>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ubahJumlah(idx, 1);
										}}
										class="h-6 w-6 rounded text-center leading-none"
										style="background:var(--surface);color:var(--text-dim)">+</button
									>
								</div>
								<div class="mt-0.5 text-center text-xs" style="color:var(--text-dim)">
									{item.singkatan_satuan}
								</div>
							</td>
							<td class="px-3 py-1 text-right">
								<input
									type="number"
									min="0"
									step="500"
									value={item.diskon_item}
									oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
									onclick={(e) => e.stopPropagation()}
									class="w-20 [appearance:textfield] rounded border px-2 py-0.5 text-right text-xs outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
							</td>
							<td class="px-3 py-2 text-right font-mono font-medium">
								{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
							</td>
							<td class="px-2 py-2 text-center">
								<button
									onclick={(e) => {
										e.stopPropagation();
										konfirmasiHapusIdx.set(idx);
									}}
									class="text-xs"
									style="color:var(--danger)">✕</button
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Bottom bar -->
	<div
		class="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-3"
		style="border-color:var(--border)"
	>
		<div class="flex items-center gap-2">
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
			<a
				href="/kasir/retur"
				class="rounded border px-3 py-1 text-xs transition-all"
				style="border-color:var(--border);color:var(--text-dim)"
			>
				{$kasirMode === 'pro' ? 'F8' : 'F8 · Retur'}
			</a>
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
					onclick={() => {
						if ($kasirMode === 'guided') konfirmasiReset = true;
						else resetKasir();
					}}
					class="rounded border px-3 py-1 text-xs transition-all"
					style="border-color:var(--border);color:var(--danger)"
				>
					{$kasirMode === 'pro' ? 'F12' : 'F12 · Reset'}
				</button>
			{/if}
			<button
				onclick={handleProsesBayar}
				disabled={$keranjang.length === 0}
				class="rounded px-3 py-1 text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
				style="background:var(--accent);color:var(--bg)"
			>
				{$kasirMode === 'pro' ? 'F10' : 'F10 · PROSES BAYAR'}
			</button>
		</div>
		<div class="flex items-center gap-5 text-sm">
			<span class="ml-5 flex items-center gap-1">
				<span class="font-mono text-6xl font-bold">{rupiah($totalAkhir)}</span>
			</span>
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
					<tr>
						<td style="color:var(--text-dim)">Total</td>
						<td class="font-mono">&nbsp;&nbsp;{rupiah($totalAkhir)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ─── Spotlight Search ──────────────────────────────────────────────────── -->
{#if $popupSearch}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center px-4 pt-20"
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
			<div
				class="min-w-0 flex-1 overflow-hidden rounded-xl border shadow-2xl"
				style="background:var(--surface);border-color:var(--border)"
				role="none"
			>
				<!-- input row -->
				<div class="flex items-center gap-3 border-b px-4 py-3" style="border-color:var(--border)">
					<!-- tipe toggle -->
					<div class="flex shrink-0 gap-1">
						{#each ['eceran', 'grosir'] as const as t (t)}
							<button
								onclick={() => tipeTransaksi.set(t)}
								class="rounded border px-2 py-0.5 text-xs font-bold transition-all"
								style={$tipeTransaksi === t
									? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
									: 'border-color:var(--border);color:var(--text-dim)'}
								>{t === 'eceran' ? 'ECR' : 'GRS'}</button
							>
						{/each}
					</div>
					<input
						bind:this={searchInputEl}
						type="text"
						placeholder="Cari nama atau kode barang..."
						bind:value={$searchVal}
						oninput={handleSearchInput}
						onkeydown={onSearchKeydown}
						class="flex-1 bg-transparent text-base outline-none"
						style="color:var(--text)"
					/>
					{#if $cariLoading}
						<span class="shrink-0 text-xs" style="color:var(--text-dim)">mencari...</span>
					{/if}
					<kbd
						class="shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs"
						style="border-color:var(--border);color:var(--text-dim)">ESC</kbd
					>
				</div>

				<!-- results -->
				{#if $searchResults.length > 0}
					<div class="max-h-96 overflow-y-auto">
						{#each $searchResults.slice(0, 8) as br, i (br.id)}
							<button
								onclick={() => tambahKeKeranjang(br)}
								class="w-full border-t px-4 py-3 text-left transition-colors"
								style="border-color:var(--border);background:{$searchSelectedIdx === i
									? 'var(--surface2)'
									: 'transparent'}"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex min-w-0 items-center gap-3">
										{#if br.foto_path}
											<img
												src="/uploads/{br.foto_path.replace('med_', 'thumb_')}"
												alt={br.nama_barang}
												class="h-9 w-9 shrink-0 rounded object-cover"
												style="border:1px solid var(--border)"
											/>
										{:else}
											<div
												class="h-9 w-9 shrink-0 rounded"
												style="background:var(--surface2);border:1px solid var(--border)"
											></div>
										{/if}
										<div class="min-w-0">
											<span class="mr-2 font-mono text-xs" style="color:var(--text-dim)"
												>{br.kode_barang}</span
											>
											<span class="font-medium">{br.nama_barang}</span>
											<span
												class="ml-2 text-xs"
												style="color:{br.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--text-dim)'}"
											>
												stok {br.stok_sekarang}
												{br.singkatan_satuan ?? ''}
											</span>
										</div>
									</div>
									<div class="flex shrink-0 gap-4 font-mono text-sm">
										<span
											style="color:{$tipeTransaksi === 'eceran'
												? 'var(--accent)'
												: 'var(--text-dim)'}"
										>
											<span class="mr-1 text-xs" style="color:var(--text-dim)">ECR</span>
											{rupiah(br.harga_jual_eceran)}
										</span>
										<span
											style="color:{$tipeTransaksi === 'grosir'
												? 'var(--accent)'
												: 'var(--text-dim)'}"
										>
											<span class="mr-1 text-xs" style="color:var(--text-dim)">GRS</span>
											{rupiah(br.harga_jual_grosir)}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else if $searchVal && !$cariLoading}
					<p class="px-4 py-6 text-center text-sm" style="color:var(--text-dim)">
						Barang tidak ditemukan
					</p>
				{:else}
					<p class="px-4 py-4 text-center text-xs" style="color:var(--text-dim)">
						Ketik nama, kode, atau scan barcode — harga aktif: <span style="color:var(--accent)"
							>{$tipeTransaksi.toUpperCase()}</span
						>
					</p>
				{/if}
			</div>

			<!-- QR panel: scan dari HP -->
			<div
				class="flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 shadow-2xl select-none"
				style="background:var(--surface);border-color:var(--border)"
				onclick={() => {
					if ($qrDataUrl) qrLarge.set(true);
				}}
				role="none"
				title="Klik untuk perbesar QR"
			>
				{#if $qrDataUrl}
					<img
						src={$qrDataUrl}
						alt="Scan dari HP"
						class="h-24 w-24 rounded"
						style="image-rendering:pixelated"
					/>
				{:else}
					<div class="h-24 w-24 animate-pulse rounded" style="background:var(--surface2)"></div>
				{/if}
				<div class="flex items-center gap-1.5">
					<span
						class="h-1.5 w-1.5 shrink-0 rounded-full"
						style="background:{$scannerStatus === 'connected'
							? 'var(--accent)'
							: $scannerStatus === 'disconnected'
								? 'var(--warn)'
								: 'var(--border)'}"
					></span>
					<p class="text-xs" style="color:var(--text-dim)">
						{$scannerStatus === 'connected'
							? 'HP terhubung'
							: $scannerStatus === 'disconnected'
								? 'HP terputus'
								: 'HP scanner'}
					</p>
				</div>
				{#if $scanSessionId}
					<p class="font-mono text-xs tracking-widest" style="color:var(--accent)">
						{$scanSessionId}
					</p>
				{/if}
				<p class="text-xs" style="color:var(--text-dim)">↗ klik perbesar</p>
			</div>

			<!-- Large QR overlay -->
			{#if $qrLarge}
				<div
					class="fixed inset-0 z-[60] flex items-center justify-center"
					style="background:rgba(0,0,0,0.88)"
					onclick={() => qrLarge.set(false)}
					role="none"
				>
					<div
						class="flex flex-col items-center gap-4"
						onclick={(e) => e.stopPropagation()}
						role="none"
					>
						<img
							src={$qrDataUrl}
							alt="Scan dari HP"
							class="h-80 w-80 rounded-xl"
							style="image-rendering:pixelated"
						/>
						<p class="text-sm" style="color:var(--text-dim)">
							Arahkan HP ke QR · atau ketik manual:
						</p>
						<div
							class="rounded-lg border px-4 py-3 text-center"
							style="background:var(--surface);border-color:var(--border)"
						>
							<p class="mb-1 text-xs" style="color:var(--text-dim)">Buka di browser HP</p>
							<p class="font-mono text-base tracking-wide" style="color:var(--accent)">
								{$scanUrl}
							</p>
						</div>
						<div class="flex gap-6 text-center">
							<div>
								<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Alamat server</p>
								<p class="font-mono text-sm" style="color:var(--text)">{location.hostname}</p>
							</div>
							<div style="color:var(--border)">·</div>
							<div>
								<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Halaman</p>
								<p class="font-mono text-sm" style="color:var(--text)">/scan</p>
							</div>
							<div style="color:var(--border)">·</div>
							<div>
								<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Kode sesi</p>
								<p class="font-mono text-lg font-bold tracking-widest" style="color:var(--accent)">
									{$scanSessionId}
								</p>
							</div>
						</div>
						<p class="text-xs" style="color:var(--text-dim)">klik luar / ESC untuk tutup</p>
					</div>
				</div>
			{/if}
		</div>
		<!-- end flex row -->
	</div>
{/if}

<!-- ─── Checkout Popup ────────────────────────────────────────────────────── -->
{#if $popupCheckout}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.7)"
		onclick={() => {
			if (!$snap) tutupCheckout();
		}}
		role="none"
	>
		<div
			class="flex w-full max-w-3xl overflow-hidden rounded-xl border shadow-2xl"
			style="background:var(--surface);border-color:var(--border);max-height:90vh"
			onclick={(e) => e.stopPropagation()}
			role="none"
		>
			<!-- ── Kolom 1: Input / Sukses ── -->
			<div class="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
				{#if $snap}
					<!-- sukses state -->
					<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
						<div class="text-5xl" style="color:var(--accent)">✓</div>
						<p class="text-lg font-bold">Transaksi Berhasil</p>
						<p class="font-mono text-sm" style="color:var(--text-dim)">{$snap.noTransaksi}</p>
						<button
							onclick={tutupCheckout}
							class="mt-4 rounded px-6 py-2 text-sm font-bold transition-all active:scale-95"
							style="background:var(--accent);color:var(--bg)"
						>
							Transaksi Baru (ESC)
						</button>
					</div>
				{:else}
					<!-- tipe + judul -->
					<div class="flex items-center justify-between">
						<h2 class="text-base font-bold">Proses Pembayaran</h2>
						<div class="flex gap-1">
							{#each ['eceran', 'grosir'] as const as t (t)}
								<button
									onclick={() => tipeTransaksi.set(t)}
									class="rounded border px-2 py-0.5 text-xs font-bold transition-all"
									style={$tipeTransaksi === t
										? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}>{t.toUpperCase()}</button
								>
							{/each}
						</div>
					</div>

					<!-- pelanggan -->
					<div class="flex flex-col gap-1.5">
						<p class="text-xs" style="color:var(--text-dim)">
							PELANGGAN <span style="opacity:0.5">(opsional)</span>
						</p>
						{#if $pelangganDipilih}
							<div
								class="flex items-center justify-between rounded border px-3 py-2"
								style="background:var(--surface2);border-color:var(--border)"
							>
								<span class="text-sm">
									{$pelangganDipilih.nama}
									{#if $pelangganDipilih.gender === 'pria'}<span class="ml-1" style="color:#40c4ff"
											>♂</span
										>
									{:else if $pelangganDipilih.gender === 'wanita'}<span
											class="ml-1"
											style="color:#ff80ab">♀</span
										>{/if}
									{#if $pelangganDipilih.diskon_member && $pelangganDipilih.diskon_member > 0}
										<span class="ml-2 text-xs" style="color:var(--accent)"
											>−{$pelangganDipilih.diskon_member}%</span
										>
									{/if}
								</span>
								<button
									onclick={() => pelangganDipilih.set(null)}
									class="ml-2 text-xs"
									style="color:var(--danger)">✕</button
								>
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
									class="w-full rounded border px-3 py-2 text-sm outline-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
								{#if $pelangganList.length > 0}
									<div
										class="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded border shadow-lg"
										style="background:var(--surface);border-color:var(--border)"
									>
										{#each $pelangganList as p, i (p.id)}
											<button
												onclick={() => pilihPelanggan(p)}
												class="w-full border-t px-3 py-2 text-left text-sm"
												style="border-color:var(--border);background:{$pelangganSelectedIdx === i
													? 'var(--surface2)'
													: 'transparent'}"
											>
												{p.nama}
												{#if p.gender === 'pria'}<span class="ml-1" style="color:#40c4ff">♂</span>
												{:else if p.gender === 'wanita'}<span class="ml-1" style="color:#ff80ab"
														>♀</span
													>{/if}
												{#if p.no_kartu}<span
														class="ml-2 font-mono text-xs"
														style="color:var(--accent)">{p.no_kartu}</span
													>{/if}
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
									class="rounded border py-2 text-sm font-bold transition-all"
									style={$metodeBayar === m
										? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}>{METODE_LABEL[m]}</button
								>
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
										class="rounded border px-3 py-1.5 text-xs font-bold transition-all"
										style={$kasBankDipilih === kb.id
											? 'background:var(--info);color:var(--bg);border-color:var(--info)'
											: 'border-color:var(--border);color:var(--text-dim)'}>{kb.nama}</button
									>
								{/each}
							</div>
						</div>
					{/if}

					<!-- nominal bayar -->
					{#if $metodeBayar !== 'hutang'}
						<div class="flex flex-col gap-1.5">
							<label for="nominal-checkout" class="text-xs" style="color:var(--text-dim)"
								>NOMINAL BAYAR</label
							>
							<input
								id="nominal-checkout"
								bind:this={bayarInputEl}
								type="number"
								min="0"
								step="500"
								bind:value={$nominalBayar}
								placeholder="0"
								class="w-full [appearance:textfield] rounded border px-3 py-3 text-right font-mono text-xl font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								style="background:var(--surface2);border-color:var(--border);color:var(--text)"
							/>
							{#if Number($nominalBayar) >= $totalAkhir && $totalAkhir > 0}
								<div class="flex justify-between px-1 text-sm">
									<span style="color:var(--text-dim)">Kembalian</span>
									<span class="font-mono font-bold" style="color:var(--accent)"
										>Rp {rupiah($kembalian)}</span
									>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Promo total berlaku -->
					{#if $promoTotalBerlaku.length > 0}
						<div class="flex flex-col gap-1">
							{#each $promoTotalBerlaku as p (p.id)}
								<div
									class="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
									style="background:var(--surface2);border:1px solid var(--accent);color:var(--accent)"
								>
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
							<span class="rounded px-1.5" style="background:var(--surface2)">① Pilih metode</span>
							<span>→</span>
							<span class="rounded px-1.5" style="background:var(--surface2)">② Input nominal</span>
							<span>→</span>
							<span class="rounded px-1.5" style="background:var(--surface2)">③ Klik SELESAI</span>
						</div>
					{/if}

					<!-- actions -->
					<div class="mt-auto flex gap-2 pt-2">
						<button
							onclick={tutupCheckout}
							class="flex-1 rounded border py-2 text-sm transition-all"
							style="border-color:var(--border);color:var(--text-dim)"
						>
							Batal (ESC)
						</button>
						<button
							onclick={() => void prosesBayar()}
							disabled={$prosesLoading}
							class="flex-1 rounded py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
							style="background:var(--accent);color:var(--bg)"
						>
							{$prosesLoading ? 'MEMPROSES...' : 'SELESAI ✓'}
						</button>
					</div>
				{/if}
			</div>

			<!-- ── Kolom 2: Preview Struk ── -->
			<div
				class="flex w-60 shrink-0 flex-col border-l"
				style="border-color:var(--border);background:var(--surface2)"
			>
				<div
					class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
					style="color:var(--text)"
				>
					<div class="mb-2 text-center">
						<div class="text-sm font-bold tracking-widest">TOKO SEMBAKO</div>
						<div class="text-xs" style="color:var(--text-dim)">
							{formatTgl($checkoutTime)} · {formatJam($checkoutTime)}
						</div>
						{#if strukPelanggan}
							<div class="mt-0.5" style="color:var(--accent)">{strukPelanggan.nama}</div>
						{/if}
					</div>

					<div
						class="my-2 border-t border-dashed"
						style="border-color:var(--text-dim);opacity:0.3"
					></div>

					{#each strukItems as item (item.barang_id)}
						<div class="mb-1.5">
							<div class="truncate font-medium">{item.nama_barang}</div>
							<div class="flex justify-between" style="color:var(--text-dim)">
								<span>{item.jumlah} × {rupiah(item.harga_jual)}</span>
								<span style="color:var(--text)"
									>{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}</span
								>
							</div>
							{#if item.diskon_item > 0}
								<div class="text-left" style="color:var(--accent)">−{rupiah(item.diskon_item)}</div>
							{/if}
						</div>
					{/each}

					<div
						class="my-2 border-t border-dashed"
						style="border-color:var(--text-dim);opacity:0.3"
					></div>

					{#if strukDiskon > 0}
						<div class="mb-1 flex justify-between" style="color:var(--accent)">
							<span>Diskon member</span>
							<span>−{rupiah(strukDiskon)}</span>
						</div>
					{/if}

					<div class="flex justify-between text-sm font-bold">
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
						<div class="mt-1 text-center text-xs font-bold" style="color:var(--warn)">
							── HUTANG ──
						</div>
					{/if}

					<div
						class="my-2 border-t border-dashed"
						style="border-color:var(--text-dim);opacity:0.3"
					></div>
					<div class="text-center" style="color:var(--text-dim)">Terima kasih</div>

					{#if $snap}
						<div class="mt-1 text-center text-xs" style="color:var(--accent)">
							{$snap.noTransaksi}
						</div>
					{/if}
				</div>

				<!-- cetak / wa -->
				<div class="flex shrink-0 flex-col gap-2 border-t p-3" style="border-color:var(--border)">
					<button
						onclick={cetakStruk}
						class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80"
						style="border-color:var(--border);color:var(--text-dim)"
					>
						Cetak Struk
					</button>
					<button
						disabled={!$snap}
						onclick={() => $snap && kirimStrukWA($snap)}
						class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="border-color:var(--border);color:var(--text-dim)"
					>
						Kirim Struk WA
					</button>
					{#if strukMetode === 'hutang'}
						<button
							disabled={!$snap}
							onclick={() => $snap && kirimNotifHutangWA($snap)}
							class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30"
							style="border-color:var(--warn);color:var(--warn)"
						>
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
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background:rgba(0,0,0,0.6)"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === 'Escape') modalBukaShift = false;
			if (e.key === 'Enter' && !savingShift) void simpanBukaShift();
		}}
	>
		<div
			class="w-84 rounded-lg border p-6"
			style="background:var(--surface);border-color:var(--border)"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-1 text-base font-bold">Buka Shift</h2>
			<p class="mb-4 text-xs" style="color:var(--text-dim)">
				{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
				· {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
			</p>
			<div class="flex flex-col gap-3">
				<div>
					<label for="kas-awal" class="mb-1 block text-xs" style="color:var(--text-dim)"
						>Kas Awal (uang di laci)</label
					>
					<input
						id="kas-awal"
						type="number"
						min="0"
						step="1000"
						bind:value={kasAwal}
						autofocus
						class="w-full rounded border px-3 py-2 text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					<!-- Denominasi cepat -->
					<div class="mt-1.5 flex flex-wrap gap-1">
						{#each [0, 50000, 100000, 200000, 500000, 1000000] as nom}
							<button
								type="button"
								onclick={() => (kasAwal = nom)}
								class="rounded border px-2 py-0.5 text-xs transition-colors"
								style={kasAwal === nom
									? 'border-color:var(--accent);color:var(--accent)'
									: 'border-color:var(--border);color:var(--text-dim)'}
							>
								{nom === 0 ? 'Rp 0' : nom >= 1000000 ? '1jt' : nom / 1000 + 'rb'}
							</button>
						{/each}
					</div>
					{#if kasAwal > 0}
						<p class="mt-1 text-xs font-mono" style="color:var(--accent)">{rupiah(kasAwal)}</p>
					{/if}
				</div>
				<div>
					<label for="catatan-buka" class="mb-1 block text-xs" style="color:var(--text-dim)"
						>Catatan (opsional)</label
					>
					<input
						id="catatan-buka"
						type="text"
						bind:value={catatanShift}
						placeholder="..."
						class="w-full rounded border px-3 py-2 text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>
			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => (modalBukaShift = false)}
					class="rounded border px-4 py-1.5 text-sm"
					style="border-color:var(--border);color:var(--text-dim)">Batal</button
				>
				<button
					onclick={simpanBukaShift}
					disabled={savingShift}
					class="rounded px-4 py-1.5 text-sm font-bold disabled:opacity-60"
					style="background:var(--accent);color:var(--bg)"
				>
					{savingShift ? 'Menyimpan...' : 'Buka Shift'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal Tutup Shift ────────────────────────────────────────────────────── -->
{#if modalTutupShift && shiftAktif}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background:rgba(0,0,0,0.6)"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === 'Escape') modalTutupShift = false;
		}}
	>
		<div
			class="w-[26rem] rounded-lg border p-6"
			style="background:var(--surface);border-color:var(--border)"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-1 text-base font-bold">Tutup Shift</h2>
			<p class="mb-4 text-xs" style="color:var(--text-dim)">
				Dibuka {shiftAktif.jam_buka} ·
				{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
			</p>

			{#if loadingRekap}
				<!-- Loading state -->
				<div class="flex items-center justify-center py-8" style="color:var(--text-dim)">
					<span class="text-sm">Memuat rekap...</span>
				</div>
			{:else if rekapShift}
				<div class="flex flex-col gap-3">
					<!-- Rekap transaksi per metode -->
					<div class="rounded border text-xs" style="background:var(--surface2);border-color:var(--border)">
						<div class="border-b px-3 py-2 font-bold" style="border-color:var(--border);color:var(--text-dim)">
							REKAP TRANSAKSI
						</div>
						<table class="w-full">
							<tbody>
								{#if rekapShift.tunai > 0}
									<tr class="border-b" style="border-color:var(--border)">
										<td class="px-3 py-1.5" style="color:var(--text-dim)">Tunai</td>
										<td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.tunai)}</td>
									</tr>
								{/if}
								{#if rekapShift.transfer > 0}
									<tr class="border-b" style="border-color:var(--border)">
										<td class="px-3 py-1.5" style="color:var(--text-dim)">Transfer</td>
										<td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.transfer)}</td>
									</tr>
								{/if}
								{#if rekapShift.qris > 0}
									<tr class="border-b" style="border-color:var(--border)">
										<td class="px-3 py-1.5" style="color:var(--text-dim)">QRIS</td>
										<td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.qris)}</td>
									</tr>
								{/if}
								{#if rekapShift.hutang > 0}
									<tr class="border-b" style="border-color:var(--border)">
										<td class="px-3 py-1.5" style="color:var(--text-dim)">Hutang</td>
										<td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.hutang)}</td>
									</tr>
								{/if}
								{#if rekapShift.jumlah_transaksi === 0}
									<tr>
										<td colspan="2" class="px-3 py-2 text-center text-xs" style="color:var(--text-dim)">
											Belum ada transaksi
										</td>
									</tr>
								{:else}
									<tr>
										<td class="px-3 py-1.5 font-bold">Total · {rekapShift.jumlah_transaksi} trx</td>
										<td class="px-3 py-1.5 text-right font-mono font-bold" style="color:var(--accent)">
											{rupiah(rekapShift.total_semua)}
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>

					<!-- Rekonsiliasi kas -->
					<div class="rounded border text-xs" style="background:var(--surface2);border-color:var(--border)">
						<div class="border-b px-3 py-2 font-bold" style="border-color:var(--border);color:var(--text-dim)">
							REKONSILIASI KAS
						</div>
						<div class="px-3 py-2 space-y-1">
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">Kas Awal</span>
								<span class="font-mono">{rupiah(rekapShift.kas_awal)}</span>
							</div>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">+ Penjualan Tunai</span>
								<span class="font-mono" style="color:var(--accent)">+{rupiah(rekapShift.tunai)}</span>
							</div>
							<div class="flex justify-between border-t pt-1 font-bold" style="border-color:var(--border)">
								<span>= Kas Seharusnya</span>
								<span class="font-mono">{rupiah(rekapShift.kas_sistem)}</span>
							</div>
						</div>
					</div>

					<!-- Input kas fisik -->
					<div>
						<label for="kas-fisik" class="mb-1 block text-xs" style="color:var(--text-dim)"
							>Kas Fisik (hitung uang di laci)</label
						>
						<input
							id="kas-fisik"
							type="number"
							min="0"
							step="1000"
							bind:value={kasFisik}
							autofocus
							class="w-full rounded border px-3 py-2 text-sm outline-none"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
						<!-- Denominasi cepat -->
						<div class="mt-1.5 flex flex-wrap gap-1">
							{#each [0, 50000, 100000, 200000, 500000, 1000000] as nom}
								<button
									type="button"
									onclick={() => (kasFisik = nom)}
									class="rounded border px-2 py-0.5 text-xs transition-colors"
									style={kasFisik === nom
										? 'border-color:var(--accent);color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}
								>
									{nom === 0 ? 'Rp 0' : nom >= 1000000 ? '1jt' : nom / 1000 + 'rb'}
								</button>
							{/each}
							<!-- Tombol "sesuai sistem" -->
							<button
								type="button"
								onclick={() => (kasFisik = rekapShift!.kas_sistem)}
								class="rounded border px-2 py-0.5 text-xs transition-colors"
								style={kasFisik === rekapShift.kas_sistem
									? 'border-color:var(--accent);color:var(--accent)'
									: 'border-color:var(--border);color:var(--text-dim)'}
							>
								= Sistem
							</button>
						</div>

						<!-- Selisih real-time -->
						{#if kasFisik > 0 || selisihKas !== 0}
							<div class="mt-2 rounded border px-3 py-2 text-xs font-mono" style={
								selisihKas === 0
									? 'border-color:var(--accent);color:var(--accent);background:var(--surface2)'
									: Math.abs(selisihKas) > 50000
										? 'border-color:var(--danger);color:var(--danger);background:var(--surface2)'
										: 'border-color:var(--warn);color:var(--warn);background:var(--surface2)'
							}>
								{#if selisihKas === 0}
									✓ SESUAI — kas cocok dengan sistem
								{:else if selisihKas > 0}
									+ {rupiah(selisihKas)} lebih dari sistem
								{:else}
									− {rupiah(Math.abs(selisihKas))} kurang dari sistem
								{/if}
							</div>
						{/if}

						<!-- Warning selisih besar -->
						{#if Math.abs(selisihKas) > 50000}
							<p class="mt-1 text-xs" style="color:var(--danger)">
								Selisih besar — pastikan hitungan benar sebelum tutup
							</p>
						{/if}
					</div>

					<!-- Catatan -->
					<div>
						<label for="catatan-tutup" class="mb-1 block text-xs" style="color:var(--text-dim)"
							>Catatan (opsional)</label
						>
						<input
							id="catatan-tutup"
							type="text"
							bind:value={catatanShift}
							placeholder="..."
							class="w-full rounded border px-3 py-2 text-sm outline-none"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
					</div>
				</div>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => (modalTutupShift = false)}
					class="rounded border px-4 py-1.5 text-sm"
					style="border-color:var(--border);color:var(--text-dim)">Batal</button
				>
				<button
					onclick={simpanTutupShift}
					disabled={savingShift || loadingRekap}
					class="rounded px-4 py-1.5 text-sm font-bold disabled:opacity-60"
					style="background:var(--warn);color:var(--bg)"
				>
					{savingShift ? 'Menyimpan...' : 'Tutup Shift'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal konfirmasi reset (GUIDED mode) ────────────────────────────────── -->
{#if konfirmasiReset}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center"
		style="background:rgba(0,0,0,0.55)"
	>
		<div
			class="w-72 rounded-lg border p-6 text-center"
			style="background:var(--surface);border-color:var(--border)"
		>
			<p class="mb-1 font-bold">Reset keranjang?</p>
			<p class="mb-5 text-sm" style="color:var(--text-dim)">
				{$keranjang.length} item akan dihapus dari keranjang
			</p>
			<div class="flex justify-center gap-2">
				<button
					onclick={() => {
						konfirmasiReset = false;
						resetKasir();
					}}
					class="rounded px-4 py-1.5 text-sm font-bold transition-all active:scale-95"
					style="background:var(--danger);color:#fff">Ya, reset (Enter)</button
				>
				<button
					onclick={() => (konfirmasiReset = false)}
					class="rounded border px-4 py-1.5 text-sm transition-all active:scale-95"
					style="border-color:var(--border);color:var(--text-dim)">Batal (ESC)</button
				>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal konfirmasi hapus ──────────────────────────────────────────────── -->
{#if $konfirmasiHapusIdx !== null}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center"
		style="background:rgba(0,0,0,0.55)"
	>
		<div
			class="w-72 rounded-lg border p-6 text-center"
			style="background:var(--surface);border-color:var(--border)"
		>
			<p class="mb-1 font-bold">Hapus dari keranjang?</p>
			<p class="mb-5 text-sm" style="color:var(--text-dim)">
				{$keranjang[$konfirmasiHapusIdx]?.nama_barang ?? ''}
			</p>
			<div class="flex justify-center gap-2">
				<button
					onclick={() => hapusItem($konfirmasiHapusIdx!)}
					class="rounded px-4 py-1.5 text-sm font-bold transition-all active:scale-95"
					style="background:var(--danger);color:#fff">Ya (Enter)</button
				>
				<button
					onclick={() => konfirmasiHapusIdx.set(null)}
					class="rounded border px-4 py-1.5 text-sm transition-all active:scale-95"
					style="border-color:var(--border);color:var(--text-dim)">Batal (ESC)</button
				>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal panduan shortcut keyboard ─────────────────────────────────────── -->
{#if showHelp}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background:rgba(0,0,0,0.6)"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => (showHelp = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'F1') {
				e.preventDefault();
				e.stopPropagation();
				showHelp = false;
			} else if (e.key === 'F3') {
				e.preventDefault();
				e.stopPropagation();
				showHelp = false;
				openSearch();
			} else if (e.key === 'Tab') {
				e.preventDefault();
			}
		}}
	>
		<div
			class="w-full max-w-2xl rounded-lg border p-6"
			style="background:var(--surface);border-color:var(--border)"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<div class="mb-5 flex items-center justify-between">
				<span class="font-bold">Panduan Shortcut Keyboard</span>
				<button
					bind:this={helpCloseBtnEl}
					onclick={() => (showHelp = false)}
					class="px-1 text-xl leading-none"
					style="color:var(--text-dim)">&times;</button
				>
			</div>
			<div class="grid grid-cols-2 gap-x-10 gap-y-2">
				{#each [['ESC', 'Tutup / batal'], ['F1', 'Panduan ini'], ['Tab', 'Fokus ke kanan'], ['F3', 'Cari barang'], ['Shift+Tab', 'Fokus ke kiri'], ['F8', 'Retur penjualan'], ['↑ ↓', 'Navigasi item'], ['F10', 'Proses bayar'], ['← →', 'Qty − / +'], ['F11', 'Buka / tutup shift'], ['ENTER', 'Pilih / konfirmasi'], ['F12', 'Reset keranjang']] as [key, label] (key)}
					<div class="flex items-center gap-3">
						<span
							class="w-20 shrink-0 rounded px-2 py-1 text-center font-mono text-xs"
							style="background:var(--surface2);color:var(--accent);border:1px solid var(--border)"
							>{key}</span
						>
						<span class="text-sm whitespace-nowrap" style="color:var(--text-dim)">{label}</span>
					</div>
				{/each}
			</div>
			<p class="mt-5 text-center text-xs" style="color:var(--text-dim)">
				Tekan ESC atau F1 untuk tutup
			</p>
		</div>
	</div>
{/if}
