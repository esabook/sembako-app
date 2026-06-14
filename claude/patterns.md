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
