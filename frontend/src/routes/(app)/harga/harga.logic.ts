export function rp(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

export function pct(n: number | null) {
  if (n === null) return '-'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

export function marginColor(n: number | null): string {
  if (n === null) return 'color:var(--text-dim)'
  if (n < 5) return 'color:var(--danger)'
  if (n < 15) return 'color:var(--warn)'
  return 'color:var(--accent)'
}
