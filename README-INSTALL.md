# Stokasir — Panduan Instalasi Cepat

Stokasir adalah aplikasi kasir & stok untuk toko, berjalan sebagai server lokal di WiFi toko.
Tidak perlu internet — cukup koneksi WiFi yang sama antara server dan HP kasir.

---

## Langkah Instalasi

### Linux / Mac / Raspberry Pi

```bash
bash scripts/setup.sh
```

Script akan:
- Install Bun dan PM2 secara otomatis
- Tanya lokasi folder data, IP server, dan konfigurasi lain
- Build aplikasi dan jalankan dengan PM2

### Windows

Buka **PowerShell** (klik kanan → Run as Administrator), lalu:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Script akan:
- Cek Bun dan PM2 (minta install manual jika belum ada)
- Tanya konfigurasi
- Build aplikasi, buka firewall, dan jalankan dengan PM2

---

## Setelah Instalasi

1. Buka browser di HP → ketik IP server yang muncul di akhir setup
2. Login dengan akun yang dibuat pemilik
3. Untuk install sebagai ikon di HP → baca **Panduan Instalasi** di `/panduan/instalasi`

---

## Prasyarat

| | Linux/Pi | Mac | Windows |
|---|---|---|---|
| Bun | auto-install | auto-install (butuh Homebrew) | download dari bun.sh |
| Node.js | auto-install via apt | auto-install via brew | download dari nodejs.org |
| PM2 | auto-install | auto-install | auto-install |

---

## Butuh Bantuan?

- Panduan lengkap: lihat `DEPLOY.md`
- Panduan per platform: `DEPLOY.md` → bagian Raspberry Pi / Linux / Mac / Windows
