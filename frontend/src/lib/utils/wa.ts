export function bukaWhatsApp(nomorHP: string, pesan: string): void {
  const nomor = nomorHP.replace(/\D/g, '')
  const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`
  window.open(url, '_blank')
}

export function renderTemplate(teks: string, data: Record<string, string>): string {
  return teks.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}
