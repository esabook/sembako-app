<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';

	import {
		TEMPLATES,
		MONTH_NAMES,
		WEEK_NAMES,
		toISO,
		isoToDisplay,
		parseDisplay,
		calcTemplateRange,
		maskDate,
		getMonthDays,
		getYearGrid
	} from './daterangepicker.js';

	let {
		from = $bindable(''),
		to = $bindable(''),
		selectedTemplate = $bindable<string | null>(null),
		onchange,
		onclose
	}: {
		from?: string;
		to?: string;
		selectedTemplate?: string | null;
		onchange?: () => void;
		onclose: () => void;
	} = $props();

	let viewMode = $state<'monthly' | 'yearly'>('monthly');
	let viewDate = $state(from ? new Date(from + 'T00:00:00') : new Date());
	let inputFrom = $state(isoToDisplay(from));
	let inputTo = $state(isoToDisplay(to));
	let inputError = $state('');
	let selecting = $state<'start' | 'end'>('start');
	let hoverIso = $state('');

	let isCustom = $derived(selectedTemplate === null);
	let todayIso = $derived(toISO(new Date()));
	let nowYear = $derived(new Date().getFullYear());
	let monthDays = $derived(getMonthDays(viewDate));
	let yearGrid = $derived(getYearGrid(nowYear));
	let viewLabel = $derived(
		viewMode === 'monthly'
			? `${MONTH_NAMES[viewDate.getMonth()].slice(0, 3)} ${viewDate.getFullYear()}`
			: `${nowYear - 23} – ${nowYear}`
	);

	function selectTemplate(label: string) {
		const range = calcTemplateRange(label);
		from = range.from;
		to = range.to;
		selectedTemplate = label;
		inputFrom = isoToDisplay(from);
		inputTo = isoToDisplay(to);
		inputError = '';
		selecting = 'start';
		onchange?.();
		onclose();
	}

	function liveValidate() {
		if (inputFrom.length < 10 || inputTo.length < 10) {
			inputError = '';
			return;
		}
		const f = parseDisplay(inputFrom);
		const t = parseDisplay(inputTo);
		if (!f || !t) {
			inputError = 'date out of bounds';
			return;
		}
		if (f > t) {
			inputError = 'date misordered';
			return;
		}
		inputError = '';
		from = f;
		to = t;
		selectedTemplate = null;
		viewDate = new Date(f + 'T00:00:00');
	}

	function onInputFrom(e: Event) {
		inputFrom = maskDate((e.target as HTMLInputElement).value);
		liveValidate();
	}

	function onInputTo(e: Event) {
		inputTo = maskDate((e.target as HTMLInputElement).value);
		liveValidate();
	}

	function applyCustom() {
		const f = parseDisplay(inputFrom);
		const t = parseDisplay(inputTo);
		if (!f || !t) {
			inputError = 'date out of bounds';
			return;
		}
		if (f > t) {
			inputError = 'date misordered';
			return;
		}
		inputError = '';
		from = f;
		to = t;
		onchange?.();
		onclose();
	}

	function handleDayClick(iso: string) {
		selectedTemplate = null;
		if (selecting === 'start') {
			from = iso;
			to = '';
			inputFrom = isoToDisplay(iso);
			inputTo = '';
			inputError = '';
			selecting = 'end';
		} else {
			let f = from,
				t = iso;
			if (iso < from) {
				f = iso;
				t = from;
			}
			from = f;
			to = t;
			inputFrom = isoToDisplay(f);
			inputTo = isoToDisplay(t);
			inputError = '';
			selecting = 'start';
		}
	}

	function handleYearClick(year: number) {
		viewDate = new Date(year, 0, 1);
		viewMode = 'monthly';
	}

	function isSelected(iso: string): boolean {
		return iso === from || (!!to && iso === to);
	}

	function isBetween(iso: string): boolean {
		if (!from || !to) return false;
		return iso > from && iso < to;
	}

	function isHoverBetween(iso: string): boolean {
		if (selecting !== 'end' || !from || !hoverIso) return false;
		const lo = from < hoverIso ? from : hoverIso;
		const hi = from < hoverIso ? hoverIso : from;
		return iso > lo && iso < hi;
	}

	function isYearSelected(year: number): boolean {
		const y = String(year);
		return (!!from && from.startsWith(y)) || (!!to && to.startsWith(y));
	}

	function isYearBetween(year: number): boolean {
		if (!from || !to) return false;
		return year > parseInt(from.slice(0, 4)) && year < parseInt(to.slice(0, 4));
	}

	function navMonth(delta: number) {
		const d = new Date(viewDate);
		d.setMonth(d.getMonth() + delta);
		viewDate = d;
	}

	function autoPosition(node: Element) {
		requestAnimationFrame(() => {
			if (window.innerWidth < 640) return;
			const el = node as HTMLElement;
			const rect = el.getBoundingClientRect();
			if (rect.right > window.innerWidth) {
				el.style.left = 'auto';
				el.style.right = '0';
			}
		});
	}
</script>

<div
	class="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:pointer-events-auto sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-1 sm:items-start"
	{@attach autoPosition}
