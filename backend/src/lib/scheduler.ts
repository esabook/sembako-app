// ── B7: Alert Scheduler ───────────────────────────────────────────────────
// Cron ringan berbasis setInterval — tidak butuh library luar.
// Dipanggil sekali di startup via initScheduler().
//
// Cek setiap menit: jalankan alert jika jam_kirim cocok waktu sekarang
// dan belum dikirim hari ini (dedup via terakhir_dikirim).
//
// WA: log dibuat dengan channel='wa'. Pengiriman aktual bisa di-hook via
//   bus.register('notifikasi.wa', handler) untuk gateway eksternal.

import { db } from '../db/index.ts'
import { notifikasi_config, notifikasi_log, barang, barang_masuk_detail, hutang_supplier, piutang_pelanggan, penjualan } from '../db/schema.ts'
import { eq, and, lte, gte, ne, sql } from 'drizzle-orm'
import { bus } from './event-bus.ts'

type Alert = {
  jenis: string
  pesan: string
  referensi_tipe?: string
  referensi_id?: number
}

// ── Fungsi cek per jenis ────────────────────────────────────────────────────

function cekStokHabis(): Alert[] {
  return db
    .select({ id: barang.id, nama_barang: barang.nama_barang, stok_sekarang: barang.stok_sekarang })
    .from(barang)
    .where(and(eq(barang.is_active, true), lte(barang.stok_sekarang, 0)))
    .all()
    .map((b) => ({
      jenis: 'stok_habis',
      pesan: `Stok ${b.nama_barang} habis (0)`,
      referensi_tipe: 'barang',
      referensi_id: b.id,
    }))
}

function cekStokKritis(): Alert[] {
  const rows = db
    .select({ id: barang.id, nama_barang: barang.nama_barang, stok_sekarang: barang.stok_sekarang, stok_minimum: barang.stok_minimum })
    .from(barang)
    .where(eq(barang.is_active, true))
    .all()

  return rows
    .filter((b) => b.stok_minimum > 0 && b.stok_sekarang > 0 && b.stok_sekarang <= b.stok_minimum)
    .map((b) => ({
      jenis: 'stok_kritis',
      pesan: `Stok ${b.nama_barang} hampir habis (${b.stok_sekarang}, min ${b.stok_minimum})`,
      referensi_tipe: 'barang',
      referensi_id: b.id,
    }))
}

function cekKadaluarsa(hariKedepan: number): Alert[] {
  const batas = new Date()
  batas.setDate(batas.getDate() + hariKedepan)
  const batasStr = batas.toISOString().slice(0, 10)
  const hariIni = new Date().toISOString().slice(0, 10)

  // tgl_kadaluarsa ada di barang_masuk_detail, join ke barang untuk nama
  return db
    .select({
      barang_id: barang.id,
      nama_barang: barang.nama_barang,
      tgl_kadaluarsa: barang_masuk_detail.tgl_kadaluarsa,
    })
    .from(barang_masuk_detail)
    .innerJoin(barang, eq(barang_masuk_detail.barang_id, barang.id))
    .where(and(
      eq(barang.is_active, true),
      gte(barang_masuk_detail.tgl_kadaluarsa!, hariIni),
      lte(barang_masuk_detail.tgl_kadaluarsa!, batasStr),
    ))
    .all()
    .map((r) => ({
      jenis: 'barang_kadaluarsa',
      pesan: `${r.nama_barang} kadaluarsa pada ${r.tgl_kadaluarsa}`,
      referensi_tipe: 'barang',
      referensi_id: r.barang_id,
    }))
}

