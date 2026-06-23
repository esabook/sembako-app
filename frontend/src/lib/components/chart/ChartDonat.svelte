<script lang="ts">
	// Donut/pie chart reusable (LayerChart). Komposisi/proporsi.
	// Warna dari palet tema (CSS var). SSR-safe (render SVG).
	import { Chart, Svg, Pie, Tooltip } from 'layerchart';
	import { scaleOrdinal } from 'd3-scale';

	type Row = Record<string, unknown>;
	let {
		data,
		label,
		nilai,
		warna = ['var(--accent)', 'var(--info)', 'var(--warn)', 'var(--danger)', 'var(--surface2)'],
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[];
		label: string;
		nilai: string;
		warna?: string[];
		tinggi?: number;
		formatNilai?: (v: number) => string;
	} = $props();

	const cScale = $derived(scaleOrdinal<string>().range(warna));
</script>

<div style="height:{tinggi}px">
	<Chart {data} x={nilai} c={label} {cScale}>
		<Svg center>
			<Pie innerRadius={-28} cornerRadius={3} />
		</Svg>
		<Tooltip.Root let:data={d}>
			<Tooltip.Header>{d[label]}</Tooltip.Header>
			<Tooltip.List>
				<Tooltip.Item label={nilai} value={formatNilai(Number(d[nilai]))} />
			</Tooltip.List>
		</Tooltip.Root>
	</Chart>
</div>
