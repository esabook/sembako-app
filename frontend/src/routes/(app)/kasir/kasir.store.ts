// State UI + semua actions kasir.
// Tidak ada try/catch langsung — semua async pakai withLoading().
// Debounce input ada di +page.svelte (DOM concern).

import { writable, derived, get } from 'svelte/store';
import QRCode from 'qrcode';
import {
	keranjang, tipeTransaksi, metodeBayar,
	pelangganDipilih, nominalBayar, itemAktifIdx,
	subtotal, diskonMember, kembalian, total,
	resetKasir, incrementTrxCount,
} from '$lib/stores/kasir';
import { loading, toast } from '$lib/stores/ui.store';
import { withLoading } from '$lib/utils/async';
import { bukaWhatsApp } from '$lib/utils/wa';
import { fetchBarang, fetchPelanggan, submitPenjualan, getDraft, saveDraft, deleteDraft } from './kasir.api';
import type { BarangResult, PelangganResult, ScannerStatus, Snap, PromoAktif } from './kasir.types';
import { api } from '$lib/utils/api';

// ── Promo aktif ──────────────────────────────────────────────────────────────

export const promoAktif = writable<PromoAktif[]>([]);

export async function loadPromoAktif() {
	const res = await api.get<PromoAktif[]>('/promo/aktif');
	if (res.success) promoAktif.set(res.data);
}

function hitungDiskonPromo(br: BarangResult, harga: number, qty: number): number {
	const promos = get(promoAktif);
	let best = 0;
	for (const p of promos) {
		if (p.tipe === 'total') continue;
		if (qty < p.min_qty) continue;
		const match =
			(p.tipe === 'item' && p.targets.some((t) => t.target_tipe === 'barang' && t.target_id === br.id)) ||
			(p.tipe === 'kategori' && p.targets.some((t) => t.target_tipe === 'kategori' && t.target_id === br.kategori_id));
		if (!match) continue;
		const diskon = p.tipe_nilai === 'persen' ? Math.round(harga * p.nilai / 100) : p.nilai;
		if (diskon > best) best = diskon;
	}
	return Math.min(best, harga);
}

// Promo tipe 'total' yang berlaku saat ini (dipake di checkout)
export const promoTotalBerlaku = derived(
	[promoAktif, total],
	([$promos, $total]) => $promos.filter((p) => p.tipe === 'total' && $total >= p.min_total)
);

// Nilai diskon terbaik dari promo tipe 'total'
export const diskonPromoTotal = derived(
	[promoTotalBerlaku, total],
	([$promos, $total]) => {
		if ($promos.length === 0) return 0;
		const best = Math.max(...$promos.map((p) =>
			p.tipe_nilai === 'persen' ? Math.round($total * p.nilai / 100) : p.nilai
		));
		return Math.min(best, $total);
	}
);

export const totalAkhir = derived(
	[total, diskonPromoTotal],
	([$t, $d]) => $t - $d
);

// ── Draft persistence ────────────────────────────────────────────────────────

export const draftStatus = writable<'idle' | 'saving' | 'saved' | 'error'>('idle');

let _draftTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDraftSave() {
	if (_draftTimer) clearTimeout(_draftTimer);
	draftStatus.set('saving');
	_draftTimer = setTimeout(async () => {
		const items = get(keranjang);
		try {
			if (items.length === 0) {
				await deleteDraft();
				draftStatus.set('idle');
			} else {
				await saveDraft({
					tipe: get(tipeTransaksi),
					pelanggan_id: get(pelangganDipilih)?.id ?? null,
					items: items.map((i) => ({
						barang_id: i.barang_id,
						tipe_harga: i.tipe_harga,
						satuan_id: i.satuan_id,
						jumlah: i.jumlah,
						harga_jual: i.harga_jual,
						diskon_item: i.diskon_item,
					})),
				});
				draftStatus.set('saved');
			}
		} catch {
			draftStatus.set('error');
		}
	}, 1500);
}

export function initDraftSync(): () => void {
	const unsub1 = keranjang.subscribe(() => scheduleDraftSave());
	const unsub2 = tipeTransaksi.subscribe(() => {
		if (get(keranjang).length > 0) scheduleDraftSave();
	});
	return () => {
		unsub1();
		unsub2();
		if (_draftTimer) clearTimeout(_draftTimer);
	};
}

