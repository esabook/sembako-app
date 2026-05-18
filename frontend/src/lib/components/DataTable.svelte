<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';

	export type Column = {
		key: string;
		label: string;
		width?: number;
		minWidth?: number;
		sortable?: boolean;
		align?: 'left' | 'right' | 'center';
	};

	let {
		columns,
		sortKey = $bindable(''),
		sortDir = $bindable<'asc' | 'desc'>('asc'),
		maxRows = 7,
		emptyText = 'Tidak ada data.',
		rowCount = 0,
		body,
	}: {
		columns: Column[];
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		maxRows?: number;
		emptyText?: string;
		rowCount?: number;
		body: Snippet;
	} = $props();

	const ROW_HEIGHT = 40;

	let colWidths = $state<(number | null)[]>(untrack(() => columns.map((c) => c.width ?? null)));
	let resizing = $state<{ idx: number; startX: number; startW: number } | null>(null);

	function onResizeStart(e: MouseEvent, idx: number) {
		e.preventDefault();
		e.stopPropagation();
		const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
		resizing = { idx, startX: e.clientX, startW: th.getBoundingClientRect().width };
	}

	function onMouseMove(e: MouseEvent) {
		if (!resizing) return;
		const min = columns[resizing.idx].minWidth ?? 60;
		colWidths[resizing.idx] = Math.max(min, resizing.startW + e.clientX - resizing.startX);
	}

	function onMouseUp() {
		resizing = null;
	}

	function clickSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div class="rounded border" style="border-color:var(--border);overflow:hidden">
	<div style="max-height:{maxRows * ROW_HEIGHT}px;overflow-y:auto;overflow-x:auto">
		<table class="w-full text-sm" style="border-collapse:separate;border-spacing:0;table-layout:fixed">
			<colgroup>
				{#each colWidths as w}
					<col style={w !== null ? `width:${w}px` : undefined} />
				{/each}
			</colgroup>
			<thead>
				<tr>
					{#each columns as col, i}
						{@const sortable = col.sortable !== false && Boolean(col.key)}
						<th
							style="
								text-align:{col.align ?? 'left'};
								padding:8px 12px;
								font-weight:500;
								color:var(--text-dim);
								background:var(--surface2);
								border-bottom:1px solid var(--border);
								{i < columns.length - 1 ? 'border-right:1px solid var(--border);' : ''}
								position:sticky;
								top:0;
								z-index:2;
								user-select:none;
								white-space:nowrap;
								cursor:{sortable ? 'pointer' : 'default'};
							"
							onclick={sortable ? () => clickSort(col.key) : undefined}
						>
							{col.label}
							{#if sortable}
								<span style="margin-left:4px;font-size:10px;opacity:{sortKey === col.key ? 0.8 : 0.3}">
									{sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
								</span>
							{/if}
							{#if i < columns.length - 1}
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
								<div
									role="separator"
									aria-orientation="vertical"
									style="
										position:absolute;top:0;right:-3px;width:6px;height:100%;
										cursor:col-resize;z-index:3;
										background:{resizing?.idx === i ? 'var(--accent)' : 'transparent'};
									"
									onmousedown={(e) => onResizeStart(e, i)}
									onclick={(e) => e.stopPropagation()}
									onkeydown={() => {}}
								></div>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if rowCount === 0}
					<tr>
						<td
							colspan={columns.length}
							class="px-3 py-4 text-center text-xs"
							style="color:var(--text-dim)"
						>
							{emptyText}
						</td>
					</tr>
				{/if}
				{@render body()}
			</tbody>
		</table>
	</div>
</div>
