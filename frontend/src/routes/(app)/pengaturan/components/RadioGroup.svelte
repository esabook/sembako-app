<script lang="ts">
	let {
		options,
		group = $bindable(),
		onchange,
		gap = 'gap-3'
	}: {
		options: [string, string][]
		group: string
		onchange?: () => void
		gap?: string
	} = $props()
</script>

<div class="flex flex-wrap {gap}">
	{#each options as [val, label] (val)}
		<label class="flex cursor-pointer items-center gap-2">
			<input type="radio" bind:group value={val} {onchange} class="accent-green-500" />
			<span class="text-sm" style="color:var(--text)">{label}</span>
		</label>
	{/each}
</div>
