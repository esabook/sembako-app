import type { PermintaanRow, KomplainRow } from './crm.types.js'

export const STATUS_P_COLOR: Record<PermintaanRow['status'], string> = {
  menunggu: 'var(--warn)', tersedia: 'var(--accent)', tidak_tersedia: 'var(--danger)',
}

export const KATEGORI_LABEL: Record<string, string> = {
  kualitas_barang: 'Kualitas Barang', pelayanan: 'Pelayanan',
  harga: 'Harga', pengiriman: 'Pengiriman', lainnya: 'Lainnya',
}

export const STATUS_K_COLOR: Record<KomplainRow['status'], string> = {
  masuk: 'var(--warn)', diproses: 'var(--info)', selesai: 'var(--accent)', ditolak: 'var(--danger)',
}
