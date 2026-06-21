import { eq, count } from 'drizzle-orm'
import { db, withTransaction, query } from './index.ts'
import {
  toko, cabang, karyawan, kas_bank,
  satuan, kategori, barang, supplier, pelanggan,
  barang_masuk, barang_masuk_detail, mutasi_stok,
  penjualan, penjualan_detail, jurnal_kas, hutang_supplier,
} from './schema.ts'

export const DEMO_KODE_TOKO = 'DEMO'

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function getDemoTokoId(): Promise<number | null> {
  const row = await query.find<{ id: number }>(
    db.select({ id: toko.id }).from(toko).where(eq(toko.kode_toko, DEMO_KODE_TOKO))
  )
  return row?.id ?? null
}

export async function getDemoStats(tokoId: number) {
  const [jmlBarang, jmlPenjualan, jmlBarangMasuk] = await Promise.all([
    query.find<{ n: number }>(db.select({ n: count() }).from(barang).where(eq(barang.tenant_id, tokoId))),
    query.find<{ n: number }>(db.select({ n: count() }).from(penjualan).where(eq(penjualan.tenant_id, tokoId))),
    query.find<{ n: number }>(db.select({ n: count() }).from(barang_masuk).where(eq(barang_masuk.tenant_id, tokoId))),
  ])
  return {
    jumlah_barang: jmlBarang?.n ?? 0,
    jumlah_penjualan: jmlPenjualan?.n ?? 0,
    jumlah_barang_masuk: jmlBarangMasuk?.n ?? 0,
  }
}

async function ensureSatuan(nama: string, singkatan: string): Promise<number> {
  const row = await query.find<{ id: number }>(
    db.select({ id: satuan.id }).from(satuan).where(eq(satuan.nama, nama))
  )
  if (row) return row.id
  const r = await query.ret<{ id: number }>(
    db.insert(satuan).values({ nama, singkatan, is_preset: true }).returning()
  )
  return r!.id
}

async function ensureKategori(nama: string): Promise<number> {
  const row = await query.find<{ id: number }>(
    db.select({ id: kategori.id }).from(kategori).where(eq(kategori.nama, nama))
  )
  if (row) return row.id
  const r = await query.ret<{ id: number }>(
    db.insert(kategori).values({ nama, is_preset: true }).returning()
  )
  return r!.id
}

