# Component Reference — $lib/components/

Auto-generated. Props only. No explanations.

---

## DataTable.svelte

```ts
import DataTable, { type Column } from '$lib/components/DataTable.svelte'

type Column = {
  key: string
  label: string
  width?: number
  minWidth?: number          // default 60
  sortable?: boolean         // default true
  align?: 'left' | 'right' | 'center'
  hideable?: boolean         // default true
  defaultHidden?: boolean
  priority?: 1 | 2 | 3      // 2=hide<640px, 3=hide<1024px
}

// Props
columns      Column[]
body         Snippet<[Set<string>]>     // wajib; pakai {#if !hidden.has(key)}
sortKey      $bindable('')
sortDir      $bindable<'asc'|'desc'>('asc')
maxRows      number   // default 7 — tinggi = maxRows × 40px
rowCount     number   // default 0
loading      boolean  // default false
emptyText    string   // default 'Tidak ada data.'
tableId      string   // isi → persist prefs ke localStorage
totalRows    number | undefined  // isi → aktifkan pagination server-side
pageSize     $bindable(25)
currentPage  $bindable(1)
wrapMode     $bindable(false)
toolbarEnd   Snippet | undefined
```

```svelte
<DataTable {columns} rowCount={items.length} bind:sortKey bind:sortDir>
  {#snippet body(hidden)}
    {#each items as row}
      <tr>
        <td>{row.nama}</td>
        {#if !hidden.has('harga')}<td>{row.harga}</td>{/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>

<!-- Server-side pagination -->
<DataTable {columns} {totalRows} rowCount={rows.length}
           bind:pageSize bind:currentPage bind:sortKey bind:sortDir>
  {#snippet body(hidden)}...{/snippet}
</DataTable>
```

---

## LoadingBar.svelte

No props. Reads `adaLoading` + `pesanLoading` dari `$lib/stores/ui.store`.

```svelte
import LoadingBar from '$lib/components/LoadingBar.svelte'
<LoadingBar />
```

---

## ModalWindow.svelte

```ts
open        $bindable(false)
title       string  // default ''
maxWidth    'sm'|'md'|'lg'|'xl'|'3xl'|'4xl'  // default 'md'
noPadding   boolean  // default false
fullscreen  boolean  // default false
ontutup     (() => void) | undefined  // jika diisi, open TIDAK auto false
children    Snippet
```

```svelte
<ModalWindow bind:open={buka} title="Judul">
  <p>Konten</p>
</ModalWindow>

<!-- ontutup override -->
<ModalWindow bind:open={buka} ontutup={() => { simpan(); buka = false }}>
```

---

## Panduan.svelte

```ts
title     string
subtitle  string  // default ''
children  Snippet
```

```svelte
<Panduan title="Panduan Kasir" subtitle="v2">
  <p>Isi panduan...</p>
</Panduan>
```

Renders floating `?` button. Klik buka modal.

---

## SlideOver.svelte

```ts
open      $bindable(false)
title     string  // default ''
children  Snippet
```

```svelte
<SlideOver bind:open={buka} title="Detail">
  <p>Konten</p>
</SlideOver>
```

Desktop: slide dari kanan, resizable (drag tepi kiri).
Mobile: sheet dari bawah, resizable (drag handle atas), dismiss drag bawah ≥80px.
Size persisted: `localStorage` keys `so_width` & `so_height_vh`.

---

## data/EmptyState.svelte

```ts
pesan  string   // default 'Tidak ada data'
ikon   string   // default '∅'
aksi   Snippet | undefined
```

```svelte
<EmptyState pesan="Belum ada barang" ikon="📦">
  {#snippet aksi()}<button>Tambah</button>{/snippet}
</EmptyState>
```

---

## data/FotoThumb.svelte

```ts
src   string | null  // default null
nama  string         // default ''
size  number         // default 40 (px)
```

```svelte
<FotoThumb src={item.foto_url} nama={item.nama} size={48} />
```

Fallback ke inisial jika src null atau gambar error.

---

## data/SearchInput.svelte

```ts
value        $bindable('')
placeholder  string   // default '> cari...'
loading      boolean  // default false
autofocus    boolean  // default true
debounce     number   // default 150 (ms)
onsearch     ((q: string) => void) | undefined
onescape     (() => void) | undefined
onenter      ((q: string) => void) | undefined
onarrowdown  (() => void) | undefined
onarrowup    (() => void) | undefined
```

```svelte
<SearchInput bind:value={q} onsearch={(q) => muat(q)} onescape={() => q = ''} />
```

---

## form/DateRangePicker.svelte

Native `<input type=date>`. Format nilai: `YYYY-MM-DD`.

