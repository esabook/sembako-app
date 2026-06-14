<script lang="ts">
	import { parseDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import type { DateRange, Month } from 'bits-ui';
	import { RangeCalendar } from 'bits-ui';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils/cn.js';

	let {
		from = $bindable(''),
		to = $bindable(''),
		label = null,
		placeholder = 'Pilih rentang tanggal',
		disabled = false
	}: {
		from?: string;
		to?: string;
		label?: string | null;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	function toDateValue(iso: string): DateValue | undefined {
		if (!iso) return undefined;
		try {
			return parseDate(iso);
		} catch {
			return undefined;
		}
	}

	function toIso(dv: DateValue | undefined): string {
		if (!dv) return '';
		return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`;
	}

	let rangeValue = $state<DateRange>({ start: toDateValue(from), end: toDateValue(to) });

	$effect(() => {
		rangeValue = { start: toDateValue(from), end: toDateValue(to) };
	});

	function onSelect(r: DateRange | undefined) {
		if (!r) return;
		rangeValue = r;
		from = toIso(r.start);
		to = toIso(r.end);
	}

	function formatDisplay(f: string, t: string): string {
		function fmt(iso: string) {
			if (!iso) return '...';
			try {
				return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				});
			} catch {
				return iso;
			}
		}
		if (!f && !t) return '';
		return `${fmt(f)} — ${fmt(t)}`;
	}

	let open = $state(false);
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<span class="text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<Popover bind:open>
		<PopoverTrigger
			{disabled}
			class="flex w-full items-center justify-between rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-50"
			style="background:var(--bg);border-color:var(--border);color:{from || to ? 'var(--text)' : 'var(--text-dim)'};--tw-ring-color:var(--accent)"
		>
			<span>{from || to ? formatDisplay(from, to) : placeholder}</span>
			<span class="text-xs" style="color:var(--text-dim)">📅</span>
		</PopoverTrigger>
		<PopoverContent class="w-auto p-0" align="start">
			<RangeCalendar.Root
				locale="id-ID"
				value={rangeValue}
				onValueChange={(r: DateRange) => {
					onSelect(r);
					if (r?.start && r?.end) open = false;
				}}
				class={cn(
					'p-3 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(8)] bg-background group/calendar'
				)}
			>
				{#snippet children({ months, weekdays }: { months: Month<DateValue>[]; weekdays: string[] })}
					<div class="flex flex-col gap-3">
						<!-- Nav -->
						<div class="flex items-center justify-between">
							<RangeCalendar.PrevButton
								class={cn(
									'inline-flex size-(--cell-size) items-center justify-center rounded-(--cell-radius)',
									'text-foreground transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50'
								)}
							>
								‹
							</RangeCalendar.PrevButton>
							<RangeCalendar.Heading class="text-sm font-semibold text-foreground" />
							<RangeCalendar.NextButton
								class={cn(
									'inline-flex size-(--cell-size) items-center justify-center rounded-(--cell-radius)',
									'text-foreground transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50'
								)}
							>
								›
							</RangeCalendar.NextButton>
						</div>

						<!-- Grid per bulan -->
						{#each months as month (month)}
							<RangeCalendar.Grid class="w-full border-collapse">
								<RangeCalendar.GridHead>
									<RangeCalendar.GridRow class="flex">
										{#each weekdays as weekday, i (i)}
											<RangeCalendar.HeadCell
												class="w-(--cell-size) text-center text-[0.75rem] font-normal text-muted-foreground"
											>
												{weekday.slice(0, 2)}
											</RangeCalendar.HeadCell>
										{/each}
									</RangeCalendar.GridRow>
								</RangeCalendar.GridHead>
								<RangeCalendar.GridBody>
									{#each month.weeks as weekDates (weekDates)}
										<RangeCalendar.GridRow class="mt-1 flex w-full">
											{#each weekDates as date (date)}
												<RangeCalendar.Cell
													{date}
													month={month.value}
													class={cn(
														'relative size-(--cell-size) p-0 text-center text-sm focus-within:z-20',
														'[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:bg-primary/15',
														'[&[data-selection-start]]:rounded-l-(--cell-radius)',
														'[&[data-selection-end]]:rounded-r-(--cell-radius)'
													)}
												>
													<RangeCalendar.Day
														class={cn(
															'flex size-(--cell-size) items-center justify-center rounded-(--cell-radius)',
															'select-none whitespace-nowrap text-sm font-normal leading-none',
															'outline-none transition-colors',
															'not-data-selected:hover:bg-accent/50 not-data-selected:hover:text-foreground',
															'[&[data-today]:not([data-selected])]:bg-accent/30 [&[data-today]:not([data-selected])]:text-foreground',
															'data-[selected]:bg-primary data-[selected]:text-primary-foreground',
															'[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:opacity-50',
															'data-[disabled]:pointer-events-none data-[disabled]:opacity-30'
														)}
													/>
												</RangeCalendar.Cell>
											{/each}
										</RangeCalendar.GridRow>
									{/each}
								</RangeCalendar.GridBody>
							</RangeCalendar.Grid>
						{/each}
					</div>
				{/snippet}
			</RangeCalendar.Root>
		</PopoverContent>
	</Popover>
</div>
