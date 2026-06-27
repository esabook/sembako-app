<script lang="ts">
	type Row = Record<string, unknown>
	let {
		data,
		x,
		y,
		warna = 'var(--accent)',
		area = true,
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[]
		x: string
		y: string
		warna?: string
		area?: boolean
		tinggi?: number
		formatNilai?: (v: number) => string
	} = $props()

	function shortNum(v: number): string {
		if (v >= 1e9) return (v / 1e9).toFixed(1) + 'M'
		if (v >= 1e6) return (v / 1e6).toFixed(1) + 'jt'
		if (v >= 1e3) return (v / 1e3).toFixed(0) + 'rb'
		return String(Math.round(v))
	}

	const L = 44, B = 28, T = 8, R = 8

	const pts = $derived.by(() => {
		const vals = data.map(d => Number(d[y]) || 0)
		const mx = Math.max(...vals, 1)
		const svgW = Math.max(data.length * 40, 200)
		const iW = svgW - L - R
		const iH = tinggi - T - B
		const step = iW / Math.max(data.length - 1, 1)
		const dots = vals.map((v, i) => ({
			x: L + i * step,
			y: T + iH - (v / mx) * iH,
			v,
			lbl: String(data[i][x])
		}))
		const points = dots.map(d => `${d.x},${d.y}`).join(' ')
		const last = dots[dots.length - 1] ?? { x: L, y: T + iH }
		const areaPath =
			`M${dots[0]?.x ?? L},${T + iH} ` +
			dots.map(d => `L${d.x},${d.y}`).join(' ') +
			` L${last.x},${T + iH}Z`
		return { points, areaPath, dots, mx, svgW, iH }
	})
</script>

{#if data.length > 0}
	{@const { points, areaPath, dots, mx, svgW, iH } = pts}
	{@const tks = [0, 0.25, 0.5, 0.75, 1].map(f => mx * f)}
	<div style="overflow-x:auto;width:100%">
		<svg width={svgW} height={tinggi} style="display:block">
			{#each tks as tk}
				{@const yy = T + iH - (tk / mx) * iH}
				<line x1={L} x2={svgW - R} y1={yy} y2={yy} stroke="var(--border)" stroke-width="1" />
				<text x={L - 3} y={yy + 3} text-anchor="end" fill="var(--text-dim)" font-size="9"
					>{shortNum(tk)}</text>
			{/each}
			{#if area}
				<path d={areaPath} fill={warna} opacity="0.15" />
			{/if}
			<polyline {points} fill="none" stroke={warna} stroke-width="2" stroke-linejoin="round" />
			{#each dots as d}
				<circle cx={d.x} cy={d.y} r="3" fill={warna}>
					<title>{d.lbl}: {formatNilai(d.v)}</title>
				</circle>
				<text
					x={d.x}
					y={tinggi - 4}
					text-anchor="middle"
					fill="var(--text-dim)"
					font-size="9"
					style="font-family:inherit">{d.lbl.slice(0, 8)}</text>
			{/each}
			<line x1={L} x2={L} y1={T} y2={T + iH} stroke="var(--border)" stroke-width="1" />
			<line x1={L} x2={svgW - R} y1={T + iH} y2={T + iH} stroke="var(--border)" stroke-width="1" />
		</svg>
	</div>
{/if}
