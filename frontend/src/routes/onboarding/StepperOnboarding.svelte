<script lang="ts">
	// Pembungkus daisyUI `steps` — tampilkan progres langkah onboarding.
	let { langkah = [], aktif = 0 }: { langkah?: string[]; aktif?: number } = $props();
</script>

<ul class="steps w-full pt-4 text-xs">
	{#each langkah as l, i (l)}
		<li class="step" class:step-primary={i <= aktif} data-content={i < aktif ? '✓' : i + 1}>
			{l}
		</li>
	{/each}
</ul>
