export function bukaWhatsApp(nomorHP: string | null | undefined, pesan: string): void {
  const nomor = (nomorHP ?? '').replace(/\D/g, '')
  // nomor kosong → WA buka pilih penerima sendiri (wa.me/?text=...)
  const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`
  window.open(url, '_blank')
}

export function renderTemplate(teks: string, data: Record<string, string>): string {
  return teks.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}