```ts
dari     $bindable('')
sampai   $bindable('')
label    string | null  // default null
onchange ((range: { dari: string; sampai: string }) => void) | undefined
```

```svelte
<DateRangePicker bind:dari bind:sampai onchange={({dari, sampai}) => muat(dari, sampai)} />
```

---

## form/InputQty.svelte

```ts
value     $bindable(1)
min       number   // default 0
max       number   // default 9999
disabled  boolean  // default false
onchange  ((v: number) => void) | undefined
```

```svelte
<InputQty bind:value={item.qty} min={1} onchange={(v) => hitung(v)} />
```

---

## form/InputRupiah.svelte

```ts
value       $bindable(0)
label       string | null  // default null
placeholder string         // default '0'
disabled    boolean        // default false
autofocus   boolean        // default false
min         number         // default 0
onchange    ((v: number) => void) | undefined
onblur      (() => void) | undefined
```

```svelte
<InputRupiah bind:value={harga} label="Harga Jual" />
```

Auto-format ribuan (id-ID). Value internal: integer.

---

## form/SelectSatuan.svelte

```ts
type Satuan = { id: number; nama: string; singkatan?: string | null }

value     $bindable<number | null>(null)
opsi      Satuan[]     // default []
disabled  boolean      // default false
label     string | null  // default null
onchange  ((id: number) => void) | undefined
```

```svelte
<SelectSatuan bind:value={satuanId} opsi={satuanList} label="Satuan" />
```

---

## layout/PageHeader.svelte

```ts
judul  string
sub    string | null  // default null
aksi   Snippet | undefined
```

```svelte
<PageHeader judul="Kasir" sub="Transaksi hari ini">
  {#snippet aksi()}<Button>+ Baru</Button>{/snippet}
</PageHeader>
```

---

## layout/SectionCard.svelte

```ts
judul     string | null  // default null
aksi      Snippet | undefined
children  Snippet
```

```svelte
<SectionCard judul="Ringkasan">
  <p>Konten</p>
</SectionCard>
```

---

## layout/TwoPanel.svelte

```ts
rasio  string   // default '1fr 1fr' — grid-template-columns di ≥768px
kiri   Snippet
kanan  Snippet
```

```svelte
<TwoPanel rasio="2fr 1fr">
  {#snippet kiri()}..{/snippet}
  {#snippet kanan()}..{/snippet}
</TwoPanel>
```

Di mobile: bertumpuk vertikal.

---

## ui/Badge.svelte

```ts
tipe  'sukses'|'warn'|'danger'|'info'|'netral'|'lunas'|'hutang'|'void'|'aman'|'hampir'|'habis'|string
      // default 'netral'
children  Snippet
```

```svelte
<Badge tipe="lunas">Lunas</Badge>
<Badge tipe="hutang">Hutang</Badge>
<Badge tipe="habis">Habis</Badge>
```

Warna map: sukses/lunas/aman→accent, warn/hampir/hutang→warn, danger/habis/void→danger, info→info, netral/unknown→text-dim.

---

## ui/Button.svelte

```ts
variant   'primary'|'danger'|'ghost'|'dim'  // default 'primary'
size      'xs'|'sm'|'md'|'lg'               // default 'md'
disabled  boolean    // default false
loading   boolean    // default false
shortcut  string | null  // default null — render <kbd>
type      'button'|'submit'  // default 'button'
onclick   ((e: MouseEvent) => void) | undefined
children  Snippet
```

```svelte
<Button variant="ghost" size="sm" onclick={batal}>Batal</Button>
<Button variant="primary" loading={menyimpan} shortcut="⌘S">Simpan</Button>
```

---

## ui/Toggle.svelte

```ts
aktif        $bindable(false)
onchange     ((v: boolean) => void) | undefined
labelAktif   string  // default 'Sembunyikan Non-Aktif'
labelNonAktif string // default 'Tampilkan Non-Aktif'
```

```svelte
<Toggle bind:aktif={tampilNonAktif} onchange={() => muat(query)} />
```

Tombol toggle show/hide dengan visual state: aktif → border warn + surface2, nonaktif → border dim.

---

## ui/ConfirmDialog.svelte

```ts
open        $bindable(false)
judul       string   // default 'Konfirmasi'
pesan       string   // default '' — mendukung \n (pre-wrap)
labelKiri   string   // default 'Batal'
labelKanan  string   // default 'OK'
warnaKiri   string | undefined  // CSS color, default var(--accent)
warnaKanan  string | undefined  // CSS color, default var(--accent)
cancelable  boolean  // default true
onkiri      (() => void) | undefined
onkanan     (() => void) | undefined
```

