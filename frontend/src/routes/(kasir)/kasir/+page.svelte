<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { keranjang, itemAktifIdx, initKasirMode } from '$lib/stores/kasir';
	import {
		// state
		searchVal,
		konfirmasiHapusIdx,
		popupSearch,
		popupCheckout,
		qrLarge,
		// actions
		cariBarang,
		openSearch,
		closeSearch,
		dummyJumlah,
		ubahJumlah,
		hapusItem,
		openCheckout,
		tutupCheckout,
		initDraftSync,
		loadOpenBills,
		mulaiBillMeja,
		resetKasirDenganDraft
	} from './kasir.store';
	import ShiftBuka from './ShiftBuka.svelte';
	import ShiftTutup from './ShiftTutup.svelte';
	import KasirHelp from './KasirHelp.svelte';
	import KasirCheckout from './KasirCheckout.svelte';
	import KasirQrPanel from './KasirQrPanel.svelte';
	import KasirSpotlight from './KasirSpotlight.svelte';
	import KasirKeranjang from './KasirKeranjang.svelte';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { tinykeys } from 'tinykeys';
	import type { ShiftAktif } from './kasir.types';

	// ── ConfirmDialog hapus item keranjang ────────────────────────────────────
	let konfirmasiHapusOpen = $derived($konfirmasiHapusIdx !== null);

	// ── Pengaturan toko (dipakai cetakStrukHistori + KasirCheckout) ───────────
	let namaToko = $state('Stokasir');
	let alamatToko = $state('');
	let strHeader = $state('');
	let strFooter = $state('Terima kasih sudah berbelanja!');
	let strUkuran = $state('80');
	let strCopy = $state('1');
	let autoCetak = $state(false);
	let printerMode = $state('browser');
	let printerBridgePort = $state('9999');

	// Reset confirm
	let konfirmasiReset = $state(false);

	// Panduan shortcut keyboard
	let showHelp = $state(false);

	// ── DOM refs ──────────────────────────────────────────────────────────────
	let diskonInputRefs = $state<(HTMLInputElement | undefined)[]>([]);

	// ── Keyboard: global ──────────────────────────────────────────────────────
	function closeAll() {
		if ($popupSearch) closeSearch();
		if ($popupCheckout) tutupCheckout();
		modalBukaShift = false;
		modalTutupShift = false;
		showHelp = false;
	}

	const inInput = () =>
		['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName ?? '');

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

	let shiftAktif = $state<ShiftAktif | null>(null);
	let modalBukaShift = $state(false);
	let modalTutupShift = $state(false);

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
		modalBukaShift = true;
	}

	function bukaTutupShift() {
		if (!shiftAktif) {
			toast.warn('Buka shift terlebih dahulu');
			return;
		}
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
		const mejaParam = Number(new URLSearchParams(window.location.search).get('meja'));
		if (mejaParam) void mulaiBillMeja(mejaParam);
		else void loadOpenBills();
		muatShiftAktif().then(() => {
			if (!shiftAktif) modalBukaShift = true;
		});

		void api.get<Record<string, string>>('/pengaturan').then((res) => {
			if (!res.success) return;
			const s = res.data;
			if (s.nama_toko) namaToko = s.nama_toko;
			if (s.alamat) alamatToko = s.alamat;
			if (s.struk_header) strHeader = s.struk_header;
			if (s.struk_footer) strFooter = s.struk_footer;
			if (s.struk_ukuran) strUkuran = s.struk_ukuran;
			if (s.struk_copy) strCopy = s.struk_copy;
			autoCetak = s.auto_cetak === 'true';
			if (s.printer_mode) printerMode = s.printer_mode;
			if (s.printer_bridge_port) printerBridgePort = s.printer_bridge_port;
		});
		const cleanupDraft = initDraftSync();
		// barcode detector harus didaftarkan SEBELUM tinykeys agar stopImmediatePropagation bekerja
		const cleanupBarcode = setupBarcodeDetector();
		const cleanupKeys = tinykeys(window, {
			F1: (e) => {
				e.preventDefault();
				if (showHelp) {
					showHelp = false;
					return;
				}
				closeAll();
				showHelp = true;
			},
			F3: (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($popupSearch) {
					closeSearch();
					return;
				}
				closeAll();
				openSearch();
			},
			F7: (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				closeAll();
				void goto('/kasir/history');
			},
			F8: (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				closeAll();
				void goto('/kasir/retur');
			},
			F10: (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($keranjang.length === 0) return;
				if ($popupCheckout) {
					tutupCheckout();
					return;
				}
				handleProsesBayar();
			},
			F11: (e) => {
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
			F12: (e) => {
				e.preventDefault();
				if (konfirmasiReset || $konfirmasiHapusIdx !== null) return;
				if ($keranjang.length === 0) return;
				closeAll();
				konfirmasiReset = true;
			},
			Escape: (e) => {
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
			},
			ArrowUp: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.preventDefault();
				itemAktifIdx.update((i) => Math.max(i - 1, 0));
			},
			ArrowDown: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.preventDefault();
				itemAktifIdx.update((i) => Math.min(i < 0 ? 0 : i + 1, $keranjang.length));
			},
			ArrowLeft: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) {
					dummyJumlah.update((n: number) => Math.max(1, n - 1));
					return;
				}
				const cur = $keranjang[$itemAktifIdx];
				if (cur && cur.jumlah <= 1) konfirmasiHapusIdx.set($itemAktifIdx);
				else ubahJumlah($itemAktifIdx, -1);
			},
			ArrowRight: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) {
					dummyJumlah.update((n: number) => n + 1);
					return;
				}
				ubahJumlah($itemAktifIdx, 1);
			},
			Enter: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0 || $itemAktifIdx < 0) return;
				e.preventDefault();
				if ($itemAktifIdx === $keranjang.length) {
					openSearch();
					return;
				}
				const el = diskonInputRefs[$itemAktifIdx];
				el?.focus();
				el?.select();
			},
			Delete: (e) => {
				if (inInput() || $popupSearch || $popupCheckout) return;
				if ($konfirmasiHapusIdx !== null || konfirmasiReset) return;
				if ($keranjang.length === 0) return;
				e.stopPropagation();
				konfirmasiHapusIdx.set($itemAktifIdx);
			}
		});
		return () => {
			cleanupDraft();
			cleanupBarcode();
			cleanupKeys();
		};
	});
