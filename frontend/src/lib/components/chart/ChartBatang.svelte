<script lang="ts">
	type Row = Record<string, unknown>
	let {
		data,
		x,
		y,
		warna = 'var(--accent)',
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[]
		x: string
		y: string
		warna?: string
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
</script>

{#if data.length > 0}
	{@const vals = data.map(d => Number(d[y]) || 0)}
	{@const mx = Math.max(...vals, 1)}
	{@const colW = Math.max(36, Math.ceil(240 / data.length))}
	{@const svgW = data.length * colW + L + R}
	{@const iH = tinggi - T - B}
	{@const bw = colW * 0.6}
	{@const tks = [0, 0.25, 0.5, 0.75, 1].map(f => mx * f)}
	<div style="overflow-x:auto;width:100%">
		<svg width={svgW} height={tinggi} style="display:block">
			{#each tks as tk}
				{@const yy = T + iH - (tk / mx) * iH}
				<line x1={L} x2={svgW - R} y1={yy} y2={yy} stroke="var(--border)" stroke-width="1" />
				<text x={L - 3} y={yy + 3} text-anchor="end" fill="var(--text-dim)" font-size="9"
					>{shortNum(tk)}</text>
			{/each}
			{#each data as row, i}
				{@const v = vals[i]}
				{@const bx = L + i * colW + (colW - bw) / 2}
				{@const bh = Math.max((v / mx) * iH, 1)}
				{@const by = T + iH - bh}
				<rect x={bx} y={by} width={bw} height={bh} fill={warna} rx="2">
					<title>{String(row[x])}: {formatNilai(v)}</title>
				</rect>
				<text
					x={bx + bw / 2}
					y={tinggi - 4}
					text-anchor="middle"
					fill="var(--text-dim)"
					font-size="9"
					style="font-family:inherit">{String(row[x]).slice(0, 12)}</text>
			{/each}
			<line x1={L} x2={L} y1={T} y2={T + iH} stroke="var(--border)" stroke-width="1" />
			<line
				x1={L}
				x2={svgW - R}
				y1={T + iH}
				y2={T + iH}
				stroke="var(--border)"
				stroke-width="1"
			/>
		</svg>
	</div>
{/if}