```svelte
<ConfirmDialog
  bind:open={konfirmBuka}
  judul="Hapus data?"
  pesan="Tindakan ini tidak bisa dibatalkan."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkanan={doHapus}
/>
```

Keyboard: Escape/Enter/ArrowLeft/ArrowRight. Fokus awal di tombol kanan.

---

## ui/DatePicker.svelte

Picker berbasis bits-ui Calendar + Popover. Format nilai: `YYYY-MM-DD`.

```ts
value        $bindable('')
label        string | null  // default null
placeholder  string         // default 'Pilih tanggal'
disabled     boolean        // default false
```

```svelte
<DatePicker bind:value={tgl} label="Tanggal" />
```

---

## ui/DateRangePicker.svelte

Picker berbasis bits-ui RangeCalendar + Popover. Format nilai: `YYYY-MM-DD`.

```ts
from         $bindable('')
to           $bindable('')
label        string | null  // default null
placeholder  string         // default 'Pilih rentang tanggal'
disabled     boolean        // default false
```

```svelte
<DateRangePicker bind:from bind:to label="Periode" />
```

---

## ui/Input.svelte

```ts
value        $bindable('')
label        string | null  // default null
placeholder  string         // default ''
type         'text'|'password'|'number'|'email'|'tel'  // default 'text'
disabled     boolean        // default false
autofocus    boolean        // default false
oninput      ((v: string) => void) | undefined
onblur       (() => void) | undefined
onenter      ((v: string) => void) | undefined
```

```svelte
<Input bind:value={nama} label="Nama" onenter={(v) => simpan(v)} />
```

---

## ui/Modal.svelte

Alternatif lebih sederhana dari ModalWindow. Selalu centered.

```ts
judul     string
lebar     'sm'|'md'|'lg'  // default 'md'
bisaTutup boolean          // default true
ontutup   (() => void) | undefined
children  Snippet
footer    Snippet | undefined
```

```svelte
<Modal judul="Edit Barang" ontutup={() => buka = false}>
  <p>Form di sini.</p>
  {#snippet footer()}
    <Button onclick={() => buka = false}>Tutup</Button>
  {/snippet}
</Modal>
```

---

## ui/Select.svelte

```ts
type Option = { value: string | number; label: string }

value        $bindable<string | number | null>(null)
options      Option[]     // default []
label        string | null  // default null
placeholder  string | null  // default null
disabled     boolean        // default false
onchange     ((v: string | number) => void) | undefined
```

```svelte
<Select bind:value={metode} options={[{value:'tunai',label:'Tunai'}]} label="Metode" />
```

---

## ui/Skeleton.svelte

```ts
w   string  // default '100%'
h   string  // default '0.875rem'
br  string  // default 'rounded' — Tailwind class
```

```svelte
<Skeleton w="60%" h="1rem" />
<Skeleton w="40px" h="40px" br="rounded-full" />
```

---

## ui/Spinner.svelte

```ts
size   number  // default 20 (px)
warna  string  // default 'var(--text-dim)'
```

```svelte
<Spinner size={16} warna="var(--accent)" />
```

---

## ui/TabBar.svelte

```ts
type Tab = { key: string; label: string }

tabs        Tab[]
active      string
storageKey  string      // namespace → backend key "tab_{storageKey}"
onchange    ((key: string) => void) | undefined
```

```svelte
import { page } from '$app/state'
import { goto } from '$app/navigation'

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'detail',    label: 'Detail' },
]
let tab = $derived(page.url.searchParams.get('tab') ?? 'ringkasan')

<TabBar
  tabs={TABS}
  active={tab}
  storageKey="nama-modul"
  onchange={(key) => goto(`?tab=${key}`, { replaceState: true })}
/>
```

Fitur: drag & drop reorder, klik kanan context menu, favorit (★), reset, sync backend
`GET/PUT /pengaturan/preferensi/tab_{storageKey}`.

---

## ui/Toast.svelte

```ts
import type { ToastTipe } from '$lib/types/error.types'
// ToastTipe = 'sukses' | 'error' | 'warn' | 'info'

tipe    ToastTipe  // default 'info'
pesan   string
onhapus (() => void) | undefined
```

Dirender oleh `ToastContainer`. Jarang dipakai langsung.
Gunakan `toast.sukses(pesan)` / `toast.error(pesan)` dari `$lib/stores/ui.store`.

---

## Toast store API

```ts
import { toast } from '$lib/stores/ui.store'

toast.sukses('Disimpan')
toast.error('Gagal menyimpan')
toast.warn('Stok hampir habis')
toast.info('Data diperbarui')
```
