// CF Workers entry — D1 + Cloudflare edge
// Bun entry tetap di index.ts. File ini untuk: bunx wrangler deploy

import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { Scalar } from '@scalar/hono-api-reference'
import * as schema from './db/schema.ts'
import { setD1Db } from './db/index.ts'
import { query } from './db/index.ts'
import { langgananMiddleware } from './middleware/langganan.ts'
import { openAPISpec } from './openapi.ts'
import { initAnalyticsTap } from './lib/analytics-tap.ts'
import { initHooks } from './lib/hooks.ts'
import type { JWTPayload } from './routes/auth.ts'
import { absensiRouter } from './routes/absensi.ts'
import { absensiKioskRouter } from './routes/absensi-kiosk.ts'
import { akunRouter } from './routes/akun.ts'
import { analyticsRouter } from './routes/analytics.ts'
import { approvalRouter } from './routes/approval.ts'
import { asetRouter } from './routes/aset.ts'
import { auditRouter } from './routes/audit.ts'
import { authRouter } from './routes/auth.ts'
import { barangRouter } from './routes/barang.ts'
import { barangMasukRouter } from './routes/barang_masuk.ts'
import { bomRouter } from './routes/bom.ts'
import { budgetTargetRouter } from './routes/budget-target.ts'
import { crmRouter } from './routes/crm.ts'
import { dashboardRouter } from './routes/dashboard.ts'
import { demoRouter } from './routes/demo.ts'
import { draftRouter } from './routes/draft.ts'
import { evaluasiRouter } from './routes/evaluasi.ts'
import { fnbRouter } from './routes/fnb.ts'
import { hajatanRouter } from './routes/hajatan.ts'
import { hargaRouter } from './routes/harga.ts'
import { inspeksiRouter } from './routes/inspeksi.ts'
import { izinRouter } from './routes/izin.ts'
import { jadwalRouter } from './routes/jadwal.ts'
import { jasaRouter } from './routes/jasa.ts'
import { kartuAnggotaRouter } from './routes/kartu_anggota.ts'
import { karyawanRouter } from './routes/karyawan.ts'
import { kasbonRouter } from './routes/kasbon.ts'
import { keuanganRouter } from './routes/keuangan.ts'
import { lampiranRouter } from './routes/lampiran.ts'
import { langgananRouter } from './routes/langganan.ts'
import { laporanRouter } from './routes/laporan.ts'
import { notifikasiRouter } from './routes/notifikasi.ts'
import { pelangganRouter } from './routes/pelanggan.ts'
import { pengaturanRouter } from './routes/pengaturan.ts'
import { penggajianRouter } from './routes/penggajian.ts'
import { penjualanRouter } from './routes/penjualan.ts'
import { pinjamanInvestasiRouter } from './routes/pinjaman-investasi.ts'
import { platformRouter } from './routes/platform.ts'
import { printerRouter } from './routes/printer.ts'
import { promoRouter } from './routes/promo.ts'
import { purchaseOrderRouter } from './routes/purchase_order.ts'
import { returPenjualanRouter } from './routes/retur-penjualan.ts'
import { returSupplierRouter } from './routes/retur-supplier.ts'
import { salesRouter } from './routes/sales.ts'
import { sanksiInsentifRouter } from './routes/sanksi-insentif.ts'
import { scanRelayRouter } from './routes/scan_relay.ts'
import { shiftRouter } from './routes/shift.ts'
import { sopRouter } from './routes/sop.ts'
import { stokRouter } from './routes/stok.ts'
import { stokOpnameRouter } from './routes/stok_opname.ts'
import { supplierRouter } from './routes/supplier.ts'
import { tamuRouter } from './routes/tamu.ts'
import { tokoRouter } from './routes/toko.ts'
import { tugasRouter } from './routes/tugas.ts'
import { utilitasRouter } from './routes/utilitas.ts'

// Install @cloudflare/workers-types for proper types: bun add -d @cloudflare/workers-types
type Bindings = {
  DB: any // D1Database
  JWT_SECRET: string
  JWT_EXPIRY_HOURS: string
  FRONTEND_URL: string
  SAAS_GATING: string
  STORAGE_DRIVER: string
  UPLOAD_DIR: string
  S3_ENDPOINT: string
  S3_REGION: string
  S3_BUCKET: string
  S3_ACCESS_KEY_ID: string
  S3_SECRET_ACCESS_KEY: string
  S3_PUBLIC_URL: string
  PLATFORM_ADMIN_USER: string
  PLATFORM_ADMIN_PASSWORD: string
}

type Variables = { user: JWTPayload; tenant_id: number; cabang_id: number | null }

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// D1 init — lazy singleton per isolate, ESM live binding propagates to all route imports
let d1Ready = false
app.use('*', async (c, next) => {
  if (!d1Ready) {
    // Expose CF env vars to process.env for env.ts / route compat
    for (const [k, v] of Object.entries(c.env)) {
      if (typeof v === 'string') process.env[k] = v
    }
    const d1Db = drizzleD1(c.env.DB, { schema }) as any
    setD1Db(d1Db)
    // One-time: register event hooks + analytics tap (safe in CF — no Bun deps)
    initHooks()
    initAnalyticsTap()
    // Note: initScheduler skipped — use CF Cron Triggers instead
    d1Ready = true
  }
  await next()
})

app.use('*', logger())

app.use('*', async (c, next) => {
  const origins = (c.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',').map((s: string) => s.trim()).filter(Boolean)
  return cors({
    origin: (origin) => (origins.includes(origin ?? '') ? (origin ?? origins[0]) : null),
    credentials: true,
  })(c, next)
})

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

app.get('/health', (c) => c.json({ success: true, data: { status: 'ok', runtime: 'cloudflare-workers' } }))
app.get('/openapi.json', (c) => c.json(openAPISpec))
app.get('/doc', Scalar({ spec: { url: '/openapi.json' }, pageTitle: 'Stokasir API' }))

// /uploads/* tidak di-serve dari CF Workers — arahkan ke R2 public bucket atau Cloudflare Images
app.get('/uploads/*', (c) => c.json({ success: false, error: 'Gunakan R2 public bucket untuk file uploads' }, 410))

app.use('*', langgananMiddleware)

app.route('/auth', authRouter)
app.route('/langganan', langgananRouter)
app.route('/platform', platformRouter)
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
app.route('/analytics', analyticsRouter)
app.route('/akun', akunRouter)
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
app.route('/toko', tokoRouter)
app.route('/fnb', fnbRouter)
app.route('/jasa', jasaRouter)
app.route('/bom', bomRouter)
app.route('/demo', demoRouter)

export default app
