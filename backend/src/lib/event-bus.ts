// ── B1: Event Bus ─────────────────────────────────────────────────────────
// Typed pub/sub ringan. Tiga slot per event:
//   before → blocking: handler bisa tolak aksi (return { ok: false })
//   on     → non-blocking: fire-and-forget setelah aksi berhasil
//
// Penggunaan di route:
//   const r = await bus.emitBefore('absensi.masuk', { karyawan_id, tanggal })
//   if (!r.ok) return c.json({ success: false, error: r.reason, data: r.data }, 428)
//   ... lakukan aksi ...
//   bus.emit('absensi.masuk', { absensi_id, karyawan_id, tanggal })

export type SopEventMap = {
  'absensi.masuk': { karyawan_id: number; tanggal: string }
  'absensi.pulang': { absensi_id: number; karyawan_id: number; tanggal: string }
  'checkout': {
    penjualan_id: number
    total: number
    kasir_id: number
    items: { barang_id: number; jumlah: number }[]
  }
  'barang_masuk': { barang_masuk_id: number; supplier_id: number }
  'stok.kritis': { barang_id: number; nama: string; stok: number; minimum: number }
  'approval.disetujui': { approval_id: number; referensi_tipe: string; referensi_id: number; diproses_oleh: number }
  'approval.ditolak': { approval_id: number; referensi_tipe: string; referensi_id: number; diproses_oleh: number }
  'notifikasi.wa': { pesan: string; penerima: string; jenis: string }
}

export type BeforeResult =
  | { ok: true }
  | { ok: false; reason: string; data?: unknown }

type BeforeHandler<T> = (payload: T) => Promise<BeforeResult> | BeforeResult
type OnHandler<T> = (payload: T) => Promise<void> | void

class EventBus {
  private before = new Map<string, BeforeHandler<unknown>[]>()
  private on = new Map<string, OnHandler<unknown>[]>()
  private pending: Promise<void>[] = []

  registerBefore<K extends keyof SopEventMap>(
    event: K,
    handler: BeforeHandler<SopEventMap[K]>,
  ): void {
    const list = this.before.get(event) ?? []
    list.push(handler as BeforeHandler<unknown>)
    this.before.set(event, list)
  }

  register<K extends keyof SopEventMap>(
    event: K,
    handler: OnHandler<SopEventMap[K]>,
  ): void {
    const list = this.on.get(event) ?? []
    list.push(handler as OnHandler<unknown>)
    this.on.set(event, list)
  }

  async emitBefore<K extends keyof SopEventMap>(
    event: K,
    payload: SopEventMap[K],
  ): Promise<BeforeResult> {
    const handlers = this.before.get(event) ?? []
    for (const h of handlers) {
      const result = await h(payload)
      if (!result.ok) return result
    }
    return { ok: true }
  }

  // Fire-and-forget: error di handler tidak propagate ke caller.
  // Promise dikumpulkan ke pending[] — drain via flushPending(waitUntil) di middleware.
  emit<K extends keyof SopEventMap>(event: K, payload: SopEventMap[K]): void {
    const handlers = this.on.get(event) ?? []
    for (const h of handlers) {
      const p = Promise.resolve(h(payload)).catch((err) => {
        console.error(`[event-bus] handler error on '${event}':`, err)
      }) as Promise<void>
      this.pending.push(p)
    }
  }

  // Drain pending promises ke executionCtx.waitUntil agar tidak di-cut off saat request selesai.
  flushPending(waitUntil: (p: Promise<void>) => void): void {
    const toFlush = this.pending.splice(0)
    for (const p of toFlush) waitUntil(p)
  }
}

export const bus = new EventBus()