function cekHutangJatuhTempo(hariKedepan: number): Alert[] {
  const batas = new Date()
  batas.setDate(batas.getDate() + hariKedepan)
  const batasStr = batas.toISOString().slice(0, 10)
  const hariIni = new Date().toISOString().slice(0, 10)

  return db
    .select({ id: hutang_supplier.id, sisa_hutang: hutang_supplier.sisa_hutang, tanggal_jatuh_tempo: hutang_supplier.tanggal_jatuh_tempo })
    .from(hutang_supplier)
    .where(and(
      eq(hutang_supplier.status, 'belum'),
      gte(hutang_supplier.tanggal_jatuh_tempo!, hariIni),
      lte(hutang_supplier.tanggal_jatuh_tempo!, batasStr),
    ))
    .all()
    .map((r) => ({
      jenis: 'hutang_jatuh_tempo',
      pesan: `Hutang supplier Rp ${r.sisa_hutang.toLocaleString('id-ID')} jatuh tempo ${r.tanggal_jatuh_tempo}`,
      referensi_tipe: 'hutang_supplier',
      referensi_id: r.id,
    }))
}

function cekPiutangMacet(hariLewat: number): Alert[] {
  const batas = new Date()
  batas.setDate(batas.getDate() - hariLewat)
  const batasStr = batas.toISOString().slice(0, 10)

  return db
    .select({ id: piutang_pelanggan.id, sisa_piutang: piutang_pelanggan.sisa_piutang, tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo })
    .from(piutang_pelanggan)
    .where(and(
      ne(piutang_pelanggan.status, 'lunas'),
      lte(piutang_pelanggan.tanggal_jatuh_tempo!, batasStr),
    ))
    .all()
    .map((r) => ({
      jenis: 'piutang_macet',
      pesan: `Piutang pelanggan Rp ${r.sisa_piutang.toLocaleString('id-ID')} telah melewati jatuh tempo (${r.tanggal_jatuh_tempo})`,
      referensi_tipe: 'piutang_pelanggan',
      referensi_id: r.id,
    }))
}

function cekRingkasanHarian(): Alert[] {
  const hariIni = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const [row] = db
    .select({
      total_omzet: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
      jumlah_transaksi: sql<number>`COUNT(*)`,
    })
    .from(penjualan)
    .where(and(
      sql`date(${penjualan.tanggal}) = ${hariIni}`,
      ne(penjualan.status, 'void'),
    ))
    .all()

  if (!row) return []

  return [{
    jenis: 'ringkasan_harian',
    pesan: `Ringkasan ${hariIni}: ${row.jumlah_transaksi} transaksi, omzet Rp ${Number(row.total_omzet).toLocaleString('id-ID')}`,
  }]
}

function cekRingkasanMingguan(): Alert[] {
  const now = new Date()
  const senin = new Date(now)
  senin.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const awalStr = senin.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
  const akhirStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const [row] = db
    .select({
      total_omzet: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
      jumlah_transaksi: sql<number>`COUNT(*)`,
    })
    .from(penjualan)
    .where(and(
      sql`date(${penjualan.tanggal}) >= ${awalStr}`,
      sql`date(${penjualan.tanggal}) <= ${akhirStr}`,
      ne(penjualan.status, 'void'),
    ))
    .all()

  if (!row) return []

  return [{
    jenis: 'ringkasan_mingguan',
    pesan: `Ringkasan minggu ini (${awalStr} s/d ${akhirStr}): ${row.jumlah_transaksi} transaksi, omzet Rp ${Number(row.total_omzet).toLocaleString('id-ID')}`,
  }]
}

// ── Periksa dedup: apakah log untuk referensi ini sudah ada hari ini? ──────

function sudahDilogHariIni(jenis: string, referensiTipe?: string, referensiId?: number): boolean {
  const hariIni = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const row = db
    .select({ id: notifikasi_log.id })
    .from(notifikasi_log)
    .where(and(
      eq(notifikasi_log.jenis, jenis),
      referensiTipe ? eq(notifikasi_log.referensi_tipe!, referensiTipe) : undefined,
      referensiId ? eq(notifikasi_log.referensi_id!, referensiId) : undefined,
      sql`date(${notifikasi_log.waktu}) = ${hariIni}`,
    ))
    .get()

  return !!row
}

// ── Simpan alert ke notifikasi_log (dengan dedup) ───────────────────────────

