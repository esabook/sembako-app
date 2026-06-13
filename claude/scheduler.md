# Alert Scheduler

File: `backend/src/lib/scheduler.ts`. Dipanggil sekali di startup via `initScheduler()`.

Cek setiap menit. Jalankan alert jika:
- `notifikasi_config.aktif = true`
- `jam_kirim` cocok dengan jam Jakarta sekarang (HH:MM)
- `hari_kirim` cocok hari minggu (1=Senin … 7=Minggu) — hanya untuk `ringkasan_mingguan`
- `terakhir_dikirim` bukan hari ini (dedup harian)

## Alert yang diimplementasi

| jenis | threshold | keterangan |
|---|---|---|
| `stok_habis` | — | stok ≤ 0 |
| `stok_kritis` | — | stok > 0 tapi ≤ stok_minimum |
| `barang_kadaluarsa` | hari ke depan | dari tgl_kadaluarsa di barang_masuk_detail |
| `hutang_jatuh_tempo` | hari ke depan | hutang_supplier status belum |
| `piutang_macet` | hari lewat | piutang_pelanggan melewati jatuh_tempo |
| `ringkasan_harian` | — | omzet + jumlah transaksi hari ini |
| `ringkasan_mingguan` | — | omzet + jumlah transaksi minggu ini |

Setiap alert → `notifikasi_log` (dedup per referensi per hari).
Jika `channel = 'wa'`, juga emit `notifikasi.wa` — pasang gateway WA di `hooks.ts`:

```typescript
bus.register('notifikasi.wa', async ({ pesan, penerima }) => {
  // panggil WA gateway API di sini
})
```
