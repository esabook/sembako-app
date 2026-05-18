import { Hono } from 'hono'
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
app.get('/doc', Scalar({ spec: { url: '/openapi.json' }, pageTitle: 'Sembako App API' }))

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

const PORT = Number(process.env.PORT ?? 3000)
console.log(`Backend berjalan di http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
