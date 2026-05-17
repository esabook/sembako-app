<script lang="ts">
	// Format nilai: 'YYYY-MM-DD' (cocok native <input type=date>)
	let {
		dari = $bindable(''),
		sampai = $bindable(''),
		label = null,
		onchange,
	}: {
		dari?: string;
		sampai?: string;
		label?: string | null;
		onchange?: (range: { dari: string; sampai: string }) => void;
	} = $props();

	function emit() {
		onchange?.({ dari, sampai });
	}

	function setDari(e: Event) {
		dari = (e.target as HTMLInputElement).value;
		emit();
	}
	function setSampai(e: Event) {
		sampai = (e.target as HTMLInputElement).value;
		emit();
	}
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<span class="text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<div class="flex items-center gap-2">
		<input
			type="date"
			value={dari}
			max={sampai || undefined}
			oninput={setDari}
			class="rounded border px-2 py-1.5 text-sm outline-none"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		/>
		<span style="color:var(--text-dim)">→</span>
		<input
			type="date"
			value={sampai}
			min={dari || undefined}
			oninput={setSampai}
			class="rounded border px-2 py-1.5 text-sm outline-none"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		/>
	</div>
</div>