export async function restoreDraft(): Promise<void> {
	try {
		const draft = await getDraft();
		if (!draft || draft.items.length === 0) return;
		keranjang.set(
			draft.items.map((i) => ({
				barang_id: i.barang_id,
				tipe_harga: i.tipe_harga,
				kode_barang: i.kode_barang,
				nama_barang: i.nama_barang,
				satuan_id: i.satuan_id,
				singkatan_satuan: i.singkatan_satuan ?? '',
				jumlah: i.jumlah,
				harga_jual: i.harga_jual,
				diskon_item: i.diskon_item,
				stok_sekarang: i.stok_sekarang,
			}))
		);
		tipeTransaksi.set(draft.tipe);
		draftStatus.set('saved');
		toast.info('Keranjang dipulihkan');
	} catch {
		// silent — jangan ganggu kasir jika draft gagal dimuat
	}
}

// ── UI state ─────────────────────────────────────────────────────────────────

export const kasBankDipilih = writable<number | null>(null);

export const searchVal         = writable('');
export const searchResults     = writable<BarangResult[]>([]);
export const searchSelectedIdx = writable(-1);

export const pelangganQuery        = writable('');
export const pelangganList         = writable<PelangganResult[]>([]);
export const pelangganSelectedIdx  = writable(-1);

export const konfirmasiHapusIdx = writable<number | null>(null);
export const popupSearch        = writable(false);
export const popupCheckout      = writable(false);
export const snap               = writable<Snap | null>(null);
export const noTransaksi        = writable<string>('');   // no. trx terakhir selesai
export const checkoutTime       = writable(new Date());

export const scanSessionId  = writable('');
export const scanUrl        = writable('');
export const qrDataUrl      = writable('');
export const qrLarge        = writable(false);
export const scannerStatus  = writable<ScannerStatus>('idle');

// Derived: apakah loading spesifik sedang berjalan
export const cariLoading  = derived(loading, ($l) => $l.some((l) => l.key === 'kasir-cari'));
export const prosesLoading = derived(loading, ($l) => $l.some((l) => l.key === 'kasir-bayar'));

// ── SSE internals (browser-only, tidak reaktif) ────────────────────────────

let kasirSse: EventSource | null = null;
let lastSseEventMs = 0;
let sseWatchdog: ReturnType<typeof setInterval> | null = null;
const SSE_TIMEOUT_MS = 15_000;

export function resetKasirDenganDraft() {
	if (_draftTimer) clearTimeout(_draftTimer);
	void deleteDraft().catch(() => {});
	draftStatus.set('idle');
	resetKasir();
}

// ── Cari barang ───────────────────────────────────────────────────────────────

export async function cariBarang(q: string) {
	if (!q.trim()) {
		searchResults.set([]);
		searchSelectedIdx.set(-1);
		return;
	}
	const hasil = await withLoading(() => fetchBarang(q), {
		loadingKey: 'kasir-cari',
		modul: 'kasir',
		aksi: 'cari_barang',
		bisaRetry: true,
	});
	if (hasil) {
		searchResults.set(hasil);
		searchSelectedIdx.set(hasil.length > 0 ? 0 : -1);
	}
}

export function openSearch() {
	popupSearch.set(true);
}

export function closeSearch() {
	popupSearch.set(false);
	searchVal.set('');
	searchResults.set([]);
	searchSelectedIdx.set(-1);
}

export async function scanDariPhone(kode: string, qty = 1) {
	const hasil = await withLoading(() => fetchBarang(kode), {
		loadingKey: 'kasir-scan',
		modul: 'kasir',
		aksi: 'scan_barang',
	});
	if (!hasil) return;
	if (!get(popupSearch) && hasil.length === 1) {
		tambahKeKeranjang(hasil[0]!, qty);
		return;
	}
	searchVal.set(kode);
	searchResults.set(hasil);
	searchSelectedIdx.set(hasil.length > 0 ? 0 : -1);
	if (!get(popupSearch)) openSearch();
}

// ── Keranjang ─────────────────────────────────────────────────────────────────

