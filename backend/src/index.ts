import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from './db/index.ts'
import { karyawan, kas_bank } from './db/schema.ts'
import { count } from 'drizzle-orm'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { join } from 'node:path'
import { Scalar } from '@scalar/hono-api-reference'
import { openAPISpec } from './openapi.ts'
import { authRouter } from './routes/auth.ts'
import { barangRouter } from './routes/barang.ts'
import { supplierRouter } from './routes/supplier.ts'
import { pelangganRouter } from './routes/pelanggan.ts'
import { kartuAnggotaRouter } from './routes/kartu_anggota.ts'
import { karyawanRouter } from './routes/karyawan.ts'
import { penjualanRouter } from './routes/penjualan.ts'
import { stokRouter } from './routes/stok.ts'
import { barangMasukRouter } from './routes/barang_masuk.ts'
import { purchaseOrderRouter } from './routes/purchase_order.ts'
import { keuanganRouter } from './routes/keuangan.ts'
import { laporanRouter } from './routes/laporan.ts'
import { stokOpnameRouter } from './routes/stok_opname.ts'
import { dashboardRouter } from './routes/dashboard.ts'
import { absensiRouter } from './routes/absensi.ts'
import { kasbonRouter } from './routes/kasbon.ts'
import { penggajianRouter } from './routes/penggajian.ts'
import { scanRelayRouter } from './routes/scan_relay.ts'
import { shiftRouter } from './routes/shift.ts'
import { pengaturanRouter } from './routes/pengaturan.ts'
import { hargaRouter } from './routes/harga.ts'
import { returPenjualanRouter } from './routes/retur-penjualan.ts'
import { returSupplierRouter } from './routes/retur-supplier.ts'
import { izinRouter } from './routes/izin.ts'
import { evaluasiRouter } from './routes/evaluasi.ts'
import { sanksiInsentifRouter } from './routes/sanksi-insentif.ts'
import { notifikasiRouter } from './routes/notifikasi.ts'
import { auditRouter } from './routes/audit.ts'
import { budgetTargetRouter } from './routes/budget-target.ts'
import { promoRouter } from './routes/promo.ts'
import { jadwalRouter } from './routes/jadwal.ts'
import { draftRouter } from './routes/draft.ts'
import { absensiKioskRouter } from './routes/absensi-kiosk.ts'
import { sopRouter } from './routes/sop.ts'
import { approvalRouter } from './routes/approval.ts'
import { lampiranRouter } from './routes/lampiran.ts'
import { asetRouter } from './routes/aset.ts'
import { utilitasRouter } from './routes/utilitas.ts'
import { pinjamanInvestasiRouter } from './routes/pinjaman-investasi.ts'
import { tamuRouter } from './routes/tamu.ts'
import { salesRouter } from './routes/sales.ts'
import { crmRouter } from './routes/crm.ts'
import { tugasRouter } from './routes/tugas.ts'
import { hajatanRouter } from './routes/hajatan.ts'
import { inspeksiRouter } from './routes/inspeksi.ts'
import { printerRouter } from './routes/printer.ts'
import { initHooks } from './lib/hooks.ts'
import { initScheduler } from './lib/scheduler.ts'
import type { JWTPayload } from './routes/auth.ts'

type Variables = { user: JWTPayload }

const app = new Hono<{ Variables: Variables }>()

app.use('*', logger())
app.use('*', compress())
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status)
  }
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('UNIQUE constraint failed')) {
    const kolom = msg.match(/UNIQUE constraint failed: \w+\.(\w+)/)?.[1] ?? 'data'
    return c.json({ success: false, error: `${kolom} sudah digunakan` }, 409)
  }
  if (msg.includes('FOREIGN KEY constraint failed')) {
    return c.json({ success: false, error: 'Data terkait tidak ditemukan' }, 409)
  }
  if (msg.includes('NOT NULL constraint failed')) {
    const kolom = msg.match(/NOT NULL constraint failed: \w+\.(\w+)/)?.[1] ?? 'field'
    return c.json({ success: false, error: `${kolom} wajib diisi` }, 400)
  }
  console.error(err)
  return c.json({ success: false, error: 'Terjadi kesalahan server' }, 500)
})

