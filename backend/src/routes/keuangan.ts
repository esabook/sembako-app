import { Hono } from 'hono'
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import {
  hutang_supplier, pembayaran_hutang,
  piutang_pelanggan, pembayaran_piutang,
  jurnal_kas, kas_bank,
  supplier, pelanggan, penjualan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const keuanganRouter = new Hono<{ Variables: { user: JWTPayload } }>()

keuanganRouter.use('*', authMiddleware)
keuanganRouter.use('*', tenantMiddleware)

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

// ── GET /keuangan/kas-bank ────────────────────────────────────────────────

keuanganRouter.get('/kas-bank', requirePermission('hutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const rows = await query.findAll(db.select().from(kas_bank).where(
    and(eq(kas_bank.is_active, true), eq(kas_bank.tenant_id, tenantId), cabangId ? eq(kas_bank.cabang_id, cabangId) : undefined)
  ))
  return c.json({ success: true, data: rows })
})

// ── GET /keuangan/kas-bank/saldo ─────────────────────────────────────────

keuanganRouter.get('/kas-bank/saldo', requirePermission('hutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const rows = await query.findAll(db.select().from(kas_bank).where(
    and(eq(kas_bank.is_active, true), eq(kas_bank.tenant_id, tenantId), cabangId ? eq(kas_bank.cabang_id, cabangId) : undefined)
  ))

  const saldoList = await Promise.all((rows as (typeof kas_bank.$inferSelect)[]).map(async (kb) => {
    const masuk = (await query.find<{ total: number }>(db
      .select({ total: sql<number>`COALESCE(SUM(jumlah), 0)` })
      .from(jurnal_kas)
      .where(and(eq(jurnal_kas.kas_bank_id, kb.id!), eq(jurnal_kas.jenis, 'masuk')))
    ))?.total ?? 0

    const keluar = (await query.find<{ total: number }>(db
      .select({ total: sql<number>`COALESCE(SUM(jumlah), 0)` })
      .from(jurnal_kas)
      .where(and(eq(jurnal_kas.kas_bank_id, kb.id!), eq(jurnal_kas.jenis, 'keluar')))
    ))?.total ?? 0

    return {
      ...kb,
      total_masuk: masuk,
      total_keluar: keluar,
      saldo: kb.saldo_awal + masuk - keluar,
    }
  }))

  return c.json({ success: true, data: saldoList })
})

// ── POST /keuangan/kas-bank ───────────────────────────────────────────────

