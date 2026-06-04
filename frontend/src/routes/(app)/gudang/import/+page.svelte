<svelte:head><title>Import Barang — Stokasir</title></svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { api } from '$lib/utils/api.js'
  import { toast } from '$lib/stores/ui.store.js'
  import Papa from 'papaparse'

  // ── Types ──────────────────────────────────────────────────────────────
  type ParsedRow = Record<string, string>

  type FieldKey =
    | 'nama_barang' | 'kode_barang' | 'kategori_nama' | 'satuan_nama'
    | 'harga_beli' | 'harga_jual_eceran' | 'harga_jual_grosir'
    | 'stok_minimum' | 'stok_sekarang' | 'lokasi_rak' | '__abaikan'

  type MappedRow = {
    index: number
    nama_barang: string
    kode_barang: string
    kategori_nama: string
    satuan_nama: string
    harga_beli: number
    harga_jual_eceran: number
    harga_jual_grosir: number
    stok_minimum: number
    stok_sekarang: number
    lokasi_rak: string
    errors: string[]
    warnings: string[]
  }

  type ImportResult = {
    berhasil: number
    dilewati: number
    gagal: { index: number; nama: string; alasan: string }[]
    kategori_dibuat: string[]
    satuan_dibuat: string[]
  }

  // ── Field definitions ──────────────────────────────────────────────────
  const FIELDS: { key: FieldKey; label: string; required: boolean; desc: string }[] = [
    { key: 'nama_barang',       label: 'Nama Barang',       required: true,  desc: 'Nama lengkap produk' },
    { key: 'kode_barang',       label: 'Kode Barang',       required: false, desc: 'Otomatis jika kosong (BRG-0001)' },
    { key: 'kategori_nama',     label: 'Kategori',          required: false, desc: 'Nama kategori (teks)' },
    { key: 'satuan_nama',       label: 'Satuan',            required: false, desc: 'Nama satuan (pcs, kg, dll)' },
    { key: 'harga_beli',        label: 'Harga Beli',        required: false, desc: 'Angka tanpa titik/koma' },
    { key: 'harga_jual_eceran', label: 'Harga Jual Eceran', required: false, desc: 'Angka tanpa titik/koma' },
    { key: 'harga_jual_grosir', label: 'Harga Jual Grosir', required: false, desc: 'Angka tanpa titik/koma' },
    { key: 'stok_minimum',      label: 'Stok Minimum',      required: false, desc: 'Angka desimal' },
    { key: 'stok_sekarang',     label: 'Stok Sekarang',     required: false, desc: 'Angka desimal' },
    { key: 'lokasi_rak',        label: 'Lokasi Rak',        required: false, desc: 'Misal: A1, B2' },
    { key: '__abaikan',         label: '— Abaikan kolom ini —', required: false, desc: '' },
  ]

  // ── Step state ─────────────────────────────────────────────────────────
  let step = $state(1)

  // Step 1
  let csvHeaders = $state<string[]>([])
  let csvRows    = $state<ParsedRow[]>([])
  let fileName   = $state('')
  let dragOver   = $state(false)
  let parseError = $state('')

  // Step 2
  let columnMap = $state<Record<string, FieldKey>>({})

  // Step 3
  let mappedRows    = $state<MappedRow[]>([])
  let valFilter     = $state<'semua'|'valid'|'error'|'warning'>('semua')

  // Step 4
  let duplikat        = $state<'skip'|'update'|'generate'>('skip')
  let kategoriAuto    = $state(true)
  let satuanAuto      = $state(true)

  // Step 5
  let importing = $state(false)
  let result    = $state<ImportResult | null>(null)

  // ── Template CSV ───────────────────────────────────────────────────────
  const TEMPLATE_COLS = ['nama_barang','kode_barang','kategori_nama','satuan_nama',
    'harga_beli','harga_jual_eceran','harga_jual_grosir','stok_minimum','stok_sekarang','lokasi_rak']
  const TEMPLATE_EXAMPLE = [
    ['Beras Premium 5kg','BRG-0001','Beras','karung','50000','65000','62000','5','20','A1'],
    ['Minyak Goreng 1L','','Minyak','botol','18000','22000','21000','10','50','B3'],
    ['Gula Pasir 1kg','','Gula','kg','13000','16000','15500','10','30','A2'],
  ]
  function downloadTemplate() {
    const header = TEMPLATE_COLS.join(',')
    const rows = TEMPLATE_EXAMPLE.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-barang.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Step 1: File parsing ───────────────────────────────────────────────
  function parseFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      parseError = 'Pilih file dengan ekstensi .csv'
      return
    }
    fileName = file.name
    parseError = ''
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(res) {
        if (!res.data.length) { parseError = 'File CSV kosong'; return }
        csvHeaders = res.meta.fields ?? []
        csvRows = res.data
        // Auto-map jika header cocok
        const autoMap: Record<string, FieldKey> = {}
        for (const h of csvHeaders) {
          const match = FIELDS.find(f => f.key !== '__abaikan' &&
            (f.key === h.toLowerCase().replace(/\s+/g,'_') || f.label.toLowerCase() === h.toLowerCase()))
          autoMap[h] = match ? match.key : '__abaikan'
        }
        columnMap = autoMap
        step = 2
      },
      error(err) { parseError = `Gagal membaca file: ${err.message}` },
    })
  }

  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (f) parseFile(f)
  }
  function onDrop(e: DragEvent) {
    e.preventDefault(); dragOver = false
    const f = e.dataTransfer?.files[0]
    if (f) parseFile(f)
  }

  // ── Step 2 → 3: Validate all rows ─────────────────────────────────────
  function parseNum(v: string | undefined): number {
    if (!v) return 0
    return parseFloat(v.replace(/[^\d.,-]/g,'').replace(',','.')) || 0
  }

  function buildMappedRows() {
    // Invert map: field → csv column
    const inv: Partial<Record<FieldKey, string>> = {}
    for (const [col, field] of Object.entries(columnMap)) {
      if (field !== '__abaikan') inv[field] = col
    }

    mappedRows = csvRows.map((raw, i): MappedRow => {
      const get = (k: FieldKey) => (inv[k] ? (raw[inv[k]!] ?? '') : '').trim()
      const errors: string[] = []
      const warnings: string[] = []

      const nama = get('nama_barang')
      if (!nama) errors.push('nama_barang kosong')

      const hargaJualEceran = parseNum(get('harga_jual_eceran'))
      if (get('harga_jual_eceran') && hargaJualEceran < 0) errors.push('Harga jual eceran negatif')
      const hargaJualGrosir = parseNum(get('harga_jual_grosir'))
      if (get('harga_jual_grosir') && hargaJualGrosir < 0) errors.push('Harga jual grosir negatif')

      if (get('kategori_nama')) warnings.push(`Kategori "${get('kategori_nama')}" akan dicek/dibuat`)
      if (get('satuan_nama')) warnings.push(`Satuan "${get('satuan_nama')}" akan dicek/dibuat`)

      return {
        index: i + 1,
        nama_barang:        nama,
        kode_barang:        get('kode_barang'),
        kategori_nama:      get('kategori_nama'),
        satuan_nama:        get('satuan_nama'),
        harga_beli:         parseNum(get('harga_beli')),
        harga_jual_eceran:  hargaJualEceran,
        harga_jual_grosir:  hargaJualGrosir,
        stok_minimum:       parseNum(get('stok_minimum')),
        stok_sekarang:      parseNum(get('stok_sekarang')),
        lokasi_rak:         get('lokasi_rak'),
        errors,
        warnings,
      }
    })
    step = 3
  }

  const totalValid   = $derived(mappedRows.filter(r => r.errors.length === 0).length)
  const totalError   = $derived(mappedRows.filter(r => r.errors.length > 0).length)
  const totalWarning = $derived(mappedRows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length)

  const filteredRows = $derived(() => {
    if (valFilter === 'error')   return mappedRows.filter(r => r.errors.length > 0)
    if (valFilter === 'warning') return mappedRows.filter(r => r.errors.length === 0 && r.warnings.length > 0)
    if (valFilter === 'valid')   return mappedRows.filter(r => r.errors.length === 0 && r.warnings.length === 0)
    return mappedRows
  })

  // ── Step 5: Execute import ─────────────────────────────────────────────
  async function jalankanImport() {
    importing = true
    const validRows = mappedRows.filter(r => r.errors.length === 0)
    const r = await api.post<ImportResult>('/barang/import-csv', {
      rows: validRows,
      settings: { duplikat, kategori_auto: kategoriAuto, satuan_auto: satuanAuto },
    })
    importing = false
    if (r.success) {
      result = r.data
      step = 5
    } else {
      toast.error('Import gagal: ' + (r.error ?? 'Kesalahan server'))
    }
  }

  // ── Error CSV download ─────────────────────────────────────────────────
  function downloadErrorCsv() {
    if (!result?.gagal.length) return
    const header = 'Baris,Nama,Alasan'
    const rows = result.gagal.map(g => `${g.index},"${g.nama}","${g.alasan}"`).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'import-error.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    step = 1; csvHeaders = []; csvRows = []; fileName = ''; parseError = ''
    columnMap = {}; mappedRows = []; result = null; importing = false
  }

  const requiredMapped = $derived(Object.values(columnMap).includes('nama_barang'))
