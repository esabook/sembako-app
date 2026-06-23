<script lang="ts">
	// Bar chart reusable (LayerChart). Perbandingan kategori.
	// Warna ikut tema via CSS var --accent. SSR-safe (render SVG).
	import { Chart, Svg, Bars, Axis, Tooltip, Highlight } from 'layerchart';
	import { scaleBand } from 'd3-scale';

	type Row = Record<string, unknown>;
	let {
		data,
		x,
		y,
		warna = 'var(--accent)',
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[];
		x: string;
		y: string;
		warna?: string;
		tinggi?: number;
		formatNilai?: (v: number) => string;
	} = $props();
</script>

<div style="height:{tinggi}px">
	<Chart
		{data}
		{x}
		{y}
		xScale={scaleBand().padding(0.2)}
		yDomain={[0, null]}
		yNice
		padding={{ left: 48, bottom: 24, top: 8, right: 8 }}
		tooltip={{ mode: 'band' }}
	>
		<Svg>
			<Axis placement="left" grid rule format={(v) => formatNilai(Number(v))} />
			<Axis placement="bottom" rule />
			<Bars radius={3} fill={warna} strokeWidth={0} />
			<Highlight area />
		</Svg>
		<Tooltip.Root let:data={d}>
			<Tooltip.Header>{d[x]}</Tooltip.Header>
			<Tooltip.List>
				<Tooltip.Item label={y} value={formatNilai(Number(d[y]))} />
			</Tooltip.List>
		</Tooltip.Root>
	</Chart>
</div>
