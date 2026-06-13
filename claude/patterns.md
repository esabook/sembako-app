# Pola Wajib Dijaga

```
1. Route order Hono: static (/tukar, /aktif) HARUS sebelum dynamic (/:id)
2. Multi-tabel → db.transaction() (contoh: bayar gaji → penggajian+kasbon+jurnal_kas)
3. api.ts try/catch: setelah fix F-H3, tidak perlu try/catch di setiap caller
4. Load data: onMount ATAU $effect — jangan keduanya untuk data yang sama
5. Permission guard di setiap halaman sensitif:
   $effect(() => { if ($user && !['pemilik','manajer'].includes($user.role)) goto('/kasir') })
6. Tabel baru → spread ...tenantField + ...auditFields + ...timestamps (lihat §ATURAN DATABASE)
7. Aksi penting di route → emit event ke bus (sebelum/sesudah sesuai kebutuhan)
8. Modul baru yang butuh approval → pakai mintaApproval() dari utils/approval.ts (bukan buat kolom sendiri)
```

## Git Commit

```text
<type>(<scope>): <deskripsi singkat>   ← maks 72 karakter

type: feat | fix | refactor | style | chore | docs | db
scope: auth | kasir | gudang | keuangan | laporan | karyawan | barang | stok

Bahasa Indonesia, imperatif, huruf kecil. Jangan tambah Co-Authored-By.
Body: jelaskan KENAPA berubah, bukan APA yang berubah.
```

Contoh: `fix(kasir): reset tipeTransaksi ke eceran setelah checkout`