keuanganRouter.post('/kas-bank', requirePermission('hutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{ nama: string; tipe: 'kas' | 'bank'; saldo_awal?: number }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama wajib diisi' })
  if (!['kas', 'bank'].includes(body.tipe)) throw new HTTPException(400, { message: 'Tipe tidak valid' })

  const row = await query.ret(db.insert(kas_bank).values({
    nama: body.nama.trim(),
    tipe: body.tipe,
    saldo_awal: body.saldo_awal ?? 0,
    tenant_id: tenantId,
    cabang_id: cabangId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── PUT /keuangan/kas-bank/:id ────────────────────────────────────────────

keuanganRouter.put('/kas-bank/:id', requirePermission('hutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama?: string; saldo_awal?: number }>()

  const kb = await query.find<typeof kas_bank.$inferSelect>(db.select().from(kas_bank).where(and(eq(kas_bank.id, id), eq(kas_bank.tenant_id, tenantId))))
  if (!kb) throw new HTTPException(404, { message: 'Akun tidak ditemukan' })

  const row = await query.ret(db.update(kas_bank)
    .set({
      nama: body.nama?.trim() ?? kb.nama,
      saldo_awal: body.saldo_awal ?? kb.saldo_awal,
    })
    .where(and(eq(kas_bank.id, id), eq(kas_bank.tenant_id, tenantId)))
    .returning())

  return c.json({ success: true, data: row })
})

// ── DELETE /keuangan/kas-bank/:id (soft) ─────────────────────────────────

keuanganRouter.delete('/kas-bank/:id', requirePermission('hutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const kb = await query.find(db.select({ id: kas_bank.id }).from(kas_bank).where(and(eq(kas_bank.id, id), eq(kas_bank.tenant_id, tenantId))))
  if (!kb) throw new HTTPException(404, { message: 'Akun tidak ditemukan' })
  await query.exec(db.update(kas_bank).set({ is_active: false }).where(and(eq(kas_bank.id, id), eq(kas_bank.tenant_id, tenantId))))
  return c.json({ success: true })
})

// ── GET /keuangan/hutang ──────────────────────────────────────────────────

keuanganRouter.get('/hutang', requirePermission('hutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db
    .select({
      id: hutang_supplier.id,
      supplier_id: hutang_supplier.supplier_id,
      nama_supplier: supplier.nama_supplier,
      barang_masuk_id: hutang_supplier.barang_masuk_id,
      tanggal_hutang: hutang_supplier.tanggal_hutang,
      tanggal_jatuh_tempo: hutang_supplier.tanggal_jatuh_tempo,
      total_hutang: hutang_supplier.total_hutang,
      sisa_hutang: hutang_supplier.sisa_hutang,
      status: hutang_supplier.status,
    })
    .from(hutang_supplier)
    .leftJoin(supplier, eq(hutang_supplier.supplier_id, supplier.id))
    .where(eq(hutang_supplier.tenant_id, tenantId))
    .orderBy(desc(hutang_supplier.tanggal_hutang))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /keuangan/hutang/:id/pembayaran ───────────────────────────────────

keuanganRouter.get('/hutang/:id/pembayaran', requirePermission('hutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  const hutang = await query.find(db.select({ id: hutang_supplier.id }).from(hutang_supplier).where(and(eq(hutang_supplier.id, id), eq(hutang_supplier.tenant_id, tenantId))))
  if (!hutang) throw new HTTPException(404, { message: 'Hutang tidak ditemukan' })

  const rows = await query.findAll(db
    .select()
    .from(pembayaran_hutang)
    .where(and(eq(pembayaran_hutang.hutang_id, id), eq(pembayaran_hutang.tenant_id, tenantId)))
    .orderBy(desc(pembayaran_hutang.tanggal_bayar))
    )

  return c.json({ success: true, data: rows })
})

// ── POST /keuangan/hutang/:id/bayar ───────────────────────────────────────

keuanganRouter.post('/hutang/:id/bayar', requirePermission('hutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ jumlah_bayar: number; kas_bank_id: number; tanggal_bayar?: string }>()

  if (!body.jumlah_bayar || body.jumlah_bayar <= 0)
    throw new HTTPException(400, { message: 'Jumlah bayar tidak valid' })
  if (!body.kas_bank_id)
    throw new HTTPException(400, { message: 'Pilih akun kas/bank' })

  const hutang = await query.find<typeof hutang_supplier.$inferSelect>(db.select().from(hutang_supplier).where(and(eq(hutang_supplier.id, id), eq(hutang_supplier.tenant_id, tenantId))))
  if (!hutang) throw new HTTPException(404, { message: 'Hutang tidak ditemukan' })
  if (hutang.status === 'lunas') throw new HTTPException(400, { message: 'Hutang sudah lunas' })

  const bayar = Math.min(body.jumlah_bayar, hutang.sisa_hutang)
  const sisaBaru = hutang.sisa_hutang - bayar
  const statusBaru = sisaBaru <= 0 ? 'lunas' : 'sebagian'
  const tgl = body.tanggal_bayar ?? tglSekarang()

  await withTransaction(async (_tx) => {
    await query.exec(db.insert(pembayaran_hutang).values({
      hutang_id: id,
      tanggal_bayar: tgl,
      jumlah_bayar: bayar,
      kas_bank_id: body.kas_bank_id,
      dibayar_oleh: user.id,
      tenant_id: tenantId,
    }))

    await query.exec(db.update(hutang_supplier)
      .set({ sisa_hutang: sisaBaru, status: statusBaru, updated_at: isoNow() })
      .where(and(eq(hutang_supplier.id, id), eq(hutang_supplier.tenant_id, tenantId)))
    )

    await query.exec(db.insert(jurnal_kas).values({
      tanggal: tgl,
      kas_bank_id: body.kas_bank_id,
      jenis: 'keluar',
      kategori: 'pembayaran_hutang',
      referensi_tipe: 'hutang_supplier',
      referensi_id: id,
      keterangan: `Bayar hutang supplier #${id}`,
      jumlah: bayar,
      dicatat_oleh: user.id,
      tenant_id: tenantId,
      cabang_id: cabangId,
    }))
  })

  return c.json({ success: true, data: { sisa_hutang: sisaBaru, status: statusBaru } })
})

// ── GET /keuangan/piutang ─────────────────────────────────────────────────

keuanganRouter.get('/piutang', requirePermission('piutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db
    .select({
      id: piutang_pelanggan.id,
      pelanggan_id: piutang_pelanggan.pelanggan_id,
      nama_pelanggan: pelanggan.nama,
      penjualan_id: piutang_pelanggan.penjualan_id,
      no_transaksi: penjualan.no_transaksi,
      tanggal_piutang: piutang_pelanggan.tanggal_piutang,
      tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo,
      total_piutang: piutang_pelanggan.total_piutang,
      sisa_piutang: piutang_pelanggan.sisa_piutang,
      status: piutang_pelanggan.status,
    })
    .from(piutang_pelanggan)
    .leftJoin(pelanggan, eq(piutang_pelanggan.pelanggan_id, pelanggan.id))
    .leftJoin(penjualan, eq(piutang_pelanggan.penjualan_id, penjualan.id))
    .where(eq(piutang_pelanggan.tenant_id, tenantId))
    .orderBy(desc(piutang_pelanggan.tanggal_piutang))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /keuangan/piutang/:id/pembayaran ──────────────────────────────────

keuanganRouter.get('/piutang/:id/pembayaran', requirePermission('piutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  const piutang = await query.find(db.select({ id: piutang_pelanggan.id }).from(piutang_pelanggan).where(and(eq(piutang_pelanggan.id, id), eq(piutang_pelanggan.tenant_id, tenantId))))
  if (!piutang) throw new HTTPException(404, { message: 'Piutang tidak ditemukan' })

  const rows = await query.findAll(db
    .select()
    .from(pembayaran_piutang)
    .where(and(eq(pembayaran_piutang.piutang_id, id), eq(pembayaran_piutang.tenant_id, tenantId)))
    .orderBy(desc(pembayaran_piutang.tanggal_bayar))
    )

  return c.json({ success: true, data: rows })
})

// ── POST /keuangan/piutang/:id/bayar ──────────────────────────────────────

keuanganRouter.post('/piutang/:id/bayar', requirePermission('piutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ jumlah_bayar: number; kas_bank_id: number; tanggal_bayar?: string }>()

  if (!body.jumlah_bayar || body.jumlah_bayar <= 0)
    throw new HTTPException(400, { message: 'Jumlah bayar tidak valid' })
  if (!body.kas_bank_id)
    throw new HTTPException(400, { message: 'Pilih akun kas/bank' })

  const piutang = await query.find<typeof piutang_pelanggan.$inferSelect>(db.select().from(piutang_pelanggan).where(and(eq(piutang_pelanggan.id, id), eq(piutang_pelanggan.tenant_id, tenantId))))
  if (!piutang) throw new HTTPException(404, { message: 'Piutang tidak ditemukan' })
  if (piutang.status === 'lunas') throw new HTTPException(400, { message: 'Piutang sudah lunas' })

  const terima = Math.min(body.jumlah_bayar, piutang.sisa_piutang)
  const sisaBaru = piutang.sisa_piutang - terima
  const statusBaru = sisaBaru <= 0 ? 'lunas' : 'sebagian'
  const tgl = body.tanggal_bayar ?? tglSekarang()

  await withTransaction(async (_tx) => {
    await query.exec(db.insert(pembayaran_piutang).values({
      piutang_id: id,
      tanggal_bayar: tgl,
      jumlah_bayar: terima,
      kas_bank_id: body.kas_bank_id,
      diterima_oleh: user.id,
      tenant_id: tenantId,
    }))

    await query.exec(db.update(piutang_pelanggan)
      .set({ sisa_piutang: sisaBaru, status: statusBaru, updated_at: isoNow() })
      .where(and(eq(piutang_pelanggan.id, id), eq(piutang_pelanggan.tenant_id, tenantId)))
    )

    // Kurangi saldo_piutang di master pelanggan
    db.run(sql`
      UPDATE pelanggan
      SET saldo_piutang = saldo_piutang - ${terima}
      WHERE id = ${piutang.pelanggan_id}
    `)

    await query.exec(db.insert(jurnal_kas).values({
      tanggal: tgl,
      kas_bank_id: body.kas_bank_id,
      jenis: 'masuk',
      kategori: 'penerimaan_piutang',
      referensi_tipe: 'piutang_pelanggan',
      referensi_id: id,
      keterangan: `Terima pembayaran piutang #${id}`,
      jumlah: terima,
      dicatat_oleh: user.id,
      tenant_id: tenantId,
      cabang_id: cabangId,
    }))
  })

  return c.json({ success: true, data: { sisa_piutang: sisaBaru, status: statusBaru } })
})

// ── GET /keuangan/jurnal ──────────────────────────────────────────────────
// Query params: dari=YYYY-MM-DD, sampai=YYYY-MM-DD, kas_bank_id=N

keuanganRouter.get('/jurnal', requirePermission('hutang.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const { dari, sampai, kas_bank_id } = c.req.query()

  const conditions = [
    eq(jurnal_kas.tenant_id, tenantId),
    cabangId ? eq(jurnal_kas.cabang_id, cabangId) : undefined,
    dari ? gte(jurnal_kas.tanggal, dari) : undefined,
    sampai ? lte(jurnal_kas.tanggal, sampai) : undefined,
    kas_bank_id ? eq(jurnal_kas.kas_bank_id, Number(kas_bank_id)) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const rows = await query.findAll(db
    .select({
      id: jurnal_kas.id,
      tanggal: jurnal_kas.tanggal,
      kas_bank_id: jurnal_kas.kas_bank_id,
      nama_akun: kas_bank.nama,
      jenis: jurnal_kas.jenis,
      kategori: jurnal_kas.kategori,
      keterangan: jurnal_kas.keterangan,
      jumlah: jurnal_kas.jumlah,
      referensi_tipe: jurnal_kas.referensi_tipe,
      referensi_id: jurnal_kas.referensi_id,
    })
    .from(jurnal_kas)
    .leftJoin(kas_bank, eq(jurnal_kas.kas_bank_id, kas_bank.id))
    .where(and(...conditions))
    .orderBy(desc(jurnal_kas.tanggal))
    .limit(500)
    )

  return c.json({ success: true, data: rows })
})

// ── POST /keuangan/jurnal — input manual ─────────────────────────────────

keuanganRouter.post('/jurnal', requirePermission('hutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{
    kas_bank_id: number
    jenis: 'masuk' | 'keluar'
    kategori: string
    keterangan?: string
    jumlah: number
    tanggal?: string
  }>()

  if (!body.kas_bank_id) throw new HTTPException(400, { message: 'Pilih akun kas/bank' })
  if (!body.jenis) throw new HTTPException(400, { message: 'Jenis wajib diisi' })
  if (!body.kategori?.trim()) throw new HTTPException(400, { message: 'Kategori wajib diisi' })
  if (!body.jumlah || body.jumlah <= 0) throw new HTTPException(400, { message: 'Jumlah tidak valid' })

  const row = await query.ret(db.insert(jurnal_kas).values({
    tanggal: body.tanggal ?? tglSekarang(),
    kas_bank_id: body.kas_bank_id,
    jenis: body.jenis,
    kategori: body.kategori,
    keterangan: body.keterangan,
    jumlah: body.jumlah,
    dicatat_oleh: user.id,
    tenant_id: tenantId,
    cabang_id: cabangId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── GET /keuangan/rekonsiliasi-piutang — cek selisih saldo_piutang vs aktual ──

keuanganRouter.get('/rekonsiliasi-piutang', requirePermission('piutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const aktual = await query.findAll<{ pelanggan_id: number; nama: string; saldo_tersimpan: number; saldo_aktual: number }>(db
    .select({
      pelanggan_id: pelanggan.id,
      nama: pelanggan.nama,
      saldo_tersimpan: pelanggan.saldo_piutang,
      saldo_aktual: sql<number>`COALESCE(SUM(${piutang_pelanggan.sisa_piutang}), 0)`,
    })
    .from(pelanggan)
    .leftJoin(
      piutang_pelanggan,
      and(
        eq(piutang_pelanggan.pelanggan_id, pelanggan.id),
        sql`${piutang_pelanggan.status} != 'lunas'`,
      )
    )
    .where(and(eq(pelanggan.is_active, true), eq(pelanggan.tenant_id, tenantId)))
    .groupBy(pelanggan.id)
    )

  const desync = aktual.filter((r) => Math.abs(r.saldo_tersimpan - r.saldo_aktual) > 0.01)

  return c.json({
    success: true,
    data: {
      total_pelanggan: aktual.length,
      pelanggan_desync: desync.length,
      selisih: desync.map((r) => ({
        pelanggan_id: r.pelanggan_id,
        nama: r.nama,
        saldo_tersimpan: r.saldo_tersimpan,
        saldo_aktual: r.saldo_aktual,
        selisih: r.saldo_tersimpan - r.saldo_aktual,
      })),
    },
  })
})

// ── POST /keuangan/rekonsiliasi-piutang — fix saldo_piutang dari data aktual ──

keuanganRouter.post('/rekonsiliasi-piutang', requirePermission('piutang.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const aktual = await query.findAll<{ pelanggan_id: number; saldo_aktual: number }>(db
    .select({
      pelanggan_id: pelanggan.id,
      saldo_aktual: sql<number>`COALESCE(SUM(${piutang_pelanggan.sisa_piutang}), 0)`,
    })
    .from(pelanggan)
    .leftJoin(
      piutang_pelanggan,
      and(
        eq(piutang_pelanggan.pelanggan_id, pelanggan.id),
        sql`${piutang_pelanggan.status} != 'lunas'`,
      )
    )
    .where(and(eq(pelanggan.is_active, true), eq(pelanggan.tenant_id, tenantId)))
    .groupBy(pelanggan.id)
    )

  let fixed = 0
  await withTransaction(async (_tx) => {
    for (const r of aktual) {
      await query.exec(db.update(pelanggan)
        .set({ saldo_piutang: Math.max(0, r.saldo_aktual) })
        .where(and(eq(pelanggan.id, r.pelanggan_id), eq(pelanggan.tenant_id, tenantId)))
      )
      fixed++
    }
  })

  return c.json({ success: true, data: { pelanggan_diupdate: fixed } })
})
