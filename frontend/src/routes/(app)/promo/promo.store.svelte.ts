import { api } from '$lib/utils/api'
import { toast } from '$lib/stores/ui.store'
import { isAktifHariIni } from './promo.logic'
import type { Promo, PromoTarget, BarangOption, KategoriOption, FormPromo } from './promo.types'

export function createPromoStore() {
  let promoList = $state<Promo[]>([])
  let barangList = $state<BarangOption[]>([])
  let kategoriList = $state<KategoriOption[]>([])
  let loading = $state(false)
  let saving = $state(false)
  let modalOpen = $state(false)
  let editPromo = $state<Promo | null>(null)
  let error = $state('')
  let targetQuery = $state('')
  let pSortKey = $state('')
  let pSortDir = $state<'asc' | 'desc'>('asc')

  let fb = $state<FormPromo>({
    nama: '', deskripsi: '', tipe: 'item', nilai: '', tipe_nilai: 'persen',
    min_qty: '1', min_total: '0', berlaku_mulai: '', berlaku_sampai: '', max_penggunaan: '',
  })
  let fbTargets = $state<PromoTarget[]>([])

  const sortedPromo = $derived.by(() => {
    if (!pSortKey) return promoList
    const list = [...promoList]
    list.sort((a, b) => {
      const av = a[pSortKey as keyof Promo]
      const bv = b[pSortKey as keyof Promo]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'id')
      return pSortDir === 'asc' ? cmp : -cmp
    })
    return list
  })

  const filteredBarang = $derived(
    targetQuery.length >= 2
      ? barangList.filter((b) =>
          b.nama_barang.toLowerCase().includes(targetQuery.toLowerCase()) ||
          b.kode_barang.toLowerCase().includes(targetQuery.toLowerCase())
        ).slice(0, 8)
      : []
  )

  const filteredKategori = $derived(
    fb.tipe === 'kategori' && targetQuery.length >= 1
      ? kategoriList.filter((k) => k.nama.toLowerCase().includes(targetQuery.toLowerCase()))
      : []
  )

  const aktifHariIni = $derived(promoList.filter(isAktifHariIni).length)

  async function muat() {
    loading = true
    const r = await api.get<Promo[]>('/promo')
    if (r.success) promoList = r.data
    loading = false
  }

  async function muatMeta() {
    const [br, kat] = await Promise.all([
      api.get<BarangOption[]>('/barang'),
      api.get<KategoriOption[]>('/barang/kategori'),
    ])
    if (br.success) barangList = br.data
    if (kat.success) kategoriList = kat.data
  }

  function bukaForm(p?: Promo) {
    editPromo = p ?? null
    error = ''
    targetQuery = ''
    if (p) {
      fb = {
        nama: p.nama, deskripsi: p.deskripsi ?? '', tipe: p.tipe,
        nilai: String(p.nilai), tipe_nilai: p.tipe_nilai,
        min_qty: String(p.min_qty), min_total: String(p.min_total),
        berlaku_mulai: p.berlaku_mulai ?? '', berlaku_sampai: p.berlaku_sampai ?? '',
        max_penggunaan: p.max_penggunaan !== null ? String(p.max_penggunaan) : '',
      }
      fbTargets = p.targets.map((t) => ({
        target_tipe: t.target_tipe,
        target_id: t.target_id,
        nama: t.target_tipe === 'barang'
          ? barangList.find((b) => b.id === t.target_id)?.nama_barang
          : kategoriList.find((k) => k.id === t.target_id)?.nama,
      }))
    } else {
      fb = { nama: '', deskripsi: '', tipe: 'item', nilai: '', tipe_nilai: 'persen',
        min_qty: '1', min_total: '0', berlaku_mulai: '', berlaku_sampai: '', max_penggunaan: '' }
      fbTargets = []
    }
    modalOpen = true
  }

  function tambahTarget(tipe: 'barang' | 'kategori', id: number, nama: string) {
    if (fbTargets.some((t) => t.target_tipe === tipe && t.target_id === id)) return
    fbTargets = [...fbTargets, { target_tipe: tipe, target_id: id, nama }]
    targetQuery = ''
  }

  function hapusTarget(i: number) {
    fbTargets = fbTargets.filter((_, j) => j !== i)
  }

  function setTipe(t: 'item' | 'kategori' | 'total') {
    fb.tipe = t
    fbTargets = []
  }

  async function simpan() {
    error = ''
    if (!fb.nama.trim()) { error = 'Nama promo wajib diisi'; return }
    if (!fb.nilai || Number(fb.nilai) <= 0) { error = 'Nilai diskon harus > 0'; return }
    if (fb.tipe !== 'total' && fbTargets.length === 0) { error = 'Tambah minimal 1 target (barang/kategori)'; return }

    saving = true
    const body = {
      nama: fb.nama.trim(),
      deskripsi: fb.deskripsi || undefined,
      tipe: fb.tipe,
      nilai: Number(fb.nilai),
      tipe_nilai: fb.tipe_nilai,
      min_qty: Number(fb.min_qty) || 1,
      min_total: Number(fb.min_total) || 0,
      berlaku_mulai: fb.berlaku_mulai || undefined,
      berlaku_sampai: fb.berlaku_sampai || undefined,
      max_penggunaan: fb.max_penggunaan ? Number(fb.max_penggunaan) : undefined,
      targets: fb.tipe !== 'total' ? fbTargets.map((t) => ({ target_tipe: t.target_tipe, target_id: t.target_id })) : [],
    }

    const r = editPromo?.id
      ? await api.put(`/promo/${editPromo.id}`, body)
      : await api.post('/promo', body)
    saving = false

    if (!r.success) { error = (r as { success: false; error: string }).error; return }
    modalOpen = false
    toast.sukses(editPromo?.id ? 'Promo diperbarui' : 'Promo ditambahkan')
    muat()
  }

  async function toggleAktif(p: Promo) {
    await api.put(`/promo/${p.id}`, { aktif: !p.aktif })
    muat()
  }

  async function hapus(id: number) {
    if (!confirm('Nonaktifkan promo ini?')) return
    await api.delete(`/promo/${id}`)
    muat()
  }

  return {
    get promoList() { return promoList },
    get barangList() { return barangList },
    get kategoriList() { return kategoriList },
    get loading() { return loading },
    get saving() { return saving },
    get modalOpen() { return modalOpen },
    set modalOpen(v: boolean) { modalOpen = v },
    get editPromo() { return editPromo },
    get error() { return error },
    get targetQuery() { return targetQuery },
    set targetQuery(v: string) { targetQuery = v },
    get pSortKey() { return pSortKey },
    set pSortKey(v: string) { pSortKey = v },
    get pSortDir() { return pSortDir },
    set pSortDir(v: 'asc' | 'desc') { pSortDir = v },
    get sortedPromo() { return sortedPromo },
    get filteredBarang() { return filteredBarang },
    get filteredKategori() { return filteredKategori },
    get aktifHariIni() { return aktifHariIni },
    get fb() { return fb },
    get fbTargets() { return fbTargets },
    muat, muatMeta, bukaForm, tambahTarget, hapusTarget, setTipe, simpan, toggleAktif, hapus,
  }
}
