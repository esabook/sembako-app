// ── B2: Hook Registry ──────────────────────────────────────────────────────
// Daftarkan semua built-in handler ke event bus.
// Panggil initHooks() SEKALI saat startup (di index.ts).
//
// B4 POC — before:absensi.masuk → cek SOP checklist aktif
// Built-in — after:checkout → cek barang stok vs minimum → notifikasi

import { bus } from './event-bus.ts'
import { db, sqlite } from '../db/index.ts'
import { sop_rule, sop_instance, barang, notifikasi_config, notifikasi_log } from '../db/schema.ts'
import { eq, and, sql } from 'drizzle-orm'

export function initHooks(): void {
  // ── B4: before:absensi.masuk — cek checklist SOP aktif ──────────────────
  bus.registerBefore('absensi.masuk', async ({ karyawan_id, tanggal }) => {
    const rules = db
      .select()
      .from(sop_rule)
      .where(
        and(
          eq(sop_rule.event_name, 'before:absensi.masuk'),
          eq(sop_rule.tipe, 'checklist'),
          eq(sop_rule.is_active, true),
        ),
      )
      .orderBy(sop_rule.urutan)
      .all()

    if (rules.length === 0) return { ok: true }

    for (const rule of rules) {
      // Cek apakah checklist hari ini sudah selesai untuk karyawan ini
      const done = db
        .select({ id: sop_instance.id })
        .from(sop_instance)
        .where(
          and(
            eq(sop_instance.rule_id, rule.id),
            eq(sop_instance.karyawan_id, karyawan_id),
            sql`date(${sop_instance.dibuat_at}) = ${tanggal}`,
            eq(sop_instance.status, 'selesai'),
          ),
        )
        .get()

      if (done) continue // rule ini sudah OK, cek rule berikutnya

      // Cari atau buat instance pending
      let instance = db
        .select()
        .from(sop_instance)
        .where(
          and(
            eq(sop_instance.rule_id, rule.id),
            eq(sop_instance.karyawan_id, karyawan_id),
            sql`date(${sop_instance.dibuat_at}) = ${tanggal}`,
            eq(sop_instance.status, 'pending'),
          ),
        )
        .get()

      if (!instance) {
        instance = db
          .insert(sop_instance)
          .values({
            rule_id: rule.id,
            karyawan_id,
            status: 'pending',
            payload_json: { karyawan_id, tanggal },
          })
          .returning()
          .get()
      }

      return {
        ok: false,
        reason: 'checklist_required',
        data: {
          instance_id: instance.id,
          rule_id: rule.id,
          nama: rule.nama,
          deskripsi: rule.deskripsi,
          items: rule.config_json ?? [],
        },
      }
    }

    return { ok: true }
  })

  // ── after:checkout — cek stok minimum semua item terjual ─────────────────
  bus.register('checkout', async ({ items }) => {
    const cfg = db
      .select()
      .from(notifikasi_config)
      .where(eq(notifikasi_config.jenis, 'stok_kritis'))
      .get()

    if (!cfg?.aktif) return

    for (const item of items) {
      const br = db
        .select({ nama_barang: barang.nama_barang, stok_sekarang: barang.stok_sekarang, stok_minimum: barang.stok_minimum })
        .from(barang)
        .where(eq(barang.id, item.barang_id))
        .get()

      if (!br || br.stok_minimum <= 0) continue
      if (br.stok_sekarang > br.stok_minimum) continue

      const sudahAda = db
        .select({ id: notifikasi_log.id })
        .from(notifikasi_log)
        .where(
          and(
            eq(notifikasi_log.jenis, 'stok_kritis'),
            eq(notifikasi_log.referensi_tipe, 'barang'),
            eq(notifikasi_log.referensi_id, item.barang_id),
            eq(notifikasi_log.status, 'pending'),
          ),
        )
        .get()

      if (sudahAda) continue

      db.insert(notifikasi_log).values({
        jenis: 'stok_kritis',
        channel: cfg.channel === 'wa' ? 'wa' : 'dashboard',
        pesan: `Stok ${br.nama_barang} kritis: ${br.stok_sekarang} (min ${br.stok_minimum})`,
        status: 'pending',
        referensi_tipe: 'barang',
        referensi_id: item.barang_id,
      }).run()
    }
  })
}
