<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { katalog } from './KatalogFitur.const';

	let terbuka = $state<boolean[]>([]);

	function toggle(i: number) {
		const buka = !terbuka[i];
		terbuka[i] = buka;
		if (window.innerWidth >= 640) {
			const pasangan = i % 2 === 0 ? i + 1 : i - 1;
			if (pasangan >= 0 && pasangan < katalog.length) terbuka[pasangan] = buka;
		}
	}
</script>

<section class="mx-auto max-w-5xl px-4 py-12">
	<div class="text-center">
		<h2 class="text-xl font-bold sm:text-2xl">Semua fitur, satu aplikasi</h2>
		<p class="mx-auto mt-2 max-w-2xl text-sm" style="color:var(--text-dim)">
			Ketuk tiap kartu untuk lihat penjelasan &amp; rincian fitur.
		</p>
	</div>

	<div class="mt-8 grid gap-3 sm:grid-cols-2">
		{#each katalog as f, i (f.judul)}
			<div
				class="kartu min-w-0 rounded-lg border"
				style="border-color:var(--border);background-color: var(--surface);"
			>
				<button
					class="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
					onclick={() => toggle(i)}
					aria-expanded={terbuka[i]}
				>
					<f.ikon class="size-5 shrink-0" style="color:var(--accent)" />
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-semibold select-none">{f.judul}</span>
						<span class="block truncate text-xs select-none" style="color:var(--text-dim)"
							>{f.ringkas}</span
						>
					</span>
					<span
						class="chevron shrink-0"
						class:buka={terbuka[i]}
						style="color:var(--text-dim)"
						aria-hidden="true"
					>
						<ChevronRight class="size-4" />
					</span>
				</button>
				{#if terbuka[i]}
					<div
						transition:slide={{ duration: 300, easing: cubicInOut }}
						class="border-t px-4 pt-3 pb-4"
						style="border-color:var(--border)"
					>
						<p class="text-xs leading-relaxed select-none" style="color:var(--text-dim)">{f.edu}</p>
						<ul class="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
							{#each f.poin as p (p)}
								<li class="flex items-start gap-1.5">
									<span style="color:var(--accent)">•</span>
									<span class="select-none">{p}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.chevron {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.chevron.buka {
		transform: rotate(90deg);
	}
</style>
