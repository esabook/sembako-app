import { toast } from '$lib/stores/ui.store.js'
import type { BarangHarga, HistoriHarga, PreviewMassal, TipeMassal } from './harga.types.js'
import { fetchHarga, updateHarga, fetchHistoriHarga, simulasiMassal, applyMassal } from './harga.api.js'

export function createHargaStore() {
  // ── Daftar ────────────────────────────────────────────────────────────────
  let loading = $state(true)
  let barangList = $state<BarangHarga[]>([])
  let q = $state('')

  const filtered = $derived(
    q.trim()
      ? barangList.filter(
          (b) =>
            b.nama_barang.toLowerCase().includes(q.toLowerCase()) ||
            b.kode_barang.toLowerCase().includes(q.toLowerCase()),
        )
      : barangList,
  )

  async function muat() {
    loading = true
    const res = await fetchHarga()
    if (res.success) barangList = res.data
    else toast.error('Gagal memuat data harga')
    loading = false
  }

  async function reload() {
    const res = await fetchHarga()
    if (res.success) barangList = res.data
  }

  // ── Edit Single ───────────────────────────────────────────────────────────
  let editOpen = $state(false)
  let editTarget = $state<BarangHarga | null>(null)
  let editEceran = $state(0)
  let editGrosir = $state(0)
  let saving = $state(false)

  $effect(() => { if (!editOpen) editTarget = null })

  function bukaEdit(b: BarangHarga) {
    editTarget = b
    editEceran = b.harga_jual_eceran
    editGrosir = b.harga_jual_grosir
    editOpen = true
  }

  async function simpanEdit() {
    if (!editTarget) return
    saving = true
    const res = await updateHarga(editTarget.id, editEceran, editGrosir)
    if (res.success) {
      toast.sukses(`Harga ${editTarget.nama_barang} diperbarui`)
      editOpen = false
      await reload()
    } else {
      toast.error('Gagal menyimpan harga')
    }
    saving = false
  }

  // ── Histori ───────────────────────────────────────────────────────────────
  let historiOpen = $state(false)
  let historiTarget = $state<BarangHarga | null>(null)
  let historiList = $state<HistoriHarga[]>([])
  let loadingHistori = $state(false)

  $effect(() => { if (!historiOpen) historiTarget = null })

  async function bukaHistori(b: BarangHarga) {
    historiTarget = b
    historiOpen = true
    historiList = []
    loadingHistori = true
    const res = await fetchHistoriHarga(b.id)
    if (res.success) historiList = res.data
    else toast.error('Gagal memuat histori harga')
    loadingHistori = false
  }

  // ── Update Massal ─────────────────────────────────────────────────────────
  let massalChecked = $state<Set<number>>(new Set())
  let massalTipe = $state<TipeMassal>('persen')
  let massalNilaiEceran = $state(0)
  let massalNilaiGrosir = $state(0)
  let massalPreview = $state<PreviewMassal[]>([])
  let loadingSimulasi = $state(false)
  let loadingMassal = $state(false)
  let sudahSimulasi = $state(false)

  function resetSimulasi() {
    sudahSimulasi = false
    massalPreview = []
  }

  function toggleAll() {
    massalChecked = massalChecked.size === barangList.length
      ? new Set()
      : new Set(barangList.map((b) => b.id))
    resetSimulasi()
  }

  function toggleSatu(id: number) {
    const s = new Set(massalChecked)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    massalChecked = s
    resetSimulasi()
  }

  async function simulasi() {
    if (!massalChecked.size) { toast.error('Pilih minimal 1 barang'); return }
    loadingSimulasi = true
    const res = await simulasiMassal([...massalChecked], massalTipe, massalNilaiEceran, massalNilaiGrosir)
    if (res.success) {
      massalPreview = res.data
      sudahSimulasi = true
    } else {
      toast.error('Gagal menghitung simulasi')
    }
    loadingSimulasi = false
  }

  async function terapkanMassal(onDone: () => void) {
    loadingMassal = true
    const res = await applyMassal([...massalChecked], massalTipe, massalNilaiEceran, massalNilaiGrosir)
    if (res.success) {
      toast.sukses(`${res.data.updated} barang berhasil diperbarui`)
      massalChecked = new Set()
      massalPreview = []
      sudahSimulasi = false
      massalNilaiEceran = 0
      massalNilaiGrosir = 0
      await reload()
      onDone()
    } else {
      toast.error('Gagal memperbarui harga')
    }
    loadingMassal = false
  }

  // ── Sort (daftar) ─────────────────────────────────────────────────────────
  let sortKey = $state('')
  let sortDir = $state<'asc' | 'desc'>('asc')

  const sortedFiltered = $derived.by(() => {
    if (!sortKey) return filtered
    const list = [...filtered]
    list.sort((a, b) => {
      const av = a[sortKey as keyof BarangHarga]
      const bv = b[sortKey as keyof BarangHarga]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'id')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  })

  return {
    // Daftar
    get loading() { return loading },
    get barangList() { return barangList },
    get q() { return q },
    set q(v) { q = v },
    get filtered() { return filtered },
    get sortedFiltered() { return sortedFiltered },
    get sortKey() { return sortKey },
    set sortKey(v) { sortKey = v },
    get sortDir() { return sortDir },
    set sortDir(v) { sortDir = v },
    muat, reload,

    // Edit single
    get editOpen() { return editOpen },
    set editOpen(v) { editOpen = v },
    get editTarget() { return editTarget },
    get editEceran() { return editEceran },
    set editEceran(v) { editEceran = v },
    get editGrosir() { return editGrosir },
    set editGrosir(v) { editGrosir = v },
    get saving() { return saving },
    bukaEdit, simpanEdit,

    // Histori
    get historiOpen() { return historiOpen },
    set historiOpen(v) { historiOpen = v },
    get historiTarget() { return historiTarget },
    get historiList() { return historiList },
    get loadingHistori() { return loadingHistori },
    bukaHistori,

    // Massal
    get massalChecked() { return massalChecked },
    get massalTipe() { return massalTipe },
    set massalTipe(v) { massalTipe = v },
    get massalNilaiEceran() { return massalNilaiEceran },
    set massalNilaiEceran(v) { massalNilaiEceran = v },
    get massalNilaiGrosir() { return massalNilaiGrosir },
    set massalNilaiGrosir(v) { massalNilaiGrosir = v },
    get massalPreview() { return massalPreview },
    get loadingSimulasi() { return loadingSimulasi },
    get loadingMassal() { return loadingMassal },
    get sudahSimulasi() { return sudahSimulasi },
    resetSimulasi, toggleAll, toggleSatu, simulasi, terapkanMassal,
  }
}

export type HargaStore = ReturnType<typeof createHargaStore>
