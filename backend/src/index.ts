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
import { notifikasiRouter } from './routes/notifikasi.ts'
import { auditRouter } from './routes/audit.ts'
import { budgetTargetRouter } from './routes/budget-target.ts'
import { promoRouter } from './routes/promo.ts'
import { jadwalRouter } from './routes/jadwal.ts'
import { draftRouter } from './routes/draft.ts'
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
  console.error(err)
  return c.json({ success: false, error: 'Internal server error' }, 500)
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
app.route('/notifikasi', notifikasiRouter)
app.route('/audit', auditRouter)
app.route('/budget-target', budgetTargetRouter)
app.route('/promo', promoRouter)
app.route('/jadwal', jadwalRouter)
app.route('/draft', draftRouter)

// Auto-migrate saat startup — aman dijalankan berulang, hanya apply yang belum
migrate(db, { migrationsFolder: './src/db/migrations' })
console.log('Database migrations OK')

// Auto-seed: buat admin default hanya jika belum ada karyawan sama sekali (db segar)
const [{ total }] = db.select({ total: count() }).from(karyawan).all()
if (total === 0) {
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