</script>

<svelte:head><title>Kasir — Stokasir</title></svelte:head>

<div class="flex h-full flex-col">
	<!-- ─── Main: Keranjang + Bottom Bar ─────────────────────────────────────── -->
	<KasirKeranjang
		bind:diskonInputRefs
		{shiftAktif}
		onbukaTutupShift={bukaTutupShift}
		onbukaBukaShift={() => void bukaBukaShift()}
		onprocesBayar={handleProsesBayar}
	/>
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
<KasirCheckout
	{namaToko}
	{alamatToko}
	{strHeader}
	{strFooter}
	{strUkuran}
	{strCopy}
	{autoCetak}
	{printerMode}
	{printerBridgePort}
/>

<!-- ─── Shift Buka / Tutup ────────────────────────────────────────────────────── -->
<ShiftBuka
	bind:open={modalBukaShift}
	onberhasil={(shift) => {
		shiftAktif = shift;
	}}
/>
<ShiftTutup
	bind:open={modalTutupShift}
	{shiftAktif}
	onberhasil={() => {
		shiftAktif = null;
	}}
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
	cancelable={false}
	onkiri={() => konfirmasiHapusIdx.set(null)}
	onkanan={() => $konfirmasiHapusIdx !== null && hapusItem($konfirmasiHapusIdx)}
/>

<!-- ─── Modal panduan shortcut keyboard ─────────────────────────────────────── -->
<KasirHelp bind:open={showHelp} oncariBara={openSearch} />
