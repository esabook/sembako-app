<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tipe = 'netral',
		children,
	}: {
		// semantik atau status umum di app
		tipe?:
			| 'sukses'
			| 'warn'
			| 'danger'
			| 'info'
			| 'netral'
			| 'lunas'
			| 'hutang'
			| 'void'
			| 'aman'
			| 'hampir'
			| 'habis'
			| string;
		children: Snippet;
	} = $props();

	// peta status domain → warna semantik
	const peta: Record<string, string> = {
		sukses: 'var(--accent)',
		lunas: 'var(--accent)',
		aman: 'var(--accent)',
		warn: 'var(--warn)',
		hampir: 'var(--warn)',
		hutang: 'var(--warn)',
		danger: 'var(--danger)',
		habis: 'var(--danger)',
		void: 'var(--danger)',
		info: 'var(--info)',
		netral: 'var(--text-dim)',
	};

	const c = $derived(peta[tipe] ?? 'var(--text-dim)');
</script>

<span
	class="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
	style="color:{c};border:1px solid {c};background:transparent"
>
	{@render children()}
</span>
