import { SvelteMap } from 'svelte/reactivity'
import { withLoading } from '$lib/utils/async'
import {
	fetchReturList,
	fetchKasBank,
	searchPenjualan,
	fetchPenjualanDetail,
	fetchSisaRetur,
	fetchReturDetail,
	fetchBarangCari,
	postRetur,
} from './retur.api.js'
import { hitungTotalRetur, hitungTotalTukar } from './retur.logic.js'
import type {
	ReturListItem,
	PenjualanDetail,
	SisaItem,
	BarangCari,
	ItemTukarForm,
	KasBank,
	ItemRetur,
	ReturDetail,
	MetodeRefund,
} from './retur.types.js'

const hariIni = new Date().toISOString().slice(0, 10)
const sebulanLalu = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)

export function createReturStore() {
	// ── Daftar retur ──────────────────────────────────────────────────────────
	let loading = $state(true)
	let returList = $state<ReturListItem[]>([])
	let error = $state('')
	let filterDari = $state(sebulanLalu)
	let filterSampai = $state(hariIni)

	let kasBankList = $state<KasBank[]>([])

	// ── Modal Buat Retur ──────────────────────────────────────────────────────
	let modalBuat = $state(false)
	let step = $state<1 | 2 | 3>(1)
	let cariNo = $state('')
	let loadingCari = $state(false)
	let errorCari = $state('')
	let trxAsal = $state<PenjualanDetail | null>(null)
	let itemsRetur = $state<ItemRetur[]>([])
	const sisaMap = new SvelteMap<number, SisaItem>()
	let alasan = $state('')
	let metodeRefund = $state<MetodeRefund>('tunai')
	let kasBankId = $state(0)
	let catatan = $state('')
	let saving = $state(false)

	// ── Tukar barang ──────────────────────────────────────────────────────────
	let cariTukar = $state('')
	let loadingTukar = $state(false)
	let hasilCariTukar = $state<BarangCari[]>([])
	let showHasilTukar = $state(false)
	let tukarItems = $state<ItemTukarForm[]>([])

	// ── Modal Detail ──────────────────────────────────────────────────────────
	let modalDetail = $state(false)
	let detailData = $state<ReturDetail | null>(null)
	let loadingDetail = $state(false)

	// ── Derived ───────────────────────────────────────────────────────────────
	let itemsDipilih = $derived(itemsRetur.filter((i) => i.dipilih && i.jumlah_retur > 0))
	let totalRetur = $derived(hitungTotalRetur(itemsDipilih))
	let totalTukar = $derived(hitungTotalTukar(tukarItems))

	// ── Actions ───────────────────────────────────────────────────────────────

	async function muat() {
		loading = true
		error = ''
		const hasil = await withLoading(
			() => fetchReturList(filterDari, filterSampai),
			{ loadingKey: 'retur-muat', modul: 'retur', aksi: 'muat', errorPesan: 'Gagal memuat daftar retur', bisaRetry: true }
		)
		if (hasil !== null) returList = hasil
		else error = 'Gagal memuat daftar retur'
		loading = false
	}

	async function muatKasBank() {
		const hasil = await withLoading(
			() => fetchKasBank(),
			{ loadingKey: 'retur-kas-bank', modul: 'retur', aksi: 'kas-bank' }
		)
		if (hasil) {
			kasBankList = hasil
			kasBankId = hasil[0]?.id ?? 0
		}
	}

	async function init() {
		await Promise.all([muat(), muatKasBank()])
	}

	async function muatTrxDetail(id: number) {
		const detail = await withLoading(
			() => fetchPenjualanDetail(id),
			{ loadingKey: 'retur-detail', modul: 'retur', aksi: 'detail', errorPesan: 'Gagal memuat detail transaksi' }
		)
		if (detail === null) { errorCari = 'Gagal memuat detail transaksi'; return }
		if (detail.status === 'void') { errorCari = 'Transaksi sudah di-void, tidak bisa diretur'; return }

		trxAsal = detail
		sisaMap.clear()

		const sisa = await fetchSisaRetur(id)
		for (const s of sisa) sisaMap.set(s.barang_id, s)

		itemsRetur = detail.items.map((i) => ({ ...i, dipilih: false, jumlah_retur: 0 }))
	}

	async function cariTransaksi() {
		if (!cariNo.trim()) return
		loadingCari = true
		errorCari = ''
		trxAsal = null
		const q = cariNo.trim()

		const list = await withLoading(
			() => searchPenjualan(q),
			{ loadingKey: 'retur-cari', modul: 'retur', aksi: 'cari', errorPesan: 'Gagal mencari transaksi' }
		)
		if (list === null) { errorCari = 'Gagal mencari transaksi'; loadingCari = false; return }

		const found = list.find((t) => t.no_transaksi === q)
		if (found) {
			await muatTrxDetail(found.id)
		} else {
			const detail = await withLoading(
				() => fetchPenjualanDetail(q),
				{ loadingKey: 'retur-cari-id', modul: 'retur', aksi: 'cari', errorPesan: 'Transaksi tidak ditemukan' }
			)
			if (detail === null) { errorCari = 'Transaksi tidak ditemukan'; loadingCari = false; return }
			await muatTrxDetail(detail.id)
		}

		loadingCari = false
	}

	async function lihatDetail(id: number) {
		modalDetail = true
		loadingDetail = true
		detailData = null
		const hasil = await withLoading(
			() => fetchReturDetail(id),
			{ loadingKey: 'retur-lihat', modul: 'retur', aksi: 'lihat' }
		)
		if (hasil) detailData = hasil
		loadingDetail = false
	}

	async function cariBarangTukar() {
		if (!cariTukar.trim()) return
		loadingTukar = true
		const hasil = await withLoading(
			() => fetchBarangCari(cariTukar.trim()),
			{ loadingKey: 'retur-tukar', modul: 'retur', aksi: 'tukar' }
		)
		if (hasil) {
			hasilCariTukar = hasil
			showHasilTukar = true
		}
		loadingTukar = false
	}

	function tambahItemTukar(br: BarangCari) {
		const idx = tukarItems.findIndex((t) => t.barang_id === br.id)
		if (idx >= 0) {
			tukarItems[idx].jumlah += 1
		} else {
			tukarItems.push({
				barang_id: br.id,
				nama_barang: br.nama_barang,
				kode_barang: br.kode_barang,
				satuan_id: br.satuan_dasar_id,
				jumlah: 1,
				harga_jual: br.harga_jual_eceran,
			})
		}
		cariTukar = ''
		hasilCariTukar = []
		showHasilTukar = false
	}

	function hapusItemTukar(idx: number) {
		tukarItems.splice(idx, 1)
	}

	async function submitRetur() {
		if (!trxAsal || !itemsDipilih.length) return
		saving = true
		const body: Record<string, unknown> = {
			penjualan_id: trxAsal.id,
			alasan: alasan || undefined,
			metode_refund: metodeRefund,
			kas_bank_id: metodeRefund === 'tunai' ? kasBankId : undefined,
			catatan: catatan || undefined,
			items: itemsDipilih.map((i) => ({
				barang_id: i.barang_id,
				satuan_id: i.satuan_id ?? undefined,
				jumlah_retur: i.jumlah_retur,
			})),
		}
		if (metodeRefund === 'tukar_barang' && tukarItems.length) {
			body.tukar_items = tukarItems.map((t) => ({
				barang_id: t.barang_id,
				satuan_id: t.satuan_id ?? undefined,
				jumlah: t.jumlah,
				harga_jual: t.harga_jual,
			}))
		}
		const hasil = await withLoading(
			() => postRetur(body),
			{ loadingKey: 'retur-submit', modul: 'retur', aksi: 'submit', errorPesan: 'Gagal memproses retur', suksesOtomatis: true, suksesPesan: 'Retur berhasil diproses' }
		)
		saving = false
		if (hasil === null) { errorCari = 'Gagal memproses retur'; return }
		tutupModalBuat()
		await muat()
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function bukaBuat() {
		modalBuat = true
		step = 1
		cariNo = ''
		errorCari = ''
		trxAsal = null
		itemsRetur = []
		sisaMap.clear()
		alasan = ''
		metodeRefund = 'tunai'
		catatan = ''
		tukarItems = []
		cariTukar = ''
		hasilCariTukar = []
		showHasilTukar = false
	}

	function tutupModalBuat() {
		modalBuat = false
	}

	function lanjutStep2() {
		if (!trxAsal) return
		metodeRefund = trxAsal.metode_bayar === 'hutang' ? 'kurang_piutang' : 'tunai'
		tukarItems = []
		step = 2
	}

	function lanjutStep3() {
		if (!itemsDipilih.length) return
		step = 3
	}

	function onItemCheck(idx: number) {
		if (itemsRetur[idx].dipilih && itemsRetur[idx].jumlah_retur === 0) {
			const sisa = sisaMap.get(itemsRetur[idx].barang_id)
			itemsRetur[idx].jumlah_retur = sisa ? sisa.sisa : itemsRetur[idx].jumlah
		}
	}

	return {
		get loading() { return loading },
		get returList() { return returList },
		get error() { return error },
		get filterDari() { return filterDari },
		set filterDari(v: string) { filterDari = v },
		get filterSampai() { return filterSampai },
		set filterSampai(v: string) { filterSampai = v },
		get kasBankList() { return kasBankList },

		get modalBuat() { return modalBuat },
		set modalBuat(v: boolean) { modalBuat = v },
		get step() { return step },
		set step(v: 1 | 2 | 3) { step = v },
		get cariNo() { return cariNo },
		set cariNo(v: string) { cariNo = v },
		get loadingCari() { return loadingCari },
		get errorCari() { return errorCari },
		get trxAsal() { return trxAsal },
		get itemsRetur() { return itemsRetur },
		get sisaMap() { return sisaMap },
		get alasan() { return alasan },
		set alasan(v: string) { alasan = v },
		get metodeRefund() { return metodeRefund },
		set metodeRefund(v: MetodeRefund) { metodeRefund = v },
		get kasBankId() { return kasBankId },
		set kasBankId(v: number) { kasBankId = v },
		get catatan() { return catatan },
		set catatan(v: string) { catatan = v },
		get saving() { return saving },

		get cariTukar() { return cariTukar },
		set cariTukar(v: string) { cariTukar = v },
		get loadingTukar() { return loadingTukar },
		get hasilCariTukar() { return hasilCariTukar },
		get showHasilTukar() { return showHasilTukar },
		get tukarItems() { return tukarItems },

		get modalDetail() { return modalDetail },
		set modalDetail(v: boolean) { modalDetail = v },
		get detailData() { return detailData },
		get loadingDetail() { return loadingDetail },

		get itemsDipilih() { return itemsDipilih },
		get totalRetur() { return totalRetur },
		get totalTukar() { return totalTukar },

		init,
		muat,
		cariTransaksi,
		lihatDetail,
		cariBarangTukar,
		tambahItemTukar,
		hapusItemTukar,
		submitRetur,
		bukaBuat,
		tutupModalBuat,
		lanjutStep2,
		lanjutStep3,
		onItemCheck,
	}
}