export async function generateDemoData(): Promise<{ toko_id: number }> {
  const existing = await getDemoTokoId()
  if (existing) throw new Error('Data demo sudah ada. Hapus dulu sebelum generate ulang.')

  const hash = await Bun.password.hash('demo123')

  return withTransaction(async () => {
    // ── 1. Toko ──────────────────────────────────────────────────────────────
    const tokoRow = await query.ret<{ id: number }>(
      db.insert(toko).values({
        kode_toko: DEMO_KODE_TOKO,
        nama: 'Toko Demo Stokasir',
        alamat: 'Jl. Demo No. 1, Kota Contoh',
        is_active: true,
      }).returning()
    )
    const tid = tokoRow!.id

    // ── 2. Cabang ─────────────────────────────────────────────────────────────
    const cabangRow = await query.ret<{ id: number }>(
      db.insert(cabang).values({
        toko_id: tid,
        kode_cabang: 'CAB-01',
        nama: 'Cabang Utama Demo',
        is_active: true,
      }).returning()
    )
    const cid = cabangRow!.id

    // ── 3. Karyawan ───────────────────────────────────────────────────────────
    await query.exec(
      db.insert(karyawan).values({
        kode_karyawan: 'DEMO-KRY-001',
        nama: 'Pemilik Demo',
        role: 'pemilik',
        username: 'demo-admin',
        password_hash: hash,
        tipe_gaji: 'bulanan',
        gaji_pokok: 5000000,
        toko_id: tid,
        cabang_id: null,
        is_active: true,
      })
    )
    const kasirRow = await query.ret<{ id: number }>(
      db.insert(karyawan).values({
        kode_karyawan: 'DEMO-KRY-002',
        nama: 'Kasir Demo',
        role: 'kasir',
        username: 'demo-kasir',
        password_hash: hash,
        tipe_gaji: 'bulanan',
        gaji_pokok: 2500000,
        toko_id: tid,
        cabang_id: cid,
        is_active: true,
      }).returning()
    )
    const kasirId = kasirRow!.id

    // ── 4. Kas & Bank ─────────────────────────────────────────────────────────
    const kasRow = await query.ret<{ id: number }>(
      db.insert(kas_bank).values({
        nama: 'Kas Toko Demo',
        tipe: 'kas',
        saldo_awal: 5000000,
        tenant_id: tid,
        cabang_id: cid,
      }).returning()
    )
    const kasId = kasRow!.id

    const bankRow = await query.ret<{ id: number }>(
      db.insert(kas_bank).values({
        nama: 'Bank BCA Demo',
        tipe: 'bank',
        saldo_awal: 10000000,
        tenant_id: tid,
        cabang_id: cid,
      }).returning()
    )
    const bankId = bankRow!.id

    // ── 5. Satuan (global — cukup pastikan ada) ───────────────────────────────
    const sKg  = await ensureSatuan('Kilogram', 'kg')
    const sPcs = await ensureSatuan('Pcs', 'pcs')
    const sBtl = await ensureSatuan('Botol', 'btl')
    const sKtn = await ensureSatuan('Karton', 'ktn')

    // ── 6. Kategori (global — cukup pastikan ada) ─────────────────────────────
    const katSembako = await ensureKategori('Sembako')
    const katMinyak  = await ensureKategori('Minyak & Lemak')
    const katMinuman = await ensureKategori('Minuman')
    const katBumbu   = await ensureKategori('Bumbu & Rempah')
    const katRokok   = await ensureKategori('Rokok')

    // ── 7. Barang ─────────────────────────────────────────────────────────────
    const barangData = [
      { kode: 'DEMO-BRG-001', nama: 'Beras Premium 5kg',       kat: katSembako, sat: sKg,  beli: 58000,  eceran: 65000,  grosir: 62000,  stok: 120 },
      { kode: 'DEMO-BRG-002', nama: 'Minyak Goreng Bimoli 2L', kat: katMinyak,  sat: sBtl, beli: 30000,  eceran: 35000,  grosir: 33000,  stok: 80  },
      { kode: 'DEMO-BRG-003', nama: 'Gula Pasir 1kg',          kat: katSembako, sat: sKg,  beli: 14000,  eceran: 16000,  grosir: 15000,  stok: 150 },
      { kode: 'DEMO-BRG-004', nama: 'Teh Botol Sosro 450ml',   kat: katMinuman, sat: sBtl, beli: 4500,   eceran: 6000,   grosir: 5500,   stok: 200 },
      { kode: 'DEMO-BRG-005', nama: 'Aqua 600ml',              kat: katMinuman, sat: sBtl, beli: 2500,   eceran: 4000,   grosir: 3500,   stok: 300 },
      { kode: 'DEMO-BRG-006', nama: 'Indomie Goreng',          kat: katSembako, sat: sPcs, beli: 2800,   eceran: 4000,   grosir: 3500,   stok: 500 },
      { kode: 'DEMO-BRG-007', nama: 'Kecap Manis ABC 600ml',   kat: katBumbu,   sat: sBtl, beli: 12000,  eceran: 16000,  grosir: 14000,  stok: 60  },
      { kode: 'DEMO-BRG-008', nama: 'Sabun Lifebuoy 80gr',     kat: katSembako, sat: sPcs, beli: 3500,   eceran: 5000,   grosir: 4500,   stok: 100 },
      { kode: 'DEMO-BRG-009', nama: 'Garam Beryodium 500gr',   kat: katBumbu,   sat: sPcs, beli: 2000,   eceran: 3000,   grosir: 2500,   stok: 80  },
      { kode: 'DEMO-BRG-010', nama: 'Rokok Gudang Garam 12',   kat: katRokok,   sat: sKtn, beli: 264000, eceran: 288000, grosir: 276000, stok: 30  },
    ]

    const barangIds: number[] = []
    for (const b of barangData) {
      const r = await query.ret<{ id: number }>(
        db.insert(barang).values({
          kode_barang: b.kode,
          nama_barang: b.nama,
          kategori_id: b.kat,
          satuan_dasar_id: b.sat,
          harga_beli_terakhir: b.beli,
          harga_beli_rata: b.beli,
          harga_jual_eceran: b.eceran,
          harga_jual_grosir: b.grosir,
          stok_sekarang: b.stok,
          stok_minimum: 10,
          tenant_id: tid,
          is_active: true,
        }).returning()
      )
      barangIds.push(r!.id)
    }

    // ── 8. Supplier ───────────────────────────────────────────────────────────
    const supData = [
      { kode: 'DEMO-SUP-001', nama: 'CV Maju Jaya',              kontak: '081234567890', terms: 30 },
      { kode: 'DEMO-SUP-002', nama: 'PT Distributor Nusantara',  kontak: '082345678901', terms: 14 },
      { kode: 'DEMO-SUP-003', nama: 'UD Sumber Makmur',          kontak: '083456789012', terms: 7  },
    ]
    const supIds: number[] = []
    for (const s of supData) {
      const r = await query.ret<{ id: number }>(
        db.insert(supplier).values({
          kode_supplier: s.kode,
          nama_supplier: s.nama,
          kontak: s.kontak,
          terms_bayar: s.terms,
          limit_hutang: 50000000,
          tenant_id: tid,
          is_active: true,
        }).returning()
      )
      supIds.push(r!.id)
    }

    // ── 9. Pelanggan ──────────────────────────────────────────────────────────
    const plgData = [
      { kode: 'DEMO-PLG-001', nama: 'Bu Sari',         tipe: 'eceran'    as const },
      { kode: 'DEMO-PLG-002', nama: 'Pak Budi Grosir', tipe: 'grosir'    as const },
      { kode: 'DEMO-PLG-003', nama: 'Warung Pak Joko', tipe: 'langganan' as const },
      { kode: 'DEMO-PLG-004', nama: 'Ibu Dewi',        tipe: 'eceran'    as const },
      { kode: 'DEMO-PLG-005', nama: 'Toko ABC Makmur', tipe: 'grosir'    as const },
    ]
    const plgIds: number[] = []
    for (const p of plgData) {
      const r = await query.ret<{ id: number }>(
        db.insert(pelanggan).values({
          kode_pelanggan: p.kode,
          nama: p.nama,
          tipe: p.tipe,
          limit_piutang: p.tipe === 'grosir' ? 5000000 : 0,
          saldo_piutang: 0,
          tenant_id: tid,
          is_active: true,
        }).returning()
      )
      plgIds.push(r!.id)
    }

    // ── 10. Barang Masuk (10 penerimaan, tiap ~3 hari selama 30 hari) ─────────
    const bmDays = [29, 26, 23, 20, 17, 14, 11, 8, 5, 2]
    for (let i = 0; i < bmDays.length; i++) {
      const daysAgo = bmDays[i]!
      const supId = supIds[i % supIds.length]!

      const bmRow = await query.ret<{ id: number }>(
        db.insert(barang_masuk).values({
          no_penerimaan: `DEMO-BM-${String(i + 1).padStart(3, '0')}`,
          supplier_id: supId,
          tanggal_terima: dateStr(daysAgo),
          total_nilai: 0,
          tenant_id: tid,
          diterima_oleh: kasirId,
        }).returning()
      )
      const bmId = bmRow!.id

      // 5 item per penerimaan — offset per penerimaan agar variatif
      let totalNilai = 0
      for (let j = 0; j < 5; j++) {
        const idx = (i + j) % barangData.length
        const b = barangData[idx]!
        const qty = 20 + j * 5
        const nilai = b.beli * qty
        totalNilai += nilai

        await query.exec(
          db.insert(barang_masuk_detail).values({
            penerimaan_id: bmId,
            barang_id: barangIds[idx]!,
            satuan_id: b.sat,
            jumlah_terima: qty,
            harga_beli: b.beli,
            tenant_id: tid,
          })
        )

        // Mutasi masuk — jumlah_sebelum dikira berdasarkan stok awal (demo approximation)
        await query.exec(
          db.insert(mutasi_stok).values({
            barang_id: barangIds[idx]!,
            tanggal: dateStr(daysAgo),
            jenis: 'masuk',
            referensi_tipe: 'barang_masuk',
            referensi_id: bmId,
            jumlah_sebelum: b.stok,
            jumlah_perubahan: qty,
            jumlah_sesudah: b.stok + qty,
            dicatat_oleh: kasirId,
            tenant_id: tid,
            cabang_id: cid,
          })
        )
      }

      await query.exec(
        db.update(barang_masuk).set({ total_nilai: totalNilai }).where(eq(barang_masuk.id, bmId))
      )

      await query.exec(
        db.insert(hutang_supplier).values({
          supplier_id: supId,
          barang_masuk_id: bmId,
          tanggal_hutang: dateStr(daysAgo),
          tanggal_jatuh_tempo: dateStr(daysAgo - supData[i % supData.length]!.terms),
          total_hutang: totalNilai,
          sisa_hutang: totalNilai,
          status: 'belum',
          tenant_id: tid,
        })
      )
    }

    // ── 11. Penjualan (2–3 per hari selama 30 hari) ───────────────────────────
    const METODE = ['tunai', 'tunai', 'tunai', 'transfer', 'qris'] as const
    let trxCounter = 1

    for (let day = 29; day >= 0; day--) {
      const numTrx = day % 3 === 0 ? 3 : 2
      for (let t = 0; t < numTrx; t++) {
        const isGrosir = trxCounter % 7 === 0
        const plgId = plgIds[trxCounter % plgIds.length]!
        const metode = METODE[trxCounter % METODE.length]!

        // 2–3 item per transaksi
        const itemCount = (t % 2) + 2
        let subtotal = 0
        const itemValues: { brgId: number; b: typeof barangData[0]; qty: number; harga: number; sub: number }[] = []

        for (let k = 0; k < itemCount; k++) {
          const idx = (trxCounter + k) % barangData.length
          const b = barangData[idx]!
          const qty = isGrosir ? 5 + k * 3 : 1 + (k % 3)
          const harga = isGrosir ? b.grosir : b.eceran
          const sub = qty * harga
          subtotal += sub
          itemValues.push({ brgId: barangIds[idx]!, b, qty, harga, sub })
        }

        const total = subtotal
        const bayar = metode === 'tunai' ? Math.ceil(total / 1000) * 1000 : total
        const kembalian = bayar - total

        const trxRow = await query.ret<{ id: number }>(
          db.insert(penjualan).values({
            no_transaksi: `DEMO-TRX-${String(trxCounter).padStart(4, '0')}`,
            pelanggan_id: plgId,
            tanggal: dateStr(day),
            tipe: isGrosir ? 'grosir' : 'eceran',
            kasir_id: kasirId,
            subtotal,
            diskon_total: 0,
            total,
            metode_bayar: metode,
            bayar,
            kembalian,
            status: 'lunas',
            tipe_layanan: 'retail',
            tenant_id: tid,
            cabang_id: cid,
          }).returning()
        )
        const trxId = trxRow!.id

        for (const { brgId, b, qty, harga, sub } of itemValues) {
          await query.exec(
            db.insert(penjualan_detail).values({
              penjualan_id: trxId,
              barang_id: brgId,
              satuan_id: b.sat,
              jumlah: qty,
              harga_jual: harga,
              diskon_item: 0,
              subtotal: sub,
              tenant_id: tid,
              cabang_id: cid,
            })
          )

          await query.exec(
            db.insert(mutasi_stok).values({
              barang_id: brgId,
              tanggal: dateStr(day),
              jenis: 'keluar',
              referensi_tipe: 'penjualan',
              referensi_id: trxId,
              jumlah_sebelum: b.stok,
              jumlah_perubahan: -qty,
              jumlah_sesudah: Math.max(0, b.stok - qty),
              dicatat_oleh: kasirId,
              tenant_id: tid,
              cabang_id: cid,
            })
          )
        }

        // Jurnal kas untuk semua metode bayar non-hutang
        await query.exec(
          db.insert(jurnal_kas).values({
            tanggal: dateStr(day),
            kas_bank_id: metode === 'tunai' ? kasId : bankId,
            jenis: 'masuk',
            kategori: 'penjualan',
            referensi_tipe: 'penjualan',
            referensi_id: trxId,
            keterangan: `Penjualan ${isGrosir ? 'Grosir' : 'Eceran'} DEMO-TRX-${String(trxCounter).padStart(4, '0')}`,
            jumlah: total,
            dicatat_oleh: kasirId,
            tenant_id: tid,
            cabang_id: cid,
          })
        )

        trxCounter++
      }
    }

    return { toko_id: tid }
  })
}