>
	<div
		class="pointer-events-auto max-h-[90dvh] w-fit max-w-[95vw] overflow-y-auto rounded-box border border-base-300 bg-base-100 shadow-xl sm:max-h-none sm:max-w-none sm:overflow-hidden"
	>
		<!-- row1 -->
		<div class="flex flex-col sm:flex-row">
			<!-- col1: template list -->
			<div class="flex min-w-[130px] flex-col border-r border-base-300 py-1">
				{#each TEMPLATES as t (t)}
					<button
						type="button"
						class="px-2 py-1.5 text-left text-xs transition-colors
							{selectedTemplate === t
							? 'bg-base-200 font-semibold text-accent'
							: 'text-base-content hover:bg-base-200'}"
						onclick={() => selectTemplate(t)}
					>
						{t}
					</button>
				{/each}
			</div>

			<!-- col2: calendar panel -->
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<!-- col2row1: caption + masked inputs + error -->
				<div class="flex flex-col gap-1">
					<span class="px-2 text-[.7rem] font-semibold tracking-wider text-accent">
						{selectedTemplate ?? 'Custom'}
					</span>
					<div class="flex flex-wrap items-center gap-1.5 px-2">
						<input
							type="text"
							class="input-bordered input input-xs w-[5rem] px-0 text-center"
							maxlength="10"
							placeholder="dd/MM/yyyy"
							value={inputFrom}
							oninput={onInputFrom}
						/>
						<span class="text-xs text-base-content/40">–</span>
						<input
							type="text"
							class="input-bordered input input-xs w-[5rem] px-0 text-center"
							maxlength="10"
							placeholder="dd/MM/yyyy"
							value={inputTo}
							oninput={onInputTo}
						/>
					</div>
					{#if inputError}
						<p class="px-2 text-[0.7rem] text-error">🛈 {inputError}</p>
					{/if}
				</div>

				<!-- col2row2: view toggle + prev/next -->
				<div class="flex items-center justify-between px-2">
					<button
						type="button"
						class="btn rounded-full px-2 text-xs font-medium btn-xs"
						onclick={() => (viewMode = viewMode === 'monthly' ? 'yearly' : 'monthly')}
					>
						{viewLabel}
						{#if viewMode === 'monthly'}
							<ChevronDown size="1rem" aria-hidden="true" />
						{:else}
							<ChevronUp size="1rem" aria-hidden="true" />
						{/if}
					</button>
					{#if viewMode === 'monthly'}
						<div class="flex">
							<button
								type="button"
								class="btn btn-square btn-ghost btn-xs"
								onclick={() => navMonth(-1)}
								aria-label="Bulan sebelumnya"
							>
								<ChevronLeft size="1rem" aria-hidden="true" />
							</button>
							<button
								type="button"
								class="btn btn-square btn-ghost btn-xs"
								onclick={() => navMonth(1)}
								aria-label="Bulan berikutnya"
							>
								<ChevronRight size="1rem" aria-hidden="true" />
							</button>
						</div>
					{/if}
				</div>

				<!-- col2row3: calendar grid -->
				{#if viewMode === 'monthly'}
					<!-- week names -->
					<div class="border-base-400 grid grid-cols-[repeat(7,2rem)] border-b py-1 text-center">
						{#each WEEK_NAMES as w (w)}
							<div class="text-[.7rem] text-base-content/50">{w}</div>
						{/each}
					</div>
					<!-- month name -->
					<div class="mb-0.5 px-2 text-xs font-semibold text-base-content/70">
						{MONTH_NAMES[viewDate.getMonth()]}
					</div>
					<!-- day grid 7×5 -->
					<div class="grid grid-cols-[repeat(7,2rem)]">
						{#each monthDays as day (day.iso)}
							{@const sel = isSelected(day.iso)}
							{@const bet = isBetween(day.iso) || isHoverBetween(day.iso)}
							{@const cur = day.iso === todayIso}
							{@const isStart = day.iso === from && !!to && from !== to}
							{@const isEnd = !!to && day.iso === to && from !== to}
							<div class="relative h-8 w-8">
								{#if isStart}
									<div class="absolute top-0 right-0 h-full w-1/2 bg-accent/20"></div>
								{:else if isEnd}
									<div class="absolute top-0 left-0 h-full w-1/2 bg-accent/20"></div>
								{:else if bet}
									<div class="absolute inset-0 bg-accent/20"></div>
								{/if}
								<button
									type="button"
									class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors select-none
										{!day.current ? 'text-base-content/25' : ''}
										{sel ? 'bg-accent text-accent-content' : ''}
										{cur && !sel ? 'border border-accent' : ''}
										{!sel && !bet ? 'hover:bg-base-200' : ''}"
									onclick={() => handleDayClick(day.iso)}
									onmouseenter={() => (hoverIso = day.iso)}
									onmouseleave={() => (hoverIso = '')}
								>
									{parseInt(day.iso.slice(8))}
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<!-- yearly grid 6×4 = 24 years -->
					<div class="grid grid-cols-[repeat(4,3rem)] gap-1 px-2">
						{#each yearGrid as year (year)}
							{@const sel = isYearSelected(year)}
							{@const bet = isYearBetween(year)}
							{@const cur = year === nowYear}
							<button
								type="button"
								class="rounded-full px-1 py-1 text-center text-xs transition-colors
									{sel ? 'bg-accent text-accent-content' : ''}
									{bet && !sel ? 'bg-accent/20' : ''}
									{cur && !sel ? 'border border-accent' : ''}
									{!sel && !bet ? 'hover:bg-base-200' : ''}"
								onclick={() => handleYearClick(year)}
							>
								{year}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- row2: custom apply — only when no template active -->
		{#if isCustom}
			<div class="flex items-center justify-between border-t border-base-300 px-3 py-2">
				<span class="text-xs text-base-content/60">Custom date range</span>
				<button type="button" class="btn rounded-full btn-sm btn-accent" onclick={applyCustom}>
					Apply
				</button>
			</div>
		{/if}
	</div>
</div>
