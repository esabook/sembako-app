// ── B5: Approval-Gate Utility ─────────────────────────────────────────────
// Pakai dari route yang butuh alur pengajuan → setujui/tolak:
//   const row = mintaApproval({ referensi_tipe: 'kasbon', referensi_id: id, diminta_oleh: user.id })
//   const current = getApproval('kasbon', id)

import { db } from '../db/index.ts'
import { approval } from '../db/schema.ts'
import { and, eq } from 'drizzle-orm'

export function mintaApproval({
  referensi_tipe,
  referensi_id,
  diminta_oleh,
  catatan_pengaju,
}: {
  referensi_tipe: string
  referensi_id: number
  diminta_oleh: number
  catatan_pengaju?: string
}) {
  return db
    .insert(approval)
    .values({ referensi_tipe, referensi_id, diminta_oleh, catatan_pengaju })
    .returning()
    .get()
}

export function getApproval(referensi_tipe: string, referensi_id: number) {
  return (
    db
      .select()
      .from(approval)
      .where(
        and(
          eq(approval.referensi_tipe, referensi_tipe),
          eq(approval.referensi_id, referensi_id),
        ),
      )
      .orderBy(approval.id)
      .get() ?? null
  )
}
