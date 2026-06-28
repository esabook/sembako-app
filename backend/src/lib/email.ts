// Email sender — STUB (Fase A). Hanya log link verifikasi/reset ke console.
// Sender asli (Cloudflare Email Sending, binding `send_email`) diaktifkan saat
// domain custom siap — pages.dev/workers.dev tak bisa kirim email (tak ada
// kontrol DNS DKIM/SPF). Lihat todo/auth/BACKLOG.md (P1/P3).
//
// OAuth Google TIDAK butuh sender ini → Fase B OAuth tetap jalan walau stub.

type AuthEmail = {
  to: string
  subject: string
  url?: string // link verifikasi/reset bila ada
  text: string
}

export async function sendAuthEmail({ to, subject, url, text }: AuthEmail): Promise<void> {
  console.log(
    `[email-stub] to=${to} subject="${subject}"${url ? ` url=${url}` : ''}\n${text}`,
  )
}