export async function deleteDemoData(): Promise<void> {
  const demoId = await getDemoTokoId()
  if (!demoId) throw new Error('Data demo tidak ditemukan')

  const t = demoId
  return withTransaction(async () => {
    // Hapus child-first, ikuti urutan FK
    await query.exec(db.delete(mutasi_stok).where(eq(mutasi_stok.tenant_id, t)))
    await query.exec(db.delete(jurnal_kas).where(eq(jurnal_kas.tenant_id, t)))
    await query.exec(db.delete(penjualan_detail).where(eq(penjualan_detail.tenant_id, t)))
    await query.exec(db.delete(penjualan).where(eq(penjualan.tenant_id, t)))
    await query.exec(db.delete(barang_masuk_detail).where(eq(barang_masuk_detail.tenant_id, t)))
    await query.exec(db.delete(hutang_supplier).where(eq(hutang_supplier.tenant_id, t)))
    await query.exec(db.delete(barang_masuk).where(eq(barang_masuk.tenant_id, t)))
    await query.exec(db.delete(barang).where(eq(barang.tenant_id, t)))
    await query.exec(db.delete(supplier).where(eq(supplier.tenant_id, t)))
    await query.exec(db.delete(pelanggan).where(eq(pelanggan.tenant_id, t)))
    await query.exec(db.delete(kas_bank).where(eq(kas_bank.tenant_id, t)))
    await query.exec(db.delete(karyawan).where(eq(karyawan.toko_id, t)))
    await query.exec(db.delete(cabang).where(eq(cabang.toko_id, t)))
    await query.exec(db.delete(toko).where(eq(toko.id, t)))
  })
}
