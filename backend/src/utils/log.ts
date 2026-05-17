import { db } from '../db/index.ts'
import { log_aktivitas } from '../db/schema.ts'

export function catatLog(
  karyawan_id: number,
  aksi: string,
  modul: string,
  referensi_id?: number | null,
  detail?: Record<string, unknown> | null,
) {
  try {
    db.insert(log_aktivitas).values({
      karyawan_id,
      aksi,
      modul,
      referensi_id: referensi_id ?? null,
      detail_json: detail ?? null,
    }).run()
  } catch {
    // log gagal tidak boleh menghentikan operasi utama
  }
}
