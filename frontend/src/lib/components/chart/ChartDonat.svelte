<script lang="ts">
	type Row = Record<string, unknown>
	let {
		data,
		label,
		nilai,
		warna = ['var(--accent)', 'var(--info)', 'var(--warn)', 'var(--danger)', 'var(--surface2)'],
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[]
		label: string
		nilai: string
		warna?: string[]
		tinggi?: number
		formatNilai?: (v: number) => string
	} = $props()

	function arc(
		startAngle: number,
		endAngle: number,
		outerR: number,
		innerR: number,
		cx: number,
		cy: number
	): string {
		const toXY = (r: number, a: number) => ({
			x: cx + r * Math.cos(a - Math.PI / 2),
			y: cy + r * Math.sin(a - Math.PI / 2)
		})
		const large = endAngle - startAngle > Math.PI ? 1 : 0
		const o1 = toXY(outerR, startAngle)
		const o2 = toXY(outerR, endAngle)
		const i1 = toXY(innerR, endAngle)
		const i2 = toXY(innerR, startAngle)
		return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i1.x.toFixed(2)} ${i1.y.toFixed(2)} A${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}Z`
	}

	const slices = $derived.by(() => {
		const total = data.reduce((s, d) => s + (Number(d[nilai]) || 0), 0)
		if (total === 0) return []
		let cum = 0
		return data.map((d, i) => {
			const v = Number(d[nilai]) || 0
			const start = cum
			cum += (v / total) * 2 * Math.PI
			return { start, end: cum, v, total, color: warna[i % warna.length], lbl: String(d[label]) }
		})
	})

	const sz = $derived(Math.min(tinggi, 180))
	const cx = $derived(sz / 2)
	const cy = $derived(sz / 2)
	const outerR = $derived(sz / 2 - 4)
	const innerR = $derived(outerR - 32)
</script>

{#if slices.length > 0}
	<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
		<svg width={sz} height={sz} style="flex-shrink:0;display:block">
			{#each slices as s}
				<path d={arc(s.start, s.end, outerR, innerR, cx, cy)} fill={s.color}>
					<title>{s.lbl}: {formatNilai(s.v)}</title>
				</path>
			{/each}
		</svg>
		<div style="display:flex;flex-direction:column;gap:.35rem;font-size:.72rem">
			{#each slices as s}
				<div style="display:flex;align-items:center;gap:.4rem">
					<span style="width:10px;height:10px;border-radius:2px;background:{s.color};flex-shrink:0"></span>
					<span style="color:var(--text-dim)">{s.lbl}</span>
					<span style="color:var(--text);font-weight:600;margin-left:.25rem"
						>{Math.round((s.v / s.total) * 100)}%</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