export function tambahKeKeranjang(br: BarangResult, qty = 1) {
	const tipe = get(tipeTransaksi);
	const harga = tipe === 'grosir' ? br.harga_jual_grosir : br.harga_jual_eceran;
	const jumlahAktual = Math.min(qty, br.stok_sekarang);
	const diskonPromo = hitungDiskonPromo(br, harga, jumlahAktual);
	keranjang.update((k) => {
		const idx = k.findIndex((i) => i.barang_id === br.id && i.tipe_harga === tipe);
		if (idx >= 0) {
			const u = [...k];
			const newJumlah = Math.min(u[idx]!.jumlah + qty, u[idx]!.stok_sekarang);
			u[idx] = { ...u[idx]!, jumlah: newJumlah, diskon_item: hitungDiskonPromo(br, harga, newJumlah) };
			itemAktifIdx.set(idx);
			return u;
		}
		itemAktifIdx.set(k.length);
		return [
			...k,
			{
				barang_id: br.id,
				tipe_harga: tipe,
				kode_barang: br.kode_barang,
				nama_barang: br.nama_barang,
				satuan_id: br.satuan_dasar_id,
				singkatan_satuan: br.singkatan_satuan ?? '',
				jumlah: jumlahAktual,
				harga_jual: harga,
				diskon_item: diskonPromo,
				stok_sekarang: br.stok_sekarang,
			},
		];
	});
	closeSearch();
}

