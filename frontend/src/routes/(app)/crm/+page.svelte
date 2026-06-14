<svelte:head><title>CRM — Stokasir</title></svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import { api } from '$lib/utils/api.js'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import Button from '$lib/components/ui/Button.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer', 'kasir', 'pelayanan'].includes($user.role)) goto('/kasir')
  })

  const tab = $derived<'permintaan'|'komplain'>((page.url.searchParams.get('tab') as any) ?? 'permintaan')

  type PermintaanRow = {
    id: number; pelanggan_id: number|null; nama_pelanggan: string|null
    nama_barang: string; barang_id: number|null; qty_minta: number|null
    catatan: string|null; status: 'menunggu'|'tersedia'|'tidak_tersedia'
    tanggal: string; nama_petugas: string|null
  }
  type KomplainRow = {
    id: number; pelanggan_id: number|null; nama_pelanggan: string|null
    kategori: string; deskripsi: string; tanggal: string
    status: 'masuk'|'diproses'|'selesai'|'ditolak'
    resolusi: string|null; nama_petugas: string|null
  }

  // ── Permintaan Pelanggan ──────────────────────────────────────────────────
  let pRows = $state<PermintaanRow[]>([])
  let pBulan = $state('')
  let pStatus = $state('')
  let pFormOpen = $state(false)
  let pError = $state('')
  let fPNama = $state('')
  let fPPelanggan = $state('')
  let fPBarang = $state('')
  let fPQty = $state('')
  let fPCatatan = $state('')
  let fPTanggal = $state(new Date().toISOString().slice(0,10))

  const STATUS_P_COLOR: Record<PermintaanRow['status'], string> = {
    menunggu: 'var(--warn)', tersedia: 'var(--accent)', tidak_tersedia: 'var(--danger)',
  }

  async function muatPermintaan() {
    const q = new URLSearchParams()
    if (pBulan) { q.set('dari', pBulan+'-01'); q.set('sampai', pBulan+'-31') }
    if (pStatus) q.set('status', pStatus)
    const r = await api.get<PermintaanRow[]>(`/crm/permintaan?${q}`)
    if (r.success) pRows = r.data
  }

  async function simpanPermintaan() {
    pError = ''
    if (!fPBarang.trim()) { pError = 'Nama barang wajib'; return }
    const r = await api.post('/crm/permintaan', {
      nama_barang: fPBarang.trim(), nama_pelanggan: fPNama.trim()||undefined,
      qty_minta: fPQty ? Number(fPQty) : undefined,
      catatan: fPCatatan.trim()||undefined, tanggal: fPTanggal,
    })
    if (!r.success) { pError = (r as any).error; return }
    pFormOpen = false; muatPermintaan()
  }

  async function ubahStatusP(id: number, status: PermintaanRow['status']) {
    await api.put(`/crm/permintaan/${id}`, { status })
    muatPermintaan()
  }

  let konfirmPermintaanId = $state<number | null>(null)
  let konfirmPermintaanBuka = $state(false)

  function hapusP(id: number) {
    konfirmPermintaanId = id
    konfirmPermintaanBuka = true
  }

  async function doHapusP() {
    if (!konfirmPermintaanId) return
    await api.delete(`/crm/permintaan/${konfirmPermintaanId}`)
    konfirmPermintaanId = null
    muatPermintaan()
  }

  $effect(() => { if (tab === 'permintaan') { pBulan; pStatus; muatPermintaan() } })

  // ── Komplain Pelanggan ────────────────────────────────────────────────────
  let kRows = $state<KomplainRow[]>([])
  let kBulan = $state('')
  let kStatus = $state('')
  let kFormOpen = $state(false)
  let kDetailOpen = $state(false)
  let kDetailRow = $state<KomplainRow|null>(null)
  let kError = $state('')
  let fKPelanggan = $state('')
  let fKKategori = $state('lainnya')
  let fKDeskripsi = $state('')
  let fKTanggal = $state(new Date().toISOString().slice(0,10))
  let fKResolusi = $state('')

  const KATEGORI_LABEL: Record<string, string> = {
    kualitas_barang: 'Kualitas Barang', pelayanan: 'Pelayanan',
    harga: 'Harga', pengiriman: 'Pengiriman', lainnya: 'Lainnya',
  }
  const STATUS_K_COLOR: Record<KomplainRow['status'], string> = {
    masuk: 'var(--warn)', diproses: 'var(--info)', selesai: 'var(--accent)', ditolak: 'var(--danger)',
  }

  async function muatKomplain() {
    const q = new URLSearchParams()
    if (kBulan) { q.set('dari', kBulan+'-01'); q.set('sampai', kBulan+'-31') }
    if (kStatus) q.set('status', kStatus)
    const r = await api.get<KomplainRow[]>(`/crm/komplain?${q}`)
    if (r.success) kRows = r.data
  }

  async function simpanKomplain() {
    kError = ''
    if (!fKDeskripsi.trim()) { kError = 'Deskripsi wajib'; return }
    const r = await api.post('/crm/komplain', {
      kategori: fKKategori, deskripsi: fKDeskripsi.trim(),
      nama_pelanggan: fKPelanggan.trim()||undefined, tanggal: fKTanggal,
    })
    if (!r.success) { kError = (r as any).error; return }
    kFormOpen = false; muatKomplain()
  }

  async function ubahStatusK(id: number, status: KomplainRow['status'], resolusi?: string) {
    await api.put(`/crm/komplain/${id}`, { status, resolusi })
    kDetailOpen = false; muatKomplain()
  }

  let konfirmKomplainId = $state<number | null>(null)
  let konfirmKomplainBuka = $state(false)

  function hapusK(id: number) {
    konfirmKomplainId = id
    konfirmKomplainBuka = true
  }

  async function doHapusK() {
    if (!konfirmKomplainId) return
    await api.delete(`/crm/komplain/${konfirmKomplainId}`)
    konfirmKomplainId = null
    muatKomplain()
  }

  $effect(() => { if (tab === 'komplain') { kBulan; kStatus; muatKomplain() } })
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b" style="border-color:var(--border)">
    {#each ([['permintaan','Permintaan Barang'],['komplain','Komplain']] as const) as [key, label] (key)}
      <button onclick={() => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0"
        style="{tab===key ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}">
        {label}
      </button>
    {/each}
  </div>

  <!-- ════════ PERMINTAAN BARANG ════════ -->
  {#if tab === 'permintaan'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <input type="month" bind:value={pBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
      <select bind:value={pStatus}
        class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
        <option value="">Semua Status</option>
        <option value="menunggu">Menunggu</option>
        <option value="tersedia">Tersedia</option>
        <option value="tidak_tersedia">Tidak Tersedia</option>
      </select>
      <div class="ml-auto">
        <Button onclick={() => { pError=''; fPNama=''; fPBarang=''; fPPelanggan=''; fPQty=''; fPCatatan=''; fPTanggal=new Date().toISOString().slice(0,10); pFormOpen=true }}>+ Catat Permintaan</Button>
      </div>
    </div>

    {#if pRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada permintaan tercatat.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:480px">
          <thead><tr style="background:var(--surface2)">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Barang Diminta</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Pelanggan</th>
            <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Qty</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
            <th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {#each pRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 text-xs">{row.tanggal}</td>
                <td class="px-3 py-2">
                  <div class="font-medium">{row.nama_barang}</div>
                  {#if row.catatan}<div class="text-xs" style="color:var(--text-dim)">{row.catatan}</div>{/if}
                </td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.nama_pelanggan ?? 'Umum'}</td>
                <td class="px-3 py-2 text-right text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.qty_minta ?? '—'}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-semibold" style="color:{STATUS_P_COLOR[row.status]}">{row.status.replace('_', ' ')}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  {#if row.status === 'menunggu'}
                    <button onclick={() => ubahStatusP(row.id, 'tersedia')} class="text-xs px-2 py-0.5 rounded mr-1"
                      style="background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent)">Tersedia</button>
                    <button onclick={() => ubahStatusP(row.id, 'tidak_tersedia')} class="text-xs px-2 py-0.5 rounded mr-1"
                      style="color:var(--danger)">Tidak Ada</button>
                  {/if}
                  <button onclick={() => hapusP(row.id)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--text-dim)">×</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ════════ KOMPLAIN PELANGGAN ════════ -->
  {#if tab === 'komplain'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <input type="month" bind:value={kBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
      <select bind:value={kStatus}
        class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
        <option value="">Semua Status</option>
        <option value="masuk">Masuk</option>
        <option value="diproses">Diproses</option>
        <option value="selesai">Selesai</option>
        <option value="ditolak">Ditolak</option>
      </select>
      <div class="ml-auto">
        <Button onclick={() => { kError=''; fKPelanggan=''; fKKategori='lainnya'; fKDeskripsi=''; fKTanggal=new Date().toISOString().slice(0,10); kFormOpen=true }}>+ Catat Komplain</Button>
      </div>
    </div>

    {#if kRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada komplain tercatat.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:500px">
          <thead><tr style="background:var(--surface2)">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Komplain</th>
            <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Kategori</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
            <th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {#each kRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 text-xs">{row.tanggal}</td>
                <td class="px-3 py-2">
                  <div class="text-sm">{row.deskripsi}</div>
                  {#if row.nama_pelanggan}<div class="text-xs" style="color:var(--text-dim)">{row.nama_pelanggan}</div>{/if}
                  {#if row.resolusi}<div class="text-xs mt-0.5" style="color:var(--accent)">→ {row.resolusi}</div>{/if}
                </td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{KATEGORI_LABEL[row.kategori] ?? row.kategori}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-semibold" style="color:{STATUS_K_COLOR[row.status]}">{row.status}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  {#if row.status === 'masuk' || row.status === 'diproses'}
                    <button onclick={() => { kDetailRow=row; fKResolusi=row.resolusi??''; kDetailOpen=true }}
                      class="text-xs px-2 py-0.5 rounded mr-1"
                      style="background:color-mix(in srgb,var(--info) 15%,transparent);color:var(--info)">Proses</button>
                  {/if}
                  <button onclick={() => hapusK(row.id)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--text-dim)">×</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- ── Modal: Catat Permintaan ────────────────────────────────────────────────── -->
<SlideOver bind:open={pFormOpen} title="Catat Permintaan Barang">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanPermintaan() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fp-barang" class="text-xs" style="color:var(--text-dim)">NAMA BARANG DIMINTA *</label>
      <input id="fp-barang" bind:value={fPBarang} required placeholder="mis. Mie Instan ABC Rasa Soto"
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fp-pelanggan" class="text-xs" style="color:var(--text-dim)">NAMA PELANGGAN</label>
        <input id="fp-pelanggan" bind:value={fPPelanggan} placeholder="Opsional (walk-in)"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fp-qty" class="text-xs" style="color:var(--text-dim)">JUMLAH MINTA</label>
        <input id="fp-qty" type="number" min="1" bind:value={fPQty}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fp-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fp-tgl" type="date" bind:value={fPTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fp-catatan" bind:value={fPCatatan} placeholder="Detail tambahan"
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
    </div>
    {#if pError}<p class="text-xs" style="color:var(--danger)">{pError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <Button type="button" variant="ghost" onclick={() => pFormOpen=false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Catat Komplain ──────────────────────────────────────────────────── -->
<SlideOver bind:open={kFormOpen} title="Catat Komplain Pelanggan">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanKomplain() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fk-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI *</label>
      <select id="fk-kat" bind:value={fKKategori}
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
        {#each Object.entries(KATEGORI_LABEL) as [v, lbl] (v)}
          <option value={v}>{lbl}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-desk" class="text-xs" style="color:var(--text-dim)">DESKRIPSI KOMPLAIN *</label>
      <textarea id="fk-desk" bind:value={fKDeskripsi} rows="3" required
        class="w-full rounded border px-2 py-1.5 text-sm outline-none resize-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"></textarea>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fk-pel" class="text-xs" style="color:var(--text-dim)">NAMA PELANGGAN</label>
        <input id="fk-pel" bind:value={fKPelanggan} placeholder="Opsional"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fk-tgl" type="date" bind:value={fKTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    {#if kError}<p class="text-xs" style="color:var(--danger)">{kError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <Button type="button" variant="ghost" onclick={() => kFormOpen=false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Proses Komplain ─────────────────────────────────────────────────── -->
<SlideOver bind:open={kDetailOpen} title="Proses Komplain">
  {#snippet children()}
  {#if kDetailRow}
  <div class="flex flex-col gap-3 text-sm">
    <div class="rounded p-3 text-xs" style="background:var(--surface2)">
      <div class="font-semibold mb-1" style="color:var(--text-dim)">{KATEGORI_LABEL[kDetailRow.kategori]}</div>
      <div>{kDetailRow.deskripsi}</div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="kd-res" class="text-xs" style="color:var(--text-dim)">RESOLUSI / CATATAN</label>
      <textarea id="kd-res" bind:value={fKResolusi} rows="3" placeholder="Cara penyelesaian komplain"
        class="w-full rounded border px-2 py-1.5 text-sm outline-none resize-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"></textarea>
    </div>
    <div class="flex flex-wrap gap-2 mt-1">
      <Button variant="ghost" onclick={() => ubahStatusK(kDetailRow!.id, 'diproses', fKResolusi||undefined)}>
        Tandai Diproses
      </Button>
      <Button onclick={() => ubahStatusK(kDetailRow!.id, 'selesai', fKResolusi||undefined)}>
        Selesaikan
      </Button>
      <Button variant="danger" onclick={() => ubahStatusK(kDetailRow!.id, 'ditolak', fKResolusi||undefined)}>
        Tolak
      </Button>
    </div>
  </div>
  {/if}
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={konfirmPermintaanBuka}
  judul="Hapus permintaan?"
  pesan="Data permintaan barang ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => konfirmPermintaanId = null}
  onkanan={doHapusP}
/>

<ConfirmDialog
  bind:open={konfirmKomplainBuka}
  judul="Hapus komplain?"
  pesan="Data komplain pelanggan ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => konfirmKomplainId = null}
  onkanan={doHapusK}
/>
