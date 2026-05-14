import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { authRouter } from './routes/auth.ts'
import { barangRouter } from './routes/barang.ts'
import { supplierRouter } from './routes/supplier.ts'
import { pelangganRouter } from './routes/pelanggan.ts'
import { karyawanRouter } from './routes/karyawan.ts'
import { penjualanRouter } from './routes/penjualan.ts'
import { stokRouter } from './routes/stok.ts'
import { barangMasukRouter } from './routes/barang_masuk.ts'
import { purchaseOrderRouter } from './routes/purchase_order.ts'
import { keuanganRouter } from './routes/keuangan.ts'
import { laporanRouter } from './routes/laporan.ts'
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

app.route('/auth', authRouter)
app.route('/barang', barangRouter)
app.route('/supplier', supplierRouter)
app.route('/pelanggan', pelangganRouter)
app.route('/karyawan', karyawanRouter)
app.route('/penjualan', penjualanRouter)
app.route('/stok', stokRouter)
app.route('/barang-masuk', barangMasukRouter)
app.route('/purchase-order', purchaseOrderRouter)
app.route('/keuangan', keuanganRouter)
app.route('/laporan', laporanRouter)

const PORT = Number(process.env.PORT ?? 3000)
console.log(`Backend berjalan di http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