export function ubahJumlah(idx: number, delta: number) {
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

export function hapusItem(idx: number) {
	keranjang.update((k) => {
		const u = [...k];
		u.splice(idx, 1);
		return u;
	});
	itemAktifIdx.set(-1);
	konfirmasiHapusIdx.set(null);
}

export function ubahDiskon(idx: number, val: string) {
	keranjang.update((k) => {
		const u = [...k];
		if (u[idx]) u[idx] = { ...u[idx]!, diskon_item: Number(val) || 0 };
		return u;
	});
}

// ── Pelanggan ─────────────────────────────────────────────────────────────────

export async function muatPelanggan(q: string) {
	pelangganQuery.set(q);
	if (q.length < 3) {
		pelangganList.set([]);
		pelangganSelectedIdx.set(-1);
		return;
	}
	const hasil = await withLoading(() => fetchPelanggan(q), {
		loadingKey: 'kasir-pelanggan',
		modul: 'kasir',
		aksi: 'cari_pelanggan',
	});
	if (hasil) {
		pelangganList.set(hasil);
		pelangganSelectedIdx.set(hasil.length > 0 ? 0 : -1);
	}
}

export function pilihPelanggan(p: PelangganResult) {
	pelangganDipilih.set(p);
	pelangganList.set([]);
	pelangganQuery.set('');
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export function openCheckout() {
	if (get(keranjang).length === 0) return;
	snap.set(null);
	checkoutTime.set(new Date());
	popupCheckout.set(true);
}

export function tutupCheckout() {
	popupCheckout.set(false);
	snap.set(null);
	kasBankDipilih.set(null);
}

export async function prosesBayar() {
	const $metode  = get(metodeBayar);
	const $pelanggan = get(pelangganDipilih);
	const $total   = get(totalAkhir);
	const $nominal = get(nominalBayar);
	const $keranjang = get(keranjang);
	const $tipe    = get(tipeTransaksi);
	const $waktu   = get(checkoutTime);

	if ($metode === 'hutang' && !$pelanggan) {
		toast.error('Pilih pelanggan untuk transaksi hutang');
		return;
	}
	if ($metode !== 'hutang' && Number($nominal) < $total) {
		toast.error('Nominal bayar kurang');
		return;
	}

	const $diskonMember = get(diskonMember);
	const $diskonPromo  = get(diskonPromoTotal);
	const diskonTotalKirim = $diskonMember + $diskonPromo;

	const hasil = await withLoading(
		() =>
			submitPenjualan({
				pelanggan_id: $pelanggan?.id,
				tipe: $tipe,
				metode_bayar: $metode,
				bayar: Number($nominal) || $total,
				diskon_total: diskonTotalKirim > 0 ? diskonTotalKirim : undefined,
				kas_bank_id: get(kasBankDipilih) ?? undefined,
				items: $keranjang.map((i) => ({
					barang_id: i.barang_id,
					satuan_id: i.satuan_id,
					jumlah: i.jumlah,
					harga_jual: i.harga_jual,
					diskon_item: i.diskon_item,
				})),
			}),
		{
			loadingKey: 'kasir-bayar',
			loadingPesan: 'Memproses transaksi...',
			modul: 'kasir',
			aksi: 'proses_bayar',
			errorPesan: 'Transaksi gagal. Coba lagi.',
		}
	);

	if (!hasil) return;

	const noTrx = hasil.no_transaksi;
	snap.set({
		items: [...$keranjang],
		subtotal: get(subtotal),
		diskon: get(diskonMember),
		total: $total,
		metode: $metode,
		nominal: Number($nominal) || $total,
		kembalian: get(kembalian),
		pelanggan: $pelanggan,
		tipe: $tipe,
		noTransaksi: noTrx,
		waktu: $waktu,
	});
	noTransaksi.set(noTrx);
	incrementTrxCount();
	void deleteDraft().catch(() => {});
	draftStatus.set('idle');
	resetKasir();
}

// ── Kirim Struk WhatsApp ─────────────────────────────────────────────────────

function rupiah(n: number): string {
	return new Intl.NumberFormat('id-ID').format(Math.round(n));
}

export function kirimStrukWA(s: Snap): void {
	const tgl = s.waktu.toLocaleString('id-ID', {
		day: '2-digit', month: 'short', year: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
	const metodeTeks: Record<string, string> = {
		tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', hutang: 'Hutang',
	};
	const lines: string[] = [
		'*STRUK BELANJA*',
		`No: ${s.noTransaksi}`,
		`Tgl: ${tgl}`,
		'─────────────────',
		...s.items.map((i) => {
			const sub = (i.harga_jual - (i.diskon_item ?? 0)) * i.jumlah;
			return `${i.nama_barang}\n  ${i.jumlah} × Rp ${rupiah(i.harga_jual)}${i.diskon_item ? ` -${rupiah(i.diskon_item)}` : ''} = Rp ${rupiah(sub)}`;
		}),
		'─────────────────',
		s.diskon > 0 ? `Subtotal : Rp ${rupiah(s.subtotal)}` : '',
		s.diskon > 0 ? `Diskon   : -Rp ${rupiah(s.diskon)}` : '',
		`*Total   : Rp ${rupiah(s.total)}*`,
		`Bayar    : ${metodeTeks[s.metode] ?? s.metode}${s.metode === 'tunai' ? ` Rp ${rupiah(s.nominal)}` : ''}`,
		s.metode === 'tunai' && s.kembalian > 0 ? `Kembali  : Rp ${rupiah(s.kembalian)}` : '',
		'',
		'Terima kasih atas pembeliannya! 🙏',
	].filter(Boolean);

	const pesan = lines.join('\n');
	bukaWhatsApp(s.pelanggan?.kontak ?? null, pesan);
}

export function kirimNotifHutangWA(s: Snap): void {
	const tgl = s.waktu.toLocaleString('id-ID', {
		day: '2-digit', month: 'short', year: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
	const lines = [
		'*NOTIFIKASI HUTANG*',
		`No Transaksi : ${s.noTransaksi}`,
		`Tanggal      : ${tgl}`,
		`Total Hutang : *Rp ${rupiah(s.total)}*`,
		'',
		'Pembayaran dapat dilakukan langsung ke toko.',
		'Terima kasih. 🙏',
	];
	bukaWhatsApp(s.pelanggan?.kontak ?? null, lines.join('\n'));
}

// ── SSE Scanner ───────────────────────────────────────────────────────────────

export function connectKasirSse() {
	kasirSse?.close();
	const sid = get(scanSessionId);
	kasirSse = new EventSource(`/api/scan-relay/kasir/${sid}`);
	kasirSse.onopen = () => {
		scannerStatus.set('connected');
		lastSseEventMs = Date.now();
	};
	kasirSse.onmessage = (e) => {
		lastSseEventMs = Date.now();
		const msg = JSON.parse(e.data as string) as {
			type: string;
			kode?: string;
			qty?: number;
		};
		if (msg.type === 'scan' && msg.kode) {
			if (get(popupCheckout) && !get(pelangganDipilih)) {
				void muatPelanggan(msg.kode);
			} else {
				void scanDariPhone(msg.kode, msg.qty ?? 1);
			}
		}
	};
	kasirSse.onerror = () => scannerStatus.set('disconnected');
}

export function startSseWatchdog() {
	if (sseWatchdog) clearInterval(sseWatchdog);
	sseWatchdog = setInterval(() => {
		if (lastSseEventMs > 0 && Date.now() - lastSseEventMs > SSE_TIMEOUT_MS) {
			scannerStatus.set('disconnected');
			connectKasirSse();
		}
	}, 5_000);
}

export async function initKasirScan(userId: number, host: string, protocol: string) {
	const sid = `kasir${userId}`;
	const url = `${protocol}//${host}/scan?s=${sid}`;
	scanSessionId.set(sid);
	scanUrl.set(url);
	const dataUrl = await QRCode.toDataURL(url, { width: 128, margin: 1 });
	qrDataUrl.set(dataUrl);
	connectKasirSse();
	startSseWatchdog();
}

export function cleanupKasirScan() {
	if (sseWatchdog) clearInterval(sseWatchdog);
	kasirSse?.close();
}