</script>

<!-- ── Layout ── -->
<div class="p-3 md:p-6 max-w-4xl mx-auto space-y-5">

  <!-- Header -->
  <div class="flex items-center gap-3">
    <a href="/gudang?tab=barang"
      class="text-sm px-2 py-1 rounded border"
      style="border-color:var(--border);color:var(--text-dim)">← Kembali</a>
    <h1 class="text-base md:text-lg font-bold" style="color:var(--text)">Import Barang dari CSV</h1>
  </div>

  <!-- Step Indicator -->
  <div class="flex items-center gap-1">
    {#each ([
      [1, 'Upload'],
      [2, 'Peta Kolom'],
      [3, 'Validasi'],
      [4, 'Pengaturan'],
      [5, 'Hasil'],
    ] as [number, string][]) as [n, label] (n)}
      <div class="flex items-center gap-1">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors"
          style={step === n
            ? 'background:var(--accent);color:#fff'
            : step > n
              ? 'background:color-mix(in srgb,var(--accent) 30%,var(--surface2));color:var(--accent)'
              : 'background:var(--surface2);color:var(--text-dim)'}>
          {step > n ? '✓' : n}
        </div>
        <span class="text-xs hidden sm:inline whitespace-nowrap"
          style="color:{step === n ? 'var(--text)' : 'var(--text-dim)'}">{label}</span>
      </div>
      {#if n < 5}
        <div class="flex-1 h-px mx-1" style="background:var(--border)"></div>
      {/if}
    {/each}
  </div>

  <!-- ─────────────────────────────────────────────────────── -->
  <!-- STEP 1: Upload -->
  <!-- ─────────────────────────────────────────────────────── -->
  {#if step === 1}
    <div class="space-y-4">
      <!-- Template download -->
      <div class="flex items-center justify-between p-3 rounded border"
        style="background:var(--surface);border-color:var(--border)">
        <div>
          <p class="text-sm font-medium" style="color:var(--text)">Belum punya template?</p>
          <p class="text-xs mt-0.5" style="color:var(--text-dim)">Download file contoh CSV yang sudah terformat</p>
        </div>
        <button onclick={downloadTemplate}
          class="px-3 py-1.5 rounded border text-sm"
          style="border-color:var(--border);color:var(--accent);background:var(--surface2)">
          ↓ Template CSV
        </button>
      </div>

      <!-- Drop zone -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        ondragover={(e) => { e.preventDefault(); dragOver = true }}
        ondragleave={() => dragOver = false}
        ondrop={onDrop}
        class="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
        style="border-color:{dragOver ? 'var(--accent)' : 'var(--border)'};background:{dragOver ? 'color-mix(in srgb,var(--accent) 5%,var(--surface))' : 'var(--surface)'}">
        <p class="text-3xl mb-3">📄</p>
        <p class="text-sm font-medium" style="color:var(--text)">Seret file CSV ke sini</p>
        <p class="text-xs mt-1 mb-4" style="color:var(--text-dim)">atau</p>
        <label class="cursor-pointer px-4 py-2 rounded text-sm font-medium text-white"
          style="background:var(--accent)">
          Pilih File
          <input type="file" accept=".csv" class="hidden" onchange={onFileInput} />
        </label>
        {#if fileName}
          <p class="text-xs mt-3 font-mono" style="color:var(--accent)">📎 {fileName} — {csvRows.length} baris terdeteksi</p>
        {/if}
      </div>

      {#if parseError}
        <div class="p-3 rounded border text-sm" style="border-color:var(--danger);color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,transparent)">
          ⚠ {parseError}
        </div>
      {/if}
    </div>

  <!-- ─────────────────────────────────────────────────────── -->
  <!-- STEP 2: Peta Kolom -->
  <!-- ─────────────────────────────────────────────────────── -->
  {:else if step === 2}
    <div class="space-y-4">
      <!-- Preview tabel 5 baris pertama -->
      <div class="rounded border" style="border-color:var(--border)">
        <p class="text-xs px-3 py-2 font-semibold border-b" style="color:var(--text-dim);border-color:var(--border)">
          Preview 5 baris pertama
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                {#each csvHeaders as h (h)}
                  <th class="px-3 py-2 text-left font-medium whitespace-nowrap" style="color:var(--text-dim)">{h}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each csvRows.slice(0, 5) as row, i (i)}
                <tr style="border-bottom:1px solid var(--border)">
                  {#each csvHeaders as h (h)}
                    <td class="px-3 py-1.5 whitespace-nowrap max-w-32 truncate" style="color:var(--text)">{row[h] ?? ''}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mapping -->
      <div class="rounded border" style="border-color:var(--border);background:var(--surface)">
        <p class="text-xs px-3 py-2 font-semibold border-b" style="color:var(--text-dim);border-color:var(--border)">
          Peta kolom CSV ke field barang
        </p>
        <div class="divide-y" style="--tw-divide-opacity:1">
          {#each csvHeaders as h (h)}
            <div class="flex items-center gap-3 px-3 py-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" style="color:var(--text)">{h}</p>
                <p class="text-xs truncate" style="color:var(--text-dim)">
                  contoh: {csvRows[0]?.[h] ?? '—'}
                </p>
              </div>
              <span class="text-xs" style="color:var(--text-dim)">→</span>
              <select bind:value={columnMap[h]}
                class="border rounded px-2 py-1 text-xs"
                style="background:var(--surface2);border-color:var(--border);color:var(--text);min-width:160px">
                {#each FIELDS as f (f.key)}
                  <option value={f.key}>{f.label}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
      </div>

      <!-- Required fields status -->
      <div class="flex flex-wrap gap-2">
        {#each FIELDS.filter(f => f.required) as f (f.key)}
          {@const mapped = Object.values(columnMap).includes(f.key)}
          <span class="text-xs px-2 py-0.5 rounded-full border"
            style={mapped
              ? 'border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)'
              : 'border-color:var(--danger);color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,transparent)'}>
            {mapped ? '✓' : '✗'} {f.label}
          </span>
        {/each}
      </div>

      <div class="flex gap-2">
        <button onclick={() => step = 1}
          class="px-4 py-2 rounded text-sm border"
          style="border-color:var(--border);color:var(--text)">← Kembali</button>
        <button onclick={buildMappedRows} disabled={!requiredMapped}
          class="px-4 py-2 rounded text-sm font-medium text-white"
          style="background:var(--accent);opacity:{requiredMapped ? 1 : 0.4}">
          Validasi Data →
        </button>
      </div>
    </div>

  <!-- ─────────────────────────────────────────────────────── -->
  <!-- STEP 3: Validasi -->
  <!-- ─────────────────────────────────────────────────────── -->
  {:else if step === 3}
    <div class="space-y-4">
      <!-- Summary chips -->
      <div class="flex flex-wrap gap-2">
        {#each [
          ['semua', `Semua (${mappedRows.length})`, 'var(--text-dim)', 'var(--surface2)'],
          ['valid', `Valid (${totalValid - totalWarning})`, '#059669', '#d1fae5'],
          ['warning', `Peringatan (${totalWarning})`, '#d97706', '#fef3c7'],
          ['error', `Error (${totalError})`, '#dc2626', '#fee2e2'],
        ] as [k, label, color, bg] (k)}
          <button onclick={() => valFilter = k as typeof valFilter}
            class="text-xs px-3 py-1 rounded-full border font-medium transition-opacity"
            style="color:{color};background:{valFilter === k ? bg : 'var(--surface2)'};border-color:{color};opacity:{valFilter === k ? 1 : 0.7}">
            {label}
          </button>
        {/each}
      </div>

      <!-- Tabel validasi -->
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-xs">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">#</th>
              <th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Nama Barang</th>
              <th class="px-3 py-2 text-left font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Kode</th>
              <th class="px-3 py-2 text-left font-semibold hidden md:table-cell" style="color:var(--text-dim)">Kategori</th>
              <th class="px-3 py-2 text-left font-semibold hidden md:table-cell" style="color:var(--text-dim)">Satuan</th>
              <th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Harga Jual</th>
              <th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredRows() as row (row.index)}
              <tr class="border-b"
                style="border-color:var(--border);background:{row.errors.length ? 'color-mix(in srgb,var(--danger) 6%,transparent)' : row.warnings.length ? 'color-mix(in srgb,var(--warn) 4%,transparent)' : 'transparent'}">
                <td class="px-3 py-2" style="color:var(--text-dim)">{row.index}</td>
                <td class="px-3 py-2 font-medium" style="color:var(--text)">
                  {#if row.nama_barang}{row.nama_barang}{:else}<em style="color:var(--danger)">kosong</em>{/if}
                </td>
                <td class="px-3 py-2 hidden sm:table-cell font-mono" style="color:var(--text-dim)">
                  {#if row.kode_barang}{row.kode_barang}{:else}<em style="color:var(--text-dim)">auto</em>{/if}
                </td>
                <td class="px-3 py-2 hidden md:table-cell" style="color:var(--text-dim)">{row.kategori_nama || '—'}</td>
                <td class="px-3 py-2 hidden md:table-cell" style="color:var(--text-dim)">{row.satuan_nama || '—'}</td>
                <td class="px-3 py-2" style="color:var(--text)">
                  {row.harga_jual_eceran ? row.harga_jual_eceran.toLocaleString('id-ID') : '—'}
                </td>
                <td class="px-3 py-2">
                  {#if row.errors.length}
                    <span title={row.errors.join('; ')} class="text-xs px-1.5 py-0.5 rounded cursor-help"
                      style="background:#fee2e2;color:#dc2626">✗ Error</span>
                  {:else if row.warnings.length}
                    <span title={row.warnings.join('; ')} class="text-xs px-1.5 py-0.5 rounded cursor-help"
                      style="background:#fef3c7;color:#d97706">⚠ Peringatan</span>
                  {:else}
                    <span class="text-xs px-1.5 py-0.5 rounded"
                      style="background:#d1fae5;color:#059669">✓ Valid</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="flex gap-2">
        <button onclick={() => step = 2}
          class="px-4 py-2 rounded text-sm border"
          style="border-color:var(--border);color:var(--text)">← Kembali</button>
        <button onclick={() => step = 4} disabled={totalValid === 0}
          class="px-4 py-2 rounded text-sm font-medium text-white"
          style="background:var(--accent);opacity:{totalValid > 0 ? 1 : 0.4}">
          Lanjut ({totalValid} baris valid) →
        </button>
      </div>
    </div>

  <!-- ─────────────────────────────────────────────────────── -->
  <!-- STEP 4: Pengaturan Import -->
  <!-- ─────────────────────────────────────────────────────── -->
  {:else if step === 4}
    <div class="space-y-4">
      <!-- Duplikat kode -->
      <div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
        <p class="text-sm font-semibold" style="color:var(--text)">Jika kode barang sudah ada</p>
        {#each [
          ['skip',     'Lewati baris ini (biarkan data lama)'],
          ['update',   'Update data yang ada dengan data baru'],
          ['generate', 'Buat kode baru otomatis (BRG-xxxx)'],
        ] as [val, label] (val)}
          <label class="flex items-start gap-2 cursor-pointer">
            <input type="radio" bind:group={duplikat} value={val} class="mt-0.5 accent-green-500" />
            <span class="text-sm" style="color:var(--text)">{label}</span>
          </label>
        {/each}
      </div>

      <!-- Auto-create -->
      <div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
        <p class="text-sm font-semibold" style="color:var(--text)">Data tidak dikenal</p>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={kategoriAuto} class="accent-green-500" />
          <span class="text-sm" style="color:var(--text)">Buat <strong>kategori</strong> baru otomatis jika belum ada</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={satuanAuto} class="accent-green-500" />
          <span class="text-sm" style="color:var(--text)">Buat <strong>satuan</strong> baru otomatis jika belum ada</span>
        </label>
      </div>

      <!-- Summary -->
      <div class="rounded border p-4" style="background:var(--surface2);border-color:var(--border)">
        <p class="text-sm" style="color:var(--text)">
          Akan mengimport <strong style="color:var(--accent)">{totalValid} barang</strong>
          {#if totalError > 0}, melewati <strong style="color:var(--danger)">{totalError} baris error</strong>{/if}
        </p>
      </div>

      <div class="flex gap-2">
        <button onclick={() => step = 3}
          class="px-4 py-2 rounded text-sm border"
          style="border-color:var(--border);color:var(--text)">← Kembali</button>
        <button onclick={jalankanImport}
          class="px-4 py-2 rounded text-sm font-medium text-white"
          style="background:var(--accent)">
          Mulai Import →
        </button>
      </div>
    </div>

  <!-- ─────────────────────────────────────────────────────── -->
  <!-- STEP 5: Hasil -->
  <!-- ─────────────────────────────────────────────────────── -->
  {:else if step === 5}
    <div class="space-y-4">
      {#if importing}
        <div class="space-y-3 text-center py-12">
          <div class="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto"
            style="border-color:var(--accent);border-top-color:transparent"></div>
          <p class="text-sm" style="color:var(--text-dim)">Sedang mengimport data...</p>
        </div>
      {:else if result}
        <!-- Result cards -->
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-lg border p-4 text-center" style="background:var(--surface);border-color:var(--border)">
            <p class="text-3xl font-bold" style="color:#059669">{result.berhasil}</p>
            <p class="text-xs mt-1" style="color:var(--text-dim)">Berhasil</p>
          </div>
          <div class="rounded-lg border p-4 text-center" style="background:var(--surface);border-color:var(--border)">
            <p class="text-3xl font-bold" style="color:var(--text-dim)">{result.dilewati}</p>
            <p class="text-xs mt-1" style="color:var(--text-dim)">Di-skip</p>
          </div>
          <div class="rounded-lg border p-4 text-center" style="background:var(--surface);border-color:var(--border)">
            <p class="text-3xl font-bold" style="color:{result.gagal.length ? '#dc2626' : 'var(--text-dim)'}">{result.gagal.length}</p>
            <p class="text-xs mt-1" style="color:var(--text-dim)">Gagal</p>
          </div>
        </div>

        {#if result.kategori_dibuat.length || result.satuan_dibuat.length}
          <div class="p-3 rounded border text-xs" style="background:var(--surface);border-color:var(--border)">
            {#if result.kategori_dibuat.length}
              <p style="color:var(--text-dim)">Kategori dibuat: <span style="color:var(--text)">{result.kategori_dibuat.join(', ')}</span></p>
            {/if}
            {#if result.satuan_dibuat.length}
              <p class="mt-1" style="color:var(--text-dim)">Satuan dibuat: <span style="color:var(--text)">{result.satuan_dibuat.join(', ')}</span></p>
            {/if}
          </div>
        {/if}

        {#if result.gagal.length}
          <div class="rounded border" style="border-color:var(--border)">
            <div class="flex items-center justify-between px-3 py-2 border-b" style="border-color:var(--border)">
              <p class="text-xs font-semibold" style="color:var(--danger)">Baris Gagal ({result.gagal.length})</p>
              <button onclick={downloadErrorCsv}
                class="text-xs px-2 py-0.5 rounded border"
                style="border-color:var(--border);color:var(--text-dim)">↓ Download CSV</button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-xs">
                <thead>
                  <tr style="border-bottom:1px solid var(--border)">
                    <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Baris</th>
                    <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Nama</th>
                    <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {#each result.gagal as g (g.index)}
                    <tr style="border-bottom:1px solid var(--border)">
                      <td class="px-3 py-2" style="color:var(--text-dim)">{g.index}</td>
                      <td class="px-3 py-2" style="color:var(--text)">{g.nama}</td>
                      <td class="px-3 py-2" style="color:var(--danger)">{g.alasan}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-2">
          <a href="/gudang?tab=barang"
            class="px-4 py-2 rounded text-sm font-medium text-white"
            style="background:var(--accent)">Lihat Master Barang</a>
          <button onclick={reset}
            class="px-4 py-2 rounded text-sm border"
            style="border-color:var(--border);color:var(--text)">Import Lagi</button>
          <a href="/gudang"
            class="px-4 py-2 rounded text-sm border"
            style="border-color:var(--border);color:var(--text-dim)">Selesai</a>
        </div>
      {/if}
    </div>
  {/if}
</div>