app.get('/health', (c) => c.json({ success: true, data: { status: 'ok' } }))

app.get('/openapi.json', (c) => c.json(openAPISpec))
app.get('/doc', Scalar({ spec: { url: '/openapi.json' }, pageTitle: 'Stokasir API' }))

// Serve uploaded files
app.get('/uploads/*', async (c) => {
  const relativePath = c.req.path.replace(/^\/uploads\//, '')
  const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../uploads')
  const file = Bun.file(join(uploadDir, relativePath))
  if (!await file.exists()) return c.notFound()
  return new Response(file)
})

app.route('/auth', authRouter)
app.route('/barang', barangRouter)
app.route('/supplier', supplierRouter)
app.route('/pelanggan', pelangganRouter)
app.route('/kartu-anggota', kartuAnggotaRouter)
app.route('/karyawan', karyawanRouter)
app.route('/penjualan', penjualanRouter)
app.route('/stok', stokRouter)
app.route('/barang-masuk', barangMasukRouter)
app.route('/purchase-order', purchaseOrderRouter)
app.route('/keuangan', keuanganRouter)
app.route('/laporan', laporanRouter)
app.route('/stok-opname', stokOpnameRouter)
app.route('/dashboard', dashboardRouter)
app.route('/absensi', absensiRouter)
app.route('/kasbon', kasbonRouter)
app.route('/penggajian', penggajianRouter)
app.route('/scan-relay', scanRelayRouter)
app.route('/shift', shiftRouter)
app.route('/pengaturan', pengaturanRouter)
app.route('/harga', hargaRouter)
app.route('/retur-penjualan', returPenjualanRouter)
app.route('/retur-supplier', returSupplierRouter)
app.route('/izin', izinRouter)
app.route('/evaluasi', evaluasiRouter)
app.route('/sanksi-insentif', sanksiInsentifRouter)
app.route('/notifikasi', notifikasiRouter)
app.route('/audit', auditRouter)
app.route('/budget-target', budgetTargetRouter)
app.route('/promo', promoRouter)
app.route('/jadwal', jadwalRouter)
app.route('/draft', draftRouter)
app.route('/absensi-kiosk', absensiKioskRouter)
app.route('/sop', sopRouter)
app.route('/approval', approvalRouter)
app.route('/lampiran', lampiranRouter)
app.route('/aset', asetRouter)
app.route('/utilitas', utilitasRouter)
app.route('/pinjaman-investasi', pinjamanInvestasiRouter)
app.route('/tamu', tamuRouter)
app.route('/sales', salesRouter)
app.route('/crm', crmRouter)
app.route('/tugas', tugasRouter)
app.route('/hajatan', hajatanRouter)
app.route('/inspeksi', inspeksiRouter)
app.route('/printer', printerRouter)

// Auto-migrate saat startup — aman dijalankan berulang, hanya apply yang belum
// MIGRATIONS_DIR bisa di-set via env untuk distribusi (default: src/db/migrations untuk dev)
const migrationsFolder = process.env.MIGRATIONS_DIR ?? './src/db/migrations'
migrate(db, { migrationsFolder })
console.log('Database migrations OK')

// Daftarkan semua SOP hooks ke event bus
initHooks()
// Jalankan alert scheduler (cek setiap menit berdasarkan notifikasi_config)
initScheduler()

// Auto-seed: buat admin default hanya jika belum ada karyawan sama sekali (db segar)
const seedCheck = db.select({ total: count() }).from(karyawan).get()
if ((seedCheck?.total ?? 0) === 0) {
  const hash = await Bun.password.hash('admin123')
  db.insert(karyawan).values({
    kode_karyawan: 'KRY-001',
    nama: 'Pemilik',
    role: 'pemilik',
    username: 'admin',
    password_hash: hash,
    tipe_gaji: 'bulanan',
  }).run()
  db.insert(kas_bank).values([
    { nama: 'Kas Toko', tipe: 'kas', saldo_awal: 0 },
    { nama: 'Bank BRI', tipe: 'bank', saldo_awal: 0 },
  ]).run()
  console.log('Seed awal OK — login: admin / admin123')
}

const PORT = Number(process.env.PORT ?? 3000)
console.log(`Backend berjalan di http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
