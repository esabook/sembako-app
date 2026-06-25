import { api } from '$lib/utils/api';
import { withLoading } from '$lib/utils/async.js';
import { toast } from '$lib/stores/ui.store';
import { renderStrukHtml, cetakStrukPopup, type StrukData } from '$lib/utils/struk';
import { rupiah } from '../../kasir.logic';
import {
	fetchHistoriPenjualan,
	fetchDetailPenjualan,
	type HistoriPenjualan,
	type HistoriDetail
} from '../../kasir.api';
import type { ReturDetail } from '../retur/retur.types.js';

function todayStr() {
	return new Date().toLocaleDateString('sv-SE');
}

export function createHistoryStore() {
	let namaToko = $state('Stokasir');
	let alamatToko = $state('');
	let strHeader = $state('');
	let strFooter = $state('Terima kasih sudah berbelanja!');
	let strUkuran = $state('80');

	let historiDari = $state(todayStr());
	let historiSampai = $state(todayStr());
	let historiList = $state<HistoriPenjualan[]>([]);
	let historiDetail = $state<HistoriDetail | null>(null);
	let historiLoading = $state(false);
	let detailOpen = $state(false);
	let returDetail = $state<ReturDetail | null>(null);
	let returLoading = $state(false);
	let returOpen = $state(false);
	let sortKey = $state('tanggal');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const sortedList = $derived.by(() => {
		const list = [...historiList];
		list.sort((a, b) => {
			let av: string | number = '';
			let bv: string | number = '';
			if (sortKey === 'total') { av = a.total; bv = b.total; }
			else if (sortKey === 'tanggal') { av = a.tanggal; bv = b.tanggal; }
			else if (sortKey === 'no_transaksi') { av = a.no_transaksi; bv = b.no_transaksi; }
			else if (sortKey === 'metode_bayar') { av = a.metode_bayar; bv = b.metode_bayar; }
			else if (sortKey === 'tipe') { av = a.tipe; bv = b.tipe; }
			else if (sortKey === 'status') { av = a.status; bv = b.status; }
			const cmp = av < bv ? -1 : av > bv ? 1 : 0;
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	async function muatHistori() {
		historiLoading = true;
		historiDetail = null;
		detailOpen = false;
		const hasil = await withLoading(
			() => fetchHistoriPenjualan(historiDari, historiSampai),
			{
				loadingKey: 'history-muat',
				modul: 'kasir',
				aksi: 'lihat_history',
				errorPesan: 'Gagal memuat riwayat transaksi',
				bisaRetry: true
			}
		);
		if (hasil !== null) historiList = hasil;
		historiLoading = false;
	}

	async function pilihHistori(id: number) {
		const hasil = await withLoading(() => fetchDetailPenjualan(id), {
			loadingKey: 'history-detail',
			modul: 'kasir',
			aksi: 'lihat_detail',
			errorPesan: 'Gagal memuat detail transaksi',
			bisaRetry: true
		});
		if (hasil !== null) {
			historiDetail = hasil;
			detailOpen = true;
		}
	}

	async function bukaRetur(returId: number, e: MouseEvent) {
		e.stopPropagation();
		returLoading = true;
		returOpen = true;
		const res = await withLoading(() => api.get<ReturDetail>(`/retur-penjualan/${returId}`), {
			loadingKey: 'retur-detail',
			modul: 'kasir',
			aksi: 'lihat_retur',
			errorPesan: 'Gagal memuat detail retur',
			bisaRetry: true
		});
		if (res?.success) returDetail = res.data;
		returLoading = false;
	}

	function cetakStrukHistori(d: HistoriDetail) {
		const subtotalKotor = d.items.reduce((s, i) => s + i.jumlah * i.harga_jual, 0);
		const diskonItem = d.items.reduce((s, i) => s + i.diskon_item, 0);
		const data: StrukData = {
			ukuran: strUkuran as '58' | '80',
			namaToko,
			alamat: alamatToko,
			header: strHeader,
			footer: strFooter,
			noTransaksi: d.no_transaksi,
			waktu: new Date(d.tanggal),
			kasirNama: d.kasir_nama ?? '',
			kasirKode: d.kode_karyawan ?? null,
			pelangganNama: d.nama_pelanggan,
			items: d.items.map((i) => ({
				nama: i.nama_barang ?? '-',
				qty: i.jumlah,
				satuan: null,
				harga: i.harga_jual,
				diskon_item: i.diskon_item
			})),
			subtotalKotor,
			diskonItem,
			diskonLain: d.diskon_total,
			ppn: 0,
			total: d.total,
			metode: d.metode_bayar,
			nominal: d.bayar,
			kembali: d.kembalian
		};
		cetakStrukPopup(renderStrukHtml(data), () =>
			toast.error('Popup diblokir browser — izinkan popup untuk halaman ini')
		);
	}

	async function muatPengaturan() {
		const res = await api.get<Record<string, string>>('/pengaturan');
		if (!res.success) return;
		const s = res.data;
		if (s.nama_toko) namaToko = s.nama_toko;
		if (s.alamat) alamatToko = s.alamat;
		if (s.struk_header) strHeader = s.struk_header;
		if (s.struk_footer) strFooter = s.struk_footer;
		if (s.struk_ukuran) strUkuran = s.struk_ukuran;
	}

	return {
		get historiDari() { return historiDari; },
		set historiDari(v) { historiDari = v; },
		get historiSampai() { return historiSampai; },
		set historiSampai(v) { historiSampai = v; },
		get historiList() { return historiList; },
		get historiDetail() { return historiDetail; },
		get historiLoading() { return historiLoading; },
		get detailOpen() { return detailOpen; },
		set detailOpen(v) { detailOpen = v; if (!v) historiDetail = null; },
		get returDetail() { return returDetail; },
		get returLoading() { return returLoading; },
		get returOpen() { return returOpen; },
		set returOpen(v) { returOpen = v; if (!v) returDetail = null; },
		get sortKey() { return sortKey; },
		set sortKey(v) { sortKey = v; },
		get sortDir() { return sortDir; },
		set sortDir(v: 'asc' | 'desc') { sortDir = v; },
		get sortedList() { return sortedList; },
		muatHistori,
		pilihHistori,
		bukaRetur,
		cetakStrukHistori,
		muatPengaturan
	};
}
