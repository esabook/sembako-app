<script lang="ts">
	let {
		aktif = $bindable(false),
		onchange,
		labelAktif = 'Sembunyikan Non-Aktif',
		labelNonAktif = 'Tampilkan Non-Aktif',
	}: {
		aktif?: boolean;
		onchange?: (v: boolean) => void;
		labelAktif?: string;
		labelNonAktif?: string;
	} = $props();
</script>

<button
	type="button"
	onclick={() => { aktif = !aktif; onchange?.(aktif); }}
	class="px-3 py-1 rounded text-sm border transition-colors"
	style="{aktif
		? 'background:var(--surface2);color:var(--text);border-color:var(--warn)'
		: 'color:var(--text-dim);border-color:var(--border)'}"
>
	{aktif ? labelAktif : labelNonAktif}
</button>