function simpanAlerts(alerts: Alert[], channel: 'wa' | 'dashboard' | 'keduanya', penerima: string | null): void {
  const channels: ('wa' | 'dashboard')[] = channel === 'keduanya' ? ['wa', 'dashboard'] : [channel]

  for (const alert of alerts) {
    if (sudahDilogHariIni(alert.jenis, alert.referensi_tipe, alert.referensi_id)) continue

    for (const ch of channels) {
      db.insert(notifikasi_log).values({
        jenis: alert.jenis,
        channel: ch,
        pesan: alert.pesan,
        penerima: ch === 'wa' ? penerima : null,
        status: 'pending',
        referensi_tipe: alert.referensi_tipe ?? null,
        referensi_id: alert.referensi_id ?? null,
      }).run()

      if (ch === 'wa' && penerima) {
        bus.emit('notifikasi.wa', { pesan: alert.pesan, penerima, jenis: alert.jenis })
      }
    }
  }
}

// ── Jalankan cek untuk satu config ─────────────────────────────────────────

function jalankanCek(cfg: typeof notifikasi_config.$inferSelect): void {
  const threshold = cfg.threshold ?? 3
  let alerts: Alert[] = []

  switch (cfg.jenis) {
    case 'stok_habis':         alerts = cekStokHabis(); break
    case 'stok_kritis':        alerts = cekStokKritis(); break
    case 'barang_kadaluarsa':  alerts = cekKadaluarsa(threshold); break
    case 'hutang_jatuh_tempo': alerts = cekHutangJatuhTempo(threshold); break
    case 'piutang_macet':      alerts = cekPiutangMacet(threshold); break
    case 'ringkasan_harian':   alerts = cekRingkasanHarian(); break
    case 'ringkasan_mingguan': alerts = cekRingkasanMingguan(); break
  }

  if (alerts.length === 0) return

  simpanAlerts(alerts, cfg.channel, cfg.penerima_wa)

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
  db.update(notifikasi_config)
    .set({ terakhir_dikirim: now })
    .where(eq(notifikasi_config.id, cfg.id))
    .run()

  console.log(`[scheduler] ${cfg.jenis}: ${alerts.length} alert(s) diproses`)
}

// ── Main loop — cek setiap menit ────────────────────────────────────────────

function tickScheduler(): void {
  const now = new Date()
  const jakartaStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const jamSekarang = jakartaStr.slice(11, 16)  // HH:MM
  const hariIni = jakartaStr.slice(0, 10)       // YYYY-MM-DD
  const hariMinggu = ((now.getDay() + 6) % 7) + 1  // 1=Senin … 7=Minggu

  const configs = db
    .select()
    .from(notifikasi_config)
    .where(eq(notifikasi_config.aktif, true))
    .all()

  for (const cfg of configs) {
    // Hanya jalankan jika jam_kirim cocok
    if (!cfg.jam_kirim || cfg.jam_kirim !== jamSekarang) continue

    // Untuk ringkasan_mingguan, cek hari_kirim
    if (cfg.jenis === 'ringkasan_mingguan') {
      if (cfg.hari_kirim && cfg.hari_kirim !== hariMinggu) continue
    }

    // Jangan jalankan lebih dari sekali hari ini
    if (cfg.terakhir_dikirim?.slice(0, 10) === hariIni) continue

    try {
      jalankanCek(cfg)
    } catch (err) {
      console.error(`[scheduler] error saat cek ${cfg.jenis}:`, err)
    }
  }
}

// ── initScheduler — panggil sekali di index.ts ──────────────────────────────

export function initScheduler(): void {
  // Jalankan tick pertama setelah 1 menit agar startup tidak terbebani
  const interval = setInterval(tickScheduler, 60_000)
  // Pastikan interval tidak blok proses keluar
  if (typeof interval === 'object' && interval !== null && 'unref' in interval) {
    (interval as NodeJS.Timeout).unref()
  }
  console.log('[scheduler] alert-scheduler aktif (cek setiap menit)')
}
