# Pola Wajib Dijaga

```
1. Route order Hono: static (/tukar, /aktif) HARUS sebelum dynamic (/:id)
2. Multi-tabel → withTransaction() (contoh: bayar gaji → penggajian+kasbon+jurnal_kas)
3. api.ts try/catch: tidak perlu try/catch di setiap caller — sudah di api.ts
4. Load data: onMount ATAU $effect — jangan keduanya untuk data yang sama
5. Permission guard di setiap halaman sensitif:
   $effect(() => { if ($user && !['pemilik','manajer'].includes($user.role)) goto('/kasir') })
6. Tabel baru → spread ...tenantField + ...auditFields + ...timestamps (lihat database.md)
7. Aksi penting di route → emit event ke bus (sebelum/sesudah sesuai kebutuhan)
8. Modul baru yang butuh approval → pakai mintaApproval() dari utils/approval.ts
9. Semua route butuh tenant filter → import tenantMiddleware, pakai user.tenant_id / user.cabang_id
10. requirePermission('*') dilarang — selalu pakai string semantik (pengaturan.kelola, laporan.lihat, dll.)
```

## DatePicker (shadcn Calendar)

Pakai `DatePicker.svelte` — wrapper siap pakai di `$lib/components/ui/DatePicker.svelte`.
Value selalu ISO string `"YYYY-MM-DD"` atau `""`. Tidak perlu tahu `DateValue` / bits-ui.

```svelte
<DatePicker
  label="BERLAKU MULAI"
  bind:value={fb.berlaku_mulai}
  placeholder="Pilih tanggal"
  disabled={false}
/>
```

**Range picker** — dua tanggal (from/to):
```svelte
<DateRangePicker
  label="PERIODE"
  bind:from={fb.berlaku_mulai}
  bind:to={fb.berlaku_sampai}
  placeholder="Pilih rentang tanggal"
/>
```
Value `from` dan `to` masing-masing ISO string `"YYYY-MM-DD"` atau `""`.
Popover tutup otomatis setelah tanggal akhir dipilih.

**Gotcha:**
- `PopoverTrigger` sudah render `<button>` — jangan wrap dengan `<button>` lagi (nested button invalid)
- Komponen baru butuh `bits-ui` + `@internationalized/date` di `vite.config.ts → ssr.noExternal`
- Tailwind class shadcn (`bg-popover`, `bg-background`, dll) butuh `@theme inline` di `app.css`
- Dark mode shadcn pakai `.dark` class — ditoggle otomatis di `tema.ts` untuk tema gelap

**Infrastruktur shadcn (sudah terpasang, jangan duplikat):**
- `frontend/components.json` — config shadcn
- `frontend/src/lib/utils/cn.ts` — utility `cn()` + re-export tipe `bits-ui`
- `app.css` → `@theme inline` block + CSS bridge alias per 7 tema
- `tema.ts` → `.dark` class toggle

**Tambah komponen shadcn baru:**
```bash
bunx shadcn-svelte@latest add <nama-komponen>
```
File di-generate ke `src/lib/components/ui/<nama>/`. Tidak perlu edit manual.

---

## Git Commit

```text
<type>(<scope>): <deskripsi singkat>   ← maks 72 karakter

type: feat | fix | refactor | style | chore | docs | db
scope: auth | kasir | gudang | keuangan | laporan | karyawan | barang | stok | pengaturan

Bahasa Indonesia, imperatif, huruf kecil. Jangan tambah Co-Authored-By.
Body: jelaskan KENAPA berubah, bukan APA yang berubah.
```

Contoh: `fix(kasir): reset tipeTransaksi ke eceran setelah checkout`

## Permission String yang Valid

```
pengaturan.kelola   laporan.lihat     stok.lihat      stok.edit
penjualan.*         penjualan.void    barang.lihat    barang.edit
karyawan.lihat      karyawan.edit     piutang.edit    hutang.edit
absensi.diri        absensi.kelola    role.kelola     harga_beli.*
```

Pemilik: otomatis lolos semua permission (hasPermission checks `perms.includes('*')`).
