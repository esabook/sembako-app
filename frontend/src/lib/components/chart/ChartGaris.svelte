<script lang="ts">
	// Line/area chart reusable (LayerChart). Tren waktu.
	// Warna ikut tema via CSS var. SSR-safe (render SVG).
	import { Chart, Svg, Spline, Area, Axis, Tooltip, Highlight, LinearGradient } from 'layerchart';
	import { scalePoint } from 'd3-scale';

	type Row = Record<string, unknown>;
	let {
		data,
		x,
		y,
		warna = 'var(--accent)',
		area = true,
		tinggi = 220,
		formatNilai = (v: number) => String(v)
	}: {
		data: Row[];
		x: string;
		y: string;
		warna?: string;
		area?: boolean;
		tinggi?: number;
		formatNilai?: (v: number) => string;
	} = $props();
</script>

<div style="height:{tinggi}px">
	<Chart
		{data}
		{x}
		{y}
		xScale={scalePoint()}
		yDomain={[0, null]}
		yNice
		padding={{ left: 48, bottom: 24, top: 8, right: 8 }}
		tooltip={{ mode: 'bisect-x' }}
	>
		<Svg>
			<Axis placement="left" grid rule format={(v) => formatNilai(Number(v))} />
			<Axis placement="bottom" rule />
			{#if area}
				<LinearGradient stops={[warna, 'transparent']} vertical let:gradient>
					<Area line={{ stroke: warna, strokeWidth: 2 }} fill={gradient} />
				</LinearGradient>
			{:else}
				<Spline stroke={warna} strokeWidth={2} />
			{/if}
			<Highlight points lines />
		</Svg>
		<Tooltip.Root let:data={d}>
			<Tooltip.Header>{d[x]}</Tooltip.Header>
			<Tooltip.List>
				<Tooltip.Item label={y} value={formatNilai(Number(d[y]))} />
			</Tooltip.List>
		</Tooltip.Root>
	</Chart>
</div>
