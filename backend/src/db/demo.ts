import { eq, count } from 'drizzle-orm'
import { db, withTransaction, query } from './index.ts'
import {
  toko, cabang, karyawan, kas_bank,
  satuan, kategori, barang, supplier, pelanggan,
  kartu_anggota, histori_harga_beli, histori_harga_jual,
  purchase_order, po_detail,
  barang_masuk, barang_masuk_detail, mutasi_stok,
  penjualan, penjualan_detail, jurnal_kas,
  hutang_supplier, pembayaran_hutang,
  piutang_pelanggan, pembayaran_piutang,
  retur_penjualan, retur_penjualan_detail,
  retur_supplier, retur_supplier_detail,
  stok_opname, stok_opname_detail,
  absensi, kasbon, penggajian, sanksi_insentif, evaluasi_karyawan,
  tipe_shift, jadwal_kerja, shift_kasir,
  promo, promo_target, budget_operasional,
} from './schema.ts'

export const DEMO_KODE_TOKO = 'DEMO'

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function monthStr(monthsAgo: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toISOString().slice(0, 7)
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
    const pemilikRow = await query.ret<{ id: number }>(
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
      }).returning()
    )
    const pemilikId = pemilikRow!.id

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

    // ── 8. Histori Harga ──────────────────────────────────────────────────────
    for (let i = 0; i < barangData.length; i++) {
      const b = barangData[i]!
      await query.exec(
        db.insert(histori_harga_beli).values({
          barang_id: barangIds[i]!,
          harga_beli: b.beli,
          tanggal_berlaku: dateStr(60),
          dicatat_oleh: kasirId,
          tenant_id: tid,
        })
      )
      await query.exec(
        db.insert(histori_harga_jual).values({
          barang_id: barangIds[i]!,
          harga_eceran: b.eceran,
          harga_grosir: b.grosir,
          tanggal_berlaku: dateStr(60),
          diubah_oleh: pemilikId,
          tenant_id: tid,
        })
      )
    }

    // ── 9. Supplier ───────────────────────────────────────────────────────────
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

    // ── 10. Pelanggan ──────────────────────────────────────────────────────────
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

    // ── 11. Kartu Anggota (3 kartu, 2 di-assign ke pelanggan grosir) ──────────
    for (let k = 0; k < 3; k++) {
      await query.exec(
        db.insert(kartu_anggota).values({
          no_kartu: `DEMO-KA-${String(k + 1).padStart(4, '0')}`,
          tier: k === 0 ? 'gold' : k === 1 ? 'silver' : 'reguler',
          diskon_member: k === 0 ? 5 : k === 1 ? 3 : 0,
          poin: k === 0 ? 1250 : k === 1 ? 450 : 0,
          pelanggan_id: k < 2 ? plgIds[k + 1]! : null, // Pak Budi (gold), Warung Pak Joko (silver)
          is_active: true,
          tenant_id: tid,
        })
      )
    }

    // ── 12. Purchase Order (2 PO ke supplier berbeda) ─────────────────────────
    const poIds: number[] = []
    for (let p = 0; p < 2; p++) {
      const supId = supIds[p]!
      const poRow = await query.ret<{ id: number }>(
        db.insert(purchase_order).values({
          no_po: `DEMO-PO-${String(p + 1).padStart(3, '0')}`,
          supplier_id: supId,
          tanggal_po: dateStr(32 + p * 5),
          tanggal_estimasi_datang: dateStr(25 + p * 5),
          status: p === 0 ? 'lunas' : 'dikirim',
          total_nilai: 0,
          dibuat_oleh: pemilikId,
          tenant_id: tid,
        }).returning()
      )
      const poId = poRow!.id
      poIds.push(poId)

      let poTotal = 0
      for (let j = 0; j < 3; j++) {
        const idx = (p * 3 + j) % barangData.length
        const b = barangData[idx]!
        const qty = 50 + j * 10
        poTotal += b.beli * qty
        await query.exec(
          db.insert(po_detail).values({
            po_id: poId,
            barang_id: barangIds[idx]!,
            satuan_id: b.sat,
            jumlah_pesan: qty,
            jumlah_diterima: p === 0 ? qty : 0,
            harga_beli_estimasi: b.beli,
            tenant_id: tid,
          })
        )
      }
      await query.exec(
        db.update(purchase_order).set({ total_nilai: poTotal }).where(eq(purchase_order.id, poId))
      )
    }

    // ── 13. Barang Masuk (10 penerimaan, tiap ~3 hari selama 30 hari) ─────────
    const bmDays = [29, 26, 23, 20, 17, 14, 11, 8, 5, 2]
    const bmIds: number[] = []
    const hutangSupIds: number[] = []

    for (let i = 0; i < bmDays.length; i++) {
      const daysAgo = bmDays[i]!
      const supId = supIds[i % supIds.length]!

      const bmRow = await query.ret<{ id: number }>(
        db.insert(barang_masuk).values({
          no_penerimaan: `DEMO-BM-${String(i + 1).padStart(3, '0')}`,
          po_id: i < poIds.length ? poIds[i]! : null,
          supplier_id: supId,
          tanggal_terima: dateStr(daysAgo),
          total_nilai: 0,
          tenant_id: tid,
          diterima_oleh: kasirId,
        }).returning()
      )
      const bmId = bmRow!.id
      bmIds.push(bmId)

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

      const hutRow = await query.ret<{ id: number }>(
        db.insert(hutang_supplier).values({
          supplier_id: supId,
          barang_masuk_id: bmId,
          tanggal_hutang: dateStr(daysAgo),
          tanggal_jatuh_tempo: dateStr(daysAgo - supData[i % supData.length]!.terms),
          total_hutang: totalNilai,
          sisa_hutang: i < 2 ? Math.floor(totalNilai / 2) : totalNilai, // first 2 already partially paid
          status: i < 2 ? 'sebagian' : 'belum',
          tenant_id: tid,
        }).returning()
      )
      hutangSupIds.push(hutRow!.id)
    }

    // ── 14. Pembayaran Hutang Supplier (bayar sebagian 2 hutang pertama) ───────
    for (let h = 0; h < 2; h++) {
      const hutId = hutangSupIds[h]!
      const hutRow = await query.find<{ total_hutang: number }>(
        db.select({ total_hutang: hutang_supplier.total_hutang }).from(hutang_supplier).where(eq(hutang_supplier.id, hutId))
      )
      const bayar = Math.floor((hutRow?.total_hutang ?? 0) / 2)
      await query.exec(
        db.insert(pembayaran_hutang).values({
          hutang_id: hutId,
          tanggal_bayar: dateStr(bmDays[h]! - 5),
          jumlah_bayar: bayar,
          kas_bank_id: bankId,
          dibayar_oleh: kasirId,
          tenant_id: tid,
        })
      )
      await query.exec(
        db.insert(jurnal_kas).values({
          tanggal: dateStr(bmDays[h]! - 5),
          kas_bank_id: bankId,
          jenis: 'keluar',
          kategori: 'pembelian',
          referensi_tipe: 'pembayaran_hutang',
          referensi_id: hutId,
          keterangan: `Bayar hutang supplier DEMO-BM-${String(h + 1).padStart(3, '0')}`,
          jumlah: bayar,
          dicatat_oleh: kasirId,
          tenant_id: tid,
          cabang_id: cid,
        })
      )
    }

    // ── 15. Penjualan (2–3 per hari selama 30 hari) ───────────────────────────
    const METODE = ['tunai', 'tunai', 'tunai', 'transfer', 'qris'] as const
    let trxCounter = 1
    const trxIds: number[] = [] // simpan beberapa untuk retur

    for (let day = 29; day >= 0; day--) {
      const numTrx = day % 3 === 0 ? 3 : 2
      for (let t = 0; t < numTrx; t++) {
        const isGrosir = trxCounter % 7 === 0
        const plgId = plgIds[trxCounter % plgIds.length]!
        const metode = METODE[trxCounter % METODE.length]!

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
        if (trxIds.length < 4) trxIds.push(trxId)

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

    // ── 16. Hutang Penjualan / Piutang Pelanggan (2 transaksi kredit) ─────────
    const piutangIds: number[] = []
    for (let h = 0; h < 2; h++) {
      const plgId = plgIds[1 + h]! // Pak Budi Grosir, Warung Pak Joko
      const b0 = barangData[h]!
      const qty = 10 + h * 5
      const totalHutang = b0.grosir * qty

      const trxHRow = await query.ret<{ id: number }>(
        db.insert(penjualan).values({
          no_transaksi: `DEMO-HUT-${String(h + 1).padStart(3, '0')}`,
          pelanggan_id: plgId,
          tanggal: dateStr(12 + h * 3),
          tipe: 'grosir',
          kasir_id: kasirId,
          subtotal: totalHutang,
          diskon_total: 0,
          total: totalHutang,
          metode_bayar: 'hutang',
          bayar: 0,
          kembalian: 0,
          status: 'hutang',
          tipe_layanan: 'retail',
          tenant_id: tid,
          cabang_id: cid,
        }).returning()
      )
      const trxHId = trxHRow!.id

      await query.exec(
        db.insert(penjualan_detail).values({
          penjualan_id: trxHId,
          barang_id: barangIds[h]!,
          satuan_id: b0.sat,
          jumlah: qty,
          harga_jual: b0.grosir,
          diskon_item: 0,
          subtotal: totalHutang,
          tenant_id: tid,
          cabang_id: cid,
        })
      )

      const sisaPiutang = h === 0 ? Math.floor(totalHutang / 2) : totalHutang
      const piutRow = await query.ret<{ id: number }>(
        db.insert(piutang_pelanggan).values({
          pelanggan_id: plgId,
          penjualan_id: trxHId,
          tanggal_piutang: dateStr(12 + h * 3),
          tanggal_jatuh_tempo: dateStr(12 + h * 3 - 30),
          total_piutang: totalHutang,
          sisa_piutang: sisaPiutang,
          status: h === 0 ? 'sebagian' : 'belum',
          tenant_id: tid,
        }).returning()
      )
      piutangIds.push(piutRow!.id)

      await query.exec(
        db.update(pelanggan)
          .set({ saldo_piutang: sisaPiutang })
          .where(eq(pelanggan.id, plgId))
      )
    }

    // ── 17. Pembayaran Piutang (bayar sebagian piutang pertama) ──────────────
    const bayarPiutang = Math.floor((barangData[0]!.grosir * 10) / 2)
    await query.exec(
      db.insert(pembayaran_piutang).values({
        piutang_id: piutangIds[0]!,
        tanggal_bayar: dateStr(7),
        jumlah_bayar: bayarPiutang,
        kas_bank_id: kasId,
        diterima_oleh: kasirId,
        tenant_id: tid,
      })
    )
    await query.exec(
      db.insert(jurnal_kas).values({
        tanggal: dateStr(7),
        kas_bank_id: kasId,
        jenis: 'masuk',
        kategori: 'piutang',
        referensi_tipe: 'pembayaran_piutang',
        referensi_id: piutangIds[0]!,
        keterangan: 'Terima bayar piutang Pak Budi Grosir',
        jumlah: bayarPiutang,
        dicatat_oleh: kasirId,
        tenant_id: tid,
        cabang_id: cid,
      })
    )

    // ── 18. Retur Penjualan (2 retur dari transaksi berbeda) ─────────────────
    for (let r = 0; r < 2; r++) {
      const srcTrxId = trxIds[r]!
      const b0 = barangData[r]!
      const qtyRetur = 1
      const hargaRetur = b0.eceran
      const totalRetur = qtyRetur * hargaRetur

      const retPjRow = await query.ret<{ id: number }>(
        db.insert(retur_penjualan).values({
          no_retur: `DEMO-RP-${String(r + 1).padStart(3, '0')}`,
          penjualan_id: srcTrxId,
          tanggal: dateStr(27 - r * 3),
          kasir_id: kasirId,
          total_retur: totalRetur,
          alasan: r === 0 ? 'Barang rusak saat diterima' : 'Salah ambil barang',
          metode_refund: r === 0 ? 'tunai' : 'tukar_barang',
          kas_bank_id: r === 0 ? kasId : null,
          tenant_id: tid,
          cabang_id: cid,
        }).returning()
      )
      const retPjId = retPjRow!.id

      await query.exec(
        db.insert(retur_penjualan_detail).values({
          retur_id: retPjId,
          barang_id: barangIds[r]!,
          satuan_id: b0.sat,
          jumlah_retur: qtyRetur,
          harga_jual: hargaRetur,
          subtotal: totalRetur,
          tenant_id: tid,
          cabang_id: cid,
        })
      )

      await query.exec(
        db.insert(mutasi_stok).values({
          barang_id: barangIds[r]!,
          tanggal: dateStr(27 - r * 3),
          jenis: 'masuk',
          referensi_tipe: 'retur_penjualan',
          referensi_id: retPjId,
          jumlah_sebelum: b0.stok,
          jumlah_perubahan: qtyRetur,
          jumlah_sesudah: b0.stok + qtyRetur,
          dicatat_oleh: kasirId,
          tenant_id: tid,
          cabang_id: cid,
        })
      )

      if (r === 0) {
        await query.exec(
          db.insert(jurnal_kas).values({
            tanggal: dateStr(27),
            kas_bank_id: kasId,
            jenis: 'keluar',
            kategori: 'retur',
            referensi_tipe: 'retur_penjualan',
            referensi_id: retPjId,
            keterangan: 'Retur penjualan tunai DEMO-RP-001',
            jumlah: totalRetur,
            dicatat_oleh: kasirId,
            tenant_id: tid,
            cabang_id: cid,
          })
        )
      }
    }

    // ── 19. Retur Supplier (1 retur dari barang_masuk pertama) ───────────────
    const b0 = barangData[0]!
    const qtyRetSup = 5
    const hargaRetSup = b0.beli
    const totalRetSup = qtyRetSup * hargaRetSup

    const retSupRow = await query.ret<{ id: number }>(
      db.insert(retur_supplier).values({
        no_retur: 'DEMO-RS-001',
        barang_masuk_id: bmIds[0]!,
        supplier_id: supIds[0]!,
        tanggal: dateStr(26),
        dicatat_oleh: kasirId,
        total_retur: totalRetSup,
        alasan: 'Barang cacat / tidak sesuai spesifikasi',
        metode_refund: 'kurang_hutang',
        hutang_id: hutangSupIds[0]!,
        tenant_id: tid,
      }).returning()
    )
    const retSupId = retSupRow!.id

    await query.exec(
      db.insert(retur_supplier_detail).values({
        retur_id: retSupId,
        barang_id: barangIds[0]!,
        jumlah_retur: qtyRetSup,
        harga_beli: hargaRetSup,
        subtotal: totalRetSup,
        tenant_id: tid,
      })
    )

    await query.exec(
      db.insert(mutasi_stok).values({
        barang_id: barangIds[0]!,
        tanggal: dateStr(26),
        jenis: 'keluar',
        referensi_tipe: 'retur_supplier',
        referensi_id: retSupId,
        jumlah_sebelum: b0.stok,
        jumlah_perubahan: -qtyRetSup,
        jumlah_sesudah: Math.max(0, b0.stok - qtyRetSup),
        dicatat_oleh: kasirId,
        tenant_id: tid,
        cabang_id: cid,
      })
    )

    // ── 20. Stok Opname (1 opname selesai, 10 barang) ─────────────────────────
    const opnameRow = await query.ret<{ id: number }>(
      db.insert(stok_opname).values({
        no_opname: 'DEMO-OPN-001',
        tanggal_mulai: dateStr(15),
        tanggal_selesai: dateStr(14),
        status: 'approved',
        diapprove_oleh: pemilikId,
        tenant_id: tid,
        cabang_id: cid,
      }).returning()
    )
    const opnameId = opnameRow!.id

    for (let i = 0; i < barangData.length; i++) {
      const b = barangData[i]!
      const selisih = i % 3 === 0 ? -2 : i % 3 === 1 ? 1 : 0
      await query.exec(
        db.insert(stok_opname_detail).values({
          opname_id: opnameId,
          barang_id: barangIds[i]!,
          stok_sistem: b.stok,
          stok_fisik: b.stok + selisih,
          selisih,
          alasan_selisih: selisih !== 0 ? (selisih < 0 ? 'Susut/hilang' : 'Stok koreksi') : null,
          dihitung_oleh: kasirId,
          tenant_id: tid,
          cabang_id: cid,
        })
      )
    }

    // ── 21. Tipe Shift ────────────────────────────────────────────────────────
    const shiftPagiRow = await query.ret<{ id: number }>(
      db.insert(tipe_shift).values({
        nama: 'Shift Pagi',
        jam_mulai: '07:00',
        jam_selesai: '15:00',
        warna: '#00e676',
        is_active: true,
        tenant_id: tid,
      }).returning()
    )
    const shiftSoreRow = await query.ret<{ id: number }>(
      db.insert(tipe_shift).values({
        nama: 'Shift Sore',
        jam_mulai: '15:00',
        jam_selesai: '22:00',
        warna: '#40c4ff',
        is_active: true,
        tenant_id: tid,
      }).returning()
    )
    const shiftPagiId = shiftPagiRow!.id
    const shiftSoreId = shiftSoreRow!.id

    // ── 22. Jadwal Kerja (30 hari untuk kasir) ────────────────────────────────
    for (let d = 29; d >= 0; d--) {
      const tipeId = d % 2 === 0 ? shiftPagiId : shiftSoreId
      await query.exec(
        db.insert(jadwal_kerja).values({
          karyawan_id: kasirId,
          tipe_shift_id: tipeId,
          tanggal: dateStr(d),
          dibuat_oleh: pemilikId,
          tenant_id: tid,
        })
      )
    }

    // ── 23. Absensi (30 hari untuk kasir — 2 hari izin, 1 alpa) ─────────────
    const STATUS_ABSENSI = ['hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'hadir', 'hadir', 'hadir', 'alpa'] as const
    for (let d = 29; d >= 0; d--) {
      const status = STATUS_ABSENSI[d % STATUS_ABSENSI.length]!
      const terlambat = status === 'hadir' && d % 8 === 0 ? 15 : 0
      await query.exec(
        db.insert(absensi).values({
          karyawan_id: kasirId,
          tanggal: dateStr(d),
          jam_masuk: status === 'hadir' ? (terlambat > 0 ? '07:15' : '07:00') : null,
          jam_keluar: status === 'hadir' ? '15:05' : null,
          shift: 'Shift Pagi',
          status,
          terlambat_menit: terlambat > 0 ? terlambat : null,
          dicatat_oleh: pemilikId,
          tenant_id: tid,
        })
      )
    }

    // ── 24. Kasbon (1 kasbon kasir sedang aktif) ──────────────────────────────
    const kasbonRow = await query.ret<{ id: number }>(
      db.insert(kasbon).values({
        karyawan_id: kasirId,
        tanggal_pinjam: dateStr(20),
        jumlah: 500000,
        cicilan_per_bulan: 250000,
        sisa_kasbon: 250000,
        status: 'aktif',
        disetujui_oleh: pemilikId,
        tanggal_cair: dateStr(19),
        catatan: 'Kebutuhan darurat keluarga',
        tenant_id: tid,
      }).returning()
    )
    const kasbonId = kasbonRow!.id

    await query.exec(
      db.insert(jurnal_kas).values({
        tanggal: dateStr(19),
        kas_bank_id: kasId,
        jenis: 'keluar',
        kategori: 'gaji',
        referensi_tipe: 'kasbon',
        referensi_id: kasbonId,
        keterangan: 'Pencairan kasbon Kasir Demo',
        jumlah: 500000,
        dicatat_oleh: pemilikId,
        tenant_id: tid,
        cabang_id: cid,
      })
    )

    // ── 25. Penggajian (2 bulan lalu untuk kasir) ─────────────────────────────
    for (let m = 2; m >= 1; m--) {
      await query.exec(
        db.insert(penggajian).values({
          karyawan_id: kasirId,
          periode_bulan: monthStr(m),
          hari_kerja: 26,
          hari_hadir: m === 2 ? 25 : 24,
          gaji_pokok: 2500000,
          tunjangan: 100000,
          potongan_kasbon: m === 1 ? 250000 : 0,
          potongan_lain: 0,
          total_gaji: m === 1 ? 2350000 : 2600000,
          status: 'dibayar',
          tenant_id: tid,
        })
      )
    }

    // ── 26. Sanksi & Insentif ─────────────────────────────────────────────────
    await query.exec(
      db.insert(sanksi_insentif).values({
        karyawan_id: kasirId,
        tipe: 'insentif',
        jenis: 'bonus',
        jumlah: 150000,
        tanggal: dateStr(10),
        keterangan: 'Bonus penjualan melebihi target',
        periode_bulan: monthStr(0),
        dicatat_oleh: pemilikId,
        tenant_id: tid,
      })
    )
    await query.exec(
      db.insert(sanksi_insentif).values({
        karyawan_id: kasirId,
        tipe: 'sanksi',
        jenis: 'terlambat',
        jumlah: 15000,
        tanggal: dateStr(8),
        keterangan: 'Terlambat 15 menit',
        periode_bulan: monthStr(0),
        dicatat_oleh: pemilikId,
        tenant_id: tid,
      })
    )

    // ── 27. Evaluasi Karyawan ─────────────────────────────────────────────────
    await query.exec(
      db.insert(evaluasi_karyawan).values({
        karyawan_id: kasirId,
        periode: monthStr(1),
        nilai: 4,
        catatan: 'Kinerja baik, responsif terhadap pelanggan. Perlu tingkatkan kecepatan transaksi.',
        dinilai_oleh: pemilikId,
        tanggal: dateStr(15),
        tenant_id: tid,
      })
    )

    // ── 28. Shift Kasir (5 shift tutup + 1 buka hari ini) ────────────────────
    for (let s = 0; s < 6; s++) {
      const isBuka = s === 0
      const totalTrx = isBuka ? 3 : 8 + s
      const totalPenjualan = totalTrx * 75000
      await query.exec(
        db.insert(shift_kasir).values({
          karyawan_id: kasirId,
          tanggal: dateStr(s),
          jam_buka: '07:00',
          jam_tutup: isBuka ? null : '15:05',
          kas_awal: 500000,
          kas_fisik: isBuka ? null : 500000 + totalPenjualan * 0.6,
          kas_sistem: isBuka ? null : 500000 + totalPenjualan * 0.6,
          selisih_kas: isBuka ? null : 0,
          jumlah_transaksi: totalTrx,
          total_penjualan: totalPenjualan,
          status: isBuka ? 'buka' : 'tutup',
          tenant_id: tid,
          cabang_id: cid,
        })
      )
    }

    // ── 29. Promo (2 promo) ───────────────────────────────────────────────────
    const promoRow1 = await query.ret<{ id: number }>(
      db.insert(promo).values({
        nama: 'Diskon Beras 10%',
        deskripsi: 'Diskon 10% untuk pembelian Beras Premium min. 2 pcs',
        tipe: 'item',
        nilai: 10,
        tipe_nilai: 'persen',
        min_qty: 2,
        min_total: 0,
        berlaku_mulai: dateStr(30),
        berlaku_sampai: dateStr(-7),
        max_penggunaan: 100,
        jumlah_dipakai: 23,
        aktif: true,
        dibuat_oleh: pemilikId,
        tenant_id: tid,
      }).returning()
    )
    const promoId1 = promoRow1!.id

    await query.exec(
      db.insert(promo_target).values({
        promo_id: promoId1,
        target_tipe: 'barang',
        target_id: barangIds[0]!,
        tenant_id: tid,
      })
    )

    const promoRow2 = await query.ret<{ id: number }>(
      db.insert(promo).values({
        nama: 'Belanja > 100rb Gratis Garam',
        deskripsi: 'Beli min. Rp100.000 dapat tambahan diskon Rp5.000',
        tipe: 'total',
        nilai: 5000,
        tipe_nilai: 'rupiah',
        min_qty: 1,
        min_total: 100000,
        berlaku_mulai: dateStr(14),
        berlaku_sampai: dateStr(-14),
        max_penggunaan: null,
        jumlah_dipakai: 45,
        aktif: true,
        dibuat_oleh: pemilikId,
        tenant_id: tid,
      }).returning()
    )
    const promoId2 = promoRow2!.id

    await query.exec(
      db.insert(promo_target).values({
        promo_id: promoId2,
        target_tipe: 'kategori',
        target_id: katSembako,
        tenant_id: tid,
      })
    )

    // ── 30. Budget Operasional (bulan ini & bulan lalu) ───────────────────────
    const BUDGET_KAT = [
      { kat: 'gaji'        as const, nilai: 7500000  },
      { kat: 'sewa'        as const, nilai: 2000000  },
      { kat: 'listrik'     as const, nilai: 500000   },
      { kat: 'kemasan'     as const, nilai: 300000   },
      { kat: 'operasional' as const, nilai: 750000   },
      { kat: 'lain'        as const, nilai: 200000   },
    ]
    for (const m of [1, 0]) {
      for (const bk of BUDGET_KAT) {
        await query.exec(
          db.insert(budget_operasional).values({
            periode_bulan: monthStr(m),
            kategori: bk.kat,
            nilai_budget: bk.nilai,
            dibuat_oleh: pemilikId,
            tenant_id: tid,
          })
        )
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
    await query.exec(db.delete(budget_operasional).where(eq(budget_operasional.tenant_id, t)))
    await query.exec(db.delete(promo_target).where(eq(promo_target.tenant_id, t)))
    await query.exec(db.delete(promo).where(eq(promo.tenant_id, t)))
    await query.exec(db.delete(shift_kasir).where(eq(shift_kasir.tenant_id, t)))
    await query.exec(db.delete(evaluasi_karyawan).where(eq(evaluasi_karyawan.tenant_id, t)))
    await query.exec(db.delete(sanksi_insentif).where(eq(sanksi_insentif.tenant_id, t)))
    await query.exec(db.delete(penggajian).where(eq(penggajian.tenant_id, t)))
    await query.exec(db.delete(kasbon).where(eq(kasbon.tenant_id, t)))
    await query.exec(db.delete(absensi).where(eq(absensi.tenant_id, t)))
    await query.exec(db.delete(jadwal_kerja).where(eq(jadwal_kerja.tenant_id, t)))
    await query.exec(db.delete(tipe_shift).where(eq(tipe_shift.tenant_id, t)))
    await query.exec(db.delete(stok_opname_detail).where(eq(stok_opname_detail.tenant_id, t)))
    await query.exec(db.delete(stok_opname).where(eq(stok_opname.tenant_id, t)))
    await query.exec(db.delete(retur_supplier_detail).where(eq(retur_supplier_detail.tenant_id, t)))
    await query.exec(db.delete(retur_supplier).where(eq(retur_supplier.tenant_id, t)))
    await query.exec(db.delete(retur_penjualan_detail).where(eq(retur_penjualan_detail.tenant_id, t)))
    await query.exec(db.delete(retur_penjualan).where(eq(retur_penjualan.tenant_id, t)))
    await query.exec(db.delete(pembayaran_piutang).where(eq(pembayaran_piutang.tenant_id, t)))
    await query.exec(db.delete(piutang_pelanggan).where(eq(piutang_pelanggan.tenant_id, t)))
    await query.exec(db.delete(pembayaran_hutang).where(eq(pembayaran_hutang.tenant_id, t)))
    await query.exec(db.delete(mutasi_stok).where(eq(mutasi_stok.tenant_id, t)))
    await query.exec(db.delete(jurnal_kas).where(eq(jurnal_kas.tenant_id, t)))
    await query.exec(db.delete(penjualan_detail).where(eq(penjualan_detail.tenant_id, t)))
    await query.exec(db.delete(penjualan).where(eq(penjualan.tenant_id, t)))
    await query.exec(db.delete(po_detail).where(eq(po_detail.tenant_id, t)))
    await query.exec(db.delete(purchase_order).where(eq(purchase_order.tenant_id, t)))
    await query.exec(db.delete(barang_masuk_detail).where(eq(barang_masuk_detail.tenant_id, t)))
    await query.exec(db.delete(hutang_supplier).where(eq(hutang_supplier.tenant_id, t)))
    await query.exec(db.delete(barang_masuk).where(eq(barang_masuk.tenant_id, t)))
    await query.exec(db.delete(histori_harga_jual).where(eq(histori_harga_jual.tenant_id, t)))
    await query.exec(db.delete(histori_harga_beli).where(eq(histori_harga_beli.tenant_id, t)))
    await query.exec(db.delete(kartu_anggota).where(eq(kartu_anggota.tenant_id, t)))
    await query.exec(db.delete(barang).where(eq(barang.tenant_id, t)))
    await query.exec(db.delete(supplier).where(eq(supplier.tenant_id, t)))
    await query.exec(db.delete(pelanggan).where(eq(pelanggan.tenant_id, t)))
    await query.exec(db.delete(kas_bank).where(eq(kas_bank.tenant_id, t)))
    await query.exec(db.delete(karyawan).where(eq(karyawan.toko_id, t)))
    await query.exec(db.delete(cabang).where(eq(cabang.toko_id, t)))
    await query.exec(db.delete(toko).where(eq(toko.id, t)))
  })
}
