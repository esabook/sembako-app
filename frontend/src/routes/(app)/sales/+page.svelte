<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import { api } from '$lib/utils/api.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer', 'sales'].includes($user.role)) goto('/kasir')
  })

  const tab = $derived<'kunjungan'|'agenda'|'pipeline'>((page.url.searchParams.get('tab') as any) ?? 'kunjungan')

  type KunjunganRow = {
    id: number; pelanggan_id: number|null; nama_warung: string; alamat: string|null
    petugas_id: number|null; nama_petugas: string|null
    tanggal: string; tujuan: 'prospek'|'follow_up'|'pengiriman'|'lainnya'
    hasil: string|null; catatan: string|null
    status_tindak_lanjut: 'open'|'selesai'|'pending'
  }
  type AgendaRow = {
    id: number; supplier_id: number|null; nama_supplier: string; tipe: string
    tanggal: string; jam: string|null; lokasi: string|null
    nama_petugas: string|null; hasil: string|null; catatan: string|null
    status: 'dijadwalkan'|'selesai'|'dibatalkan'
  }

  // ── Kunjungan ─────────────────────────────────────────────────────────────
  let kRows = $state<KunjunganRow[]>([])
  let kBulan = $state('')
  let kStatus = $state('')
  let kFormOpen = $state(false)
  let kError = $state('')
  let editKId = $state<number|null>(null)
  let fKNama = $state('')
  let fKAlamat = $state('')
  let fKTanggal = $state(new Date().toISOString().slice(0,10))
  let fKTujuan = $state<KunjunganRow['tujuan']>('prospek')
  let fKHasil = $state('')
  let fKCatatan = $state('')
  let fKStatus = $state<KunjunganRow['status_tindak_lanjut']>('open')

  const TUJUAN_LABEL: Record<KunjunganRow['tujuan'], string> = {
    prospek: 'Prospek', follow_up: 'Follow Up', pengiriman: 'Pengiriman', lainnya: 'Lainnya',
  }
  const STATUS_K_COLOR: Record<KunjunganRow['status_tindak_lanjut'], string> = {
    open: 'var(--warn)', selesai: 'var(--accent)', pending: 'var(--text-dim)',
  }

  async function muatKunjungan() {
    const q = new URLSearchParams()
    if (kBulan) { q.set('dari', kBulan+'-01'); q.set('sampai', kBulan+'-31') }
    if (kStatus) q.set('status', kStatus)
    const r = await api.get<KunjunganRow[]>(`/sales/kunjungan?${q}`)
    if (r.success) kRows = r.data
  }

  function bukaKForm(row?: KunjunganRow) {
    editKId = row?.id ?? null
    fKNama = row?.nama_warung ?? ''
    fKAlamat = row?.alamat ?? ''
    fKTanggal = row?.tanggal ?? new Date().toISOString().slice(0,10)
    fKTujuan = row?.tujuan ?? 'prospek'
    fKHasil = row?.hasil ?? ''
    fKCatatan = row?.catatan ?? ''
    fKStatus = row?.status_tindak_lanjut ?? 'open'
    kError = ''; kFormOpen = true
  }

  async function simpanK() {
    kError = ''
    if (!fKNama.trim()) { kError = 'Nama warung wajib'; return }
    const body = { nama_warung: fKNama.trim(), alamat: fKAlamat||undefined,
      tanggal: fKTanggal, tujuan: fKTujuan, hasil: fKHasil||undefined,
      catatan: fKCatatan||undefined, status_tindak_lanjut: fKStatus }
    const r = editKId
      ? await api.put(`/sales/kunjungan/${editKId}`, body)
      : await api.post('/sales/kunjungan', body)
    if (!r.success) { kError = (r as any).error; return }
    kFormOpen = false; muatKunjungan()
  }

  async function hapusK(id: number) {
    if (!confirm('Hapus kunjungan ini?')) return
    await api.delete(`/sales/kunjungan/${id}`)
    muatKunjungan()
  }

  $effect(() => { if (tab === 'kunjungan') { kBulan; kStatus; muatKunjungan() } })

  // ── Agenda Supplier ───────────────────────────────────────────────────────
  let aRows = $state<AgendaRow[]>([])
  let aBulan = $state('')
  let aStatus = $state('')
  let aFormOpen = $state(false)
  let aError = $state('')
  let editAId = $state<number|null>(null)
  let fANamaSupplier = $state('')
  let fATipe = $state<string>('kunjungan')
  let fATanggal = $state(new Date().toISOString().slice(0,10))
  let fAJam = $state('')
  let fALokasi = $state('')
  let fACatatan = $state('')
  let fAHasil = $state('')
  let fAStatus = $state('dijadwalkan')

  const STATUS_A_COLOR: Record<string, string> = {
    dijadwalkan: 'var(--info)', selesai: 'var(--accent)', dibatalkan: 'var(--danger)',
  }

  async function muatAgenda() {
    const q = new URLSearchParams()
    if (aBulan) { q.set('dari', aBulan+'-01'); q.set('sampai', aBulan+'-31') }
    if (aStatus) q.set('status', aStatus)
    const r = await api.get<AgendaRow[]>(`/sales/agenda-supplier?${q}`)
    if (r.success) aRows = r.data
  }

  function bukaAForm(row?: AgendaRow) {
    editAId = row?.id ?? null
    fANamaSupplier = row?.nama_supplier ?? ''
    fATipe = row?.tipe ?? 'kunjungan'
    fATanggal = row?.tanggal ?? new Date().toISOString().slice(0,10)
    fAJam = row?.jam ?? ''
    fALokasi = row?.lokasi ?? ''
    fACatatan = row?.catatan ?? ''
    fAHasil = row?.hasil ?? ''
    fAStatus = row?.status ?? 'dijadwalkan'
    aError = ''; aFormOpen = true
  }

  async function simpanA() {
    aError = ''
    if (!fANamaSupplier.trim()) { aError = 'Nama supplier wajib'; return }
    const body = { nama_supplier: fANamaSupplier.trim(), tipe: fATipe,
      tanggal: fATanggal, jam: fAJam||undefined, lokasi: fALokasi||undefined,
      catatan: fACatatan||undefined, hasil: fAHasil||undefined, status: fAStatus }
    const r = editAId
      ? await api.put(`/sales/agenda-supplier/${editAId}`, body)
      : await api.post('/sales/agenda-supplier', body)
    if (!r.success) { aError = (r as any).error; return }
    aFormOpen = false; muatAgenda()
  }

  async function hapusA(id: number) {
    if (!confirm('Hapus agenda ini?')) return
    await api.delete(`/sales/agenda-supplier/${id}`)
    muatAgenda()
  }

  $effect(() => { if (tab === 'agenda') { aBulan; aStatus; muatAgenda() } })

  // ── Pipeline Grosir ───────────────────────────────────────────────────────
  type PipelineRow = {
    id: number; nama_pelanggan: string; pelanggan_id: number|null
    nilai_estimasi: number; tahap: string
    produk_minat: string|null; catatan: string|null
    tanggal_masuk: string; tanggal_update: string|null; nama_petugas: string|null
  }

  const TAHAP_ORDER = ['prospek','dikunjungi','penawaran','negosiasi','deal','batal']
  const TAHAP_COLOR: Record<string, string> = {
    prospek: '#6b7280', dikunjungi: '#3b82f6', penawaran: '#f59e0b',
    negosiasi: '#8b5cf6', deal: '#10b981', batal: '#ef4444',
  }

  let pRows = $state<PipelineRow[]>([])
  let pTahap = $state('')
  let pFormOpen = $state(false)
  let pError = $state('')
  let editPId = $state<number|null>(null)
  let fPNama = $state('')
  let fPNilai = $state<number|''>(0)
  let fPTahap = $state('prospek')
  let fPProduk = $state('')
  let fPCatatan = $state('')
  let fPTanggal = $state(new Date().toISOString().slice(0,10))

  async function muatPipeline() {
    const q = new URLSearchParams()
    if (pTahap) q.set('tahap', pTahap)
    const r = await api.get<PipelineRow[]>(`/sales/pipeline?${q}`)
    if (r.success) pRows = r.data
  }

  function bukaPForm(row?: PipelineRow) {
    editPId = row?.id ?? null
    fPNama = row?.nama_pelanggan ?? ''
    fPNilai = row?.nilai_estimasi ?? 0
    fPTahap = row?.tahap ?? 'prospek'
    fPProduk = row?.produk_minat ?? ''
    fPCatatan = row?.catatan ?? ''
    fPTanggal = row?.tanggal_masuk ?? new Date().toISOString().slice(0,10)
    pError = ''; pFormOpen = true
  }

  async function simpanP() {
    pError = ''
    if (!fPNama.trim()) { pError = 'Nama pelanggan wajib'; return }
    const body = { nama_pelanggan: fPNama.trim(), nilai_estimasi: Number(fPNilai)||0,
      tahap: fPTahap, produk_minat: fPProduk||undefined,
      catatan: fPCatatan||undefined, tanggal_masuk: fPTanggal }
    const r = editPId
      ? await api.put(`/sales/pipeline/${editPId}`, body)
      : await api.post('/sales/pipeline', body)
    if (!r.success) { pError = (r as any).error; return }
    pFormOpen = false; muatPipeline()
  }

  async function ubahTahap(id: number, tahap: string) {
    await api.put(`/sales/pipeline/${id}`, { tahap })
    muatPipeline()
  }

  async function hapusP(id: number) {
    if (!confirm('Hapus pipeline ini?')) return
    await api.delete(`/sales/pipeline/${id}`)
    muatPipeline()
  }

  $effect(() => { if (tab === 'pipeline') { pTahap; muatPipeline() } })
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b overflow-x-auto" style="border-color:var(--border)">
    {#each ([['kunjungan','Kunjungan Warung'],['agenda','Agenda Supplier'],['pipeline','Pipeline Grosir']] as const) as [key, label] (key)}
      <button onclick={() => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0"
        style="{tab===key ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}">
        {label}
      </button>
    {/each}
  </div>

  <!-- ════════ KUNJUNGAN WARUNG ════════ -->
  {#if tab === 'kunjungan'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <input type="month" bind:value={kBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <select bind:value={kStatus}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Status</option>
        <option value="open">Open</option>
        <option value="pending">Pending</option>
        <option value="selesai">Selesai</option>
      </select>
      <button onclick={() => bukaKForm()}
        class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Catat Kunjungan</button>
    </div>

    {#if kRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada catatan kunjungan.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:540px">
          <thead><tr style="background:var(--surface2)">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Nama Warung</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tujuan</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Petugas</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
            <th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {#each kRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 text-xs">{row.tanggal}</td>
                <td class="px-3 py-2">
                  <div class="font-medium">{row.nama_warung}</div>
                  {#if row.alamat}<div class="text-xs" style="color:var(--text-dim)">{row.alamat}</div>{/if}
                  {#if row.hasil}<div class="text-xs mt-0.5" style="color:var(--text-dim)">→ {row.hasil}</div>{/if}
                </td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell">{TUJUAN_LABEL[row.tujuan]}</td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.nama_petugas ?? '—'}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-semibold" style="color:{STATUS_K_COLOR[row.status_tindak_lanjut]}">{row.status_tindak_lanjut}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button onclick={() => bukaKForm(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                    style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
                  <button onclick={() => hapusK(row.id)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--danger)">Hapus</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ════════ AGENDA SUPPLIER ════════ -->
  {#if tab === 'agenda'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <input type="month" bind:value={aBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <select bind:value={aStatus}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Status</option>
        <option value="dijadwalkan">Dijadwalkan</option>
        <option value="selesai">Selesai</option>
        <option value="dibatalkan">Dibatalkan</option>
      </select>
      <button onclick={() => bukaAForm()}
        class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Tambah Agenda</button>
    </div>

    {#if aRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada agenda supplier.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:500px">
          <thead><tr style="background:var(--surface2)">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Supplier</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tipe</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Lokasi/Petugas</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
            <th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {#each aRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 text-xs">{row.tanggal}{row.jam ? ' '+row.jam : ''}</td>
                <td class="px-3 py-2 font-medium">
                  <div>{row.nama_supplier}</div>
                  {#if row.hasil}<div class="text-xs" style="color:var(--text-dim)">→ {row.hasil}</div>{/if}
                </td>
                <td class="px-3 py-2 text-xs capitalize hidden sm:table-cell">{row.tipe}</td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">
                  {row.lokasi ?? ''}{row.nama_petugas ? (row.lokasi ? ' · ' : '') + row.nama_petugas : ''}
                  {#if !row.lokasi && !row.nama_petugas}—{/if}
                </td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-semibold" style="color:{STATUS_A_COLOR[row.status]}">{row.status}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button onclick={() => bukaAForm(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                    style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
                  <button onclick={() => hapusA(row.id)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--danger)">Hapus</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- ── Modal: Form Kunjungan ─────────────────────────────────────────────────── -->
<SlideOver bind:open={kFormOpen} title={editKId ? 'Edit Kunjungan' : 'Catat Kunjungan Warung'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanK() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fk-nama" class="text-xs" style="color:var(--text-dim)">NAMA WARUNG *</label>
      <input id="fk-nama" bind:value={fKNama} required placeholder="Warung Bu Tini, Toko XYZ, ..."
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-alamat" class="text-xs" style="color:var(--text-dim)">ALAMAT</label>
      <input id="fk-alamat" bind:value={fKAlamat} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fk-tgl" type="date" bind:value={fKTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tujuan" class="text-xs" style="color:var(--text-dim)">TUJUAN</label>
        <select id="fk-tujuan" bind:value={fKTujuan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(TUJUAN_LABEL) as [v, lbl] (v)}
            <option value={v}>{lbl}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-hasil" class="text-xs" style="color:var(--text-dim)">HASIL KUNJUNGAN</label>
      <input id="fk-hasil" bind:value={fKHasil} placeholder="Ringkasan hasil"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">STATUS TINDAK LANJUT</span>
      <div class="flex gap-3">
        {#each (['open','pending','selesai'] as const) as s (s)}
          <label class="flex items-center gap-1.5 cursor-pointer text-sm capitalize">
            <input type="radio" bind:group={fKStatus} value={s} class="accent-[var(--accent)]" />{s}
          </label>
        {/each}
      </div>
    </div>
    {#if kError}<p class="text-xs" style="color:var(--danger)">{kError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => kFormOpen=false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Form Agenda Supplier ───────────────────────────────────────────── -->
<SlideOver bind:open={aFormOpen} title={editAId ? 'Edit Agenda' : 'Tambah Agenda Supplier'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanA() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fa-sup" class="text-xs" style="color:var(--text-dim)">NAMA SUPPLIER *</label>
      <input id="fa-sup" bind:value={fANamaSupplier} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fa-tipe" class="text-xs" style="color:var(--text-dim)">TIPE</label>
        <select id="fa-tipe" bind:value={fATipe}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each ['kunjungan','negosiasi','pengiriman','lainnya'] as t (t)}
            <option value={t} class="capitalize">{t}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fa-tgl" type="date" bind:value={fATanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-jam" class="text-xs" style="color:var(--text-dim)">JAM</label>
        <input id="fa-jam" type="time" bind:value={fAJam}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-lok" class="text-xs" style="color:var(--text-dim)">LOKASI</label>
        <input id="fa-lok" bind:value={fALokasi} placeholder="Toko / Kantor"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fa-hasil" class="text-xs" style="color:var(--text-dim)">HASIL</label>
      <input id="fa-hasil" bind:value={fAHasil} placeholder="Hasil setelah selesai"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if editAId}
      <div class="flex flex-col gap-1">
        <span class="text-xs" style="color:var(--text-dim)">STATUS</span>
        <div class="flex gap-3">
          {#each ['dijadwalkan','selesai','dibatalkan'] as s (s)}
            <label class="flex items-center gap-1.5 cursor-pointer text-sm">
              <input type="radio" bind:group={fAStatus} value={s} class="accent-[var(--accent)]" />{s}
            </label>
          {/each}
        </div>
      </div>
    {/if}
    {#if aError}<p class="text-xs" style="color:var(--danger)">{aError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => aFormOpen=false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ════════ PIPELINE GROSIR ════════ -->
{#if tab === 'pipeline'}
  <div class="flex flex-wrap gap-2 items-end mb-2">
    <select bind:value={pTahap}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <option value="">Semua Tahap</option>
      {#each TAHAP_ORDER as t (t)}
        <option value={t} style="color:{TAHAP_COLOR[t]}">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
      {/each}
    </select>
    <button onclick={() => bukaPForm()}
      class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Tambah Prospek</button>
  </div>

  <!-- Ringkasan per tahap -->
  {#if pRows.length > 0}
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each TAHAP_ORDER as t (t)}
        {@const cnt = pRows.filter(r => r.tahap === t).length}
        {@const total = pRows.filter(r => r.tahap === t).reduce((s, r) => s + r.nilai_estimasi, 0)}
        {#if cnt > 0}
          <div class="flex-shrink-0 rounded-lg px-3 py-2 border text-center min-w-[80px]"
            style="background:var(--surface);border-color:{TAHAP_COLOR[t]}33">
            <p class="text-xs font-semibold" style="color:{TAHAP_COLOR[t]}">{t}</p>
            <p class="text-lg font-bold" style="color:var(--text)">{cnt}</p>
            {#if total > 0}
              <p class="text-xs" style="color:var(--text-dim)">{(total/1e6).toFixed(1)}jt</p>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if pRows.length === 0}
    <p class="text-sm text-center py-12" style="color:var(--text-dim)">Belum ada pipeline grosir.</p>
  {:else}
    <div class="space-y-2">
      {#each pRows as row (row.id)}
        <div class="rounded-lg border p-3" style="background:var(--surface);border-color:var(--border)">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-sm" style="color:var(--text)">{row.nama_pelanggan}</p>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style="background:{TAHAP_COLOR[row.tahap]}">{row.tahap}</span>
              </div>
              {#if row.nilai_estimasi > 0}
                <p class="text-xs mt-0.5 font-medium" style="color:var(--accent)">
                  Estimasi: Rp {row.nilai_estimasi.toLocaleString('id-ID')}
                </p>
              {/if}
              {#if row.produk_minat}
                <p class="text-xs mt-0.5" style="color:var(--text-dim)">Minat: {row.produk_minat}</p>
              {/if}
              {#if row.catatan}
                <p class="text-xs mt-0.5 italic" style="color:var(--text-dim)">{row.catatan}</p>
              {/if}
              <p class="text-xs mt-1" style="color:var(--text-dim)">
                Masuk: {new Date(row.tanggal_masuk).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                {#if row.nama_petugas} · {row.nama_petugas}{/if}
              </p>
            </div>
            <div class="flex flex-wrap gap-1 flex-shrink-0">
              <!-- Tombol maju tahap -->
              {#each TAHAP_ORDER as t (t)}
                {#if t !== row.tahap && t !== 'batal'}
                  <button onclick={() => ubahTahap(row.id, t)}
                    class="text-xs px-2 py-0.5 rounded border"
                    style="color:{TAHAP_COLOR[t]};border-color:{TAHAP_COLOR[t]}44">→ {t}</button>
                {/if}
              {/each}
              <button onclick={() => bukaPForm(row)}
                class="text-xs px-2 py-1 rounded" style="background:var(--surface2);color:var(--text)">Edit</button>
              <button onclick={() => hapusP(row.id)}
                class="text-xs px-2 py-1 rounded" style="background:#fee2e2;color:#dc2626">Hapus</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<!-- Pipeline SlideOver -->
<SlideOver bind:open={pFormOpen} title={editPId ? 'Edit Pipeline' : 'Tambah Prospek Grosir'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanP() }} class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <label for="fp-nama" class="text-xs" style="color:var(--text-dim)">NAMA PELANGGAN/WARUNG *</label>
      <input id="fp-nama" bind:value={fPNama} required placeholder="Nama toko/warung grosir"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-nilai" class="text-xs" style="color:var(--text-dim)">ESTIMASI NILAI ORDER (Rp)</label>
      <input id="fp-nilai" type="number" min="0" bind:value={fPNilai}
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL MASUK *</label>
      <input id="fp-tgl" type="date" bind:value={fPTanggal} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">TAHAP</span>
      <div class="flex flex-wrap gap-1">
        {#each TAHAP_ORDER as t (t)}
          <button type="button" onclick={() => fPTahap = t}
            class="text-xs px-2 py-1 rounded border transition-colors"
            style={fPTahap === t
              ? `background:${TAHAP_COLOR[t]};color:white;border-color:${TAHAP_COLOR[t]}`
              : 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}>
            {t}
          </button>
        {/each}
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-produk" class="text-xs" style="color:var(--text-dim)">PRODUK YANG DIMINATI</label>
      <input id="fp-produk" bind:value={fPProduk} placeholder="Beras, Minyak, dll"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <textarea id="fp-catatan" bind:value={fPCatatan} rows="2"
        class="px-2 py-1 rounded border outline-none resize-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    {#if pError}<p class="text-xs" style="color:var(--danger)">{pError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => pFormOpen=false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
