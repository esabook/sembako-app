<!--
  ModalWindow — dialog modal dengan backdrop, Escape, dan responsive sheet.

  ── Props ─────────────────────────────────────────────────────────────────────
  open        $bindable(false)   buka/tutup modal
  title       ''                 teks header (kosong = header tidak dirender)
  maxWidth    'md'               lebar panel desktop: 'sm'|'md'|'lg'|'xl'|'3xl'|'4xl'
  noPadding   false              true = body tanpa padding (untuk konten custom seperti tabel/gambar)
  fullscreen  false              true = panel penuh layar (h-full, rounded-2xl)
  ontutup     undefined          callback saat modal ditutup; kalau diisi, open TIDAK di-set false otomatis

  ── Penggunaan dasar ──────────────────────────────────────────────────────────
  <script lang="ts">
    import ModalWindow from '$lib/components/ModalWindow.svelte'
    let buka = $state(false)
  </script>

  <button onclick={() => buka = true}>Buka</button>

  <ModalWindow bind:open={buka} title="Judul Modal">
    <p>Konten di sini.</p>
    <button onclick={() => buka = false}>Tutup</button>
  </ModalWindow>

  ── Perilaku ──────────────────────────────────────────────────────────────────
  - Mobile  : muncul dari bawah (items-end), rounded-t-2xl, ada drag handle dekoratif
  - Desktop : muncul di tengah (items-center), rounded-2xl, max-height 90svh
  - Tutup   : klik backdrop | Escape | set open=false | panggil ontutup()
  - body sudah overflow-y-auto flex-1 — konten panjang otomatis scroll

  ── ontutup vs open ───────────────────────────────────────────────────────────
  Kalau ontutup diisi, DataTable tidak auto-set open=false — caller yang kontrol:
    <ModalWindow bind:open={buka} ontutup={() => { simpan(); buka = false }}>

  ── noPadding ─────────────────────────────────────────────────────────────────
  Pakai untuk konten yang butuh edge-to-edge (tabel, gambar, embedded form):
    <ModalWindow bind:open={buka} noPadding maxWidth="xl">
      <div class="p-4">...</div>   ← padding diatur sendiri di dalam
    </ModalWindow>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		title = '',
		maxWidth = 'md',
		noPadding = false,
		fullscreen = false,
		fullHeight = false,
		ontutup = undefined,
		children
	}: {
		open?: boolean;
		title?: string;
		maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '3xl' | '4xl';
		noPadding?: boolean;
		fullscreen?: boolean;
		fullHeight?: boolean;
		ontutup?: () => void;
		children: Snippet;
	} = $props();

	function tutup() {
		if (ontutup) {
			ontutup();
			return;
		}
		open = false;
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') tutup();
	}

	let vvHeight = $state(0);
	let vvTop = $state(0);

	$effect(() => {
		const vv = window.visualViewport;
		if (!vv) {
			vvHeight = window.innerHeight;
			vvTop = 0;
			return;
		}
		vvHeight = vv.height;
		vvTop = vv.offsetTop;
		const update = () => {
			vvHeight = vv.height;
			vvTop = vv.offsetTop;
		};
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		transition:fade={{ duration: 150 }}
		class="ui-backdrop z-50 flex justify-center {fullscreen
			? 'items-center p-2'
			: 'items-end px-2 pt-4 sm:items-center sm:px-0'}"
		style="position:fixed;top:{vvTop}px;left:0;right:0;height:{vvHeight}px"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={tutup}
		onkeydown={(e) => {
			if (e.key === 'Escape') tutup();
		}}
	>
		<!-- Panel -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			transition:fly={{ duration: 200, y: 24, opacity: 0 }}
			class="relative flex w-full flex-col overflow-hidden border
             {fullscreen
				? 'h-dvh rounded-2xl'
				: (fullHeight ? 'h-dvh ' : '') +
					'rounded-t-2xl sm:rounded-2xl ' +
					(maxWidth === 'sm'
						? 'sm:max-w-sm'
						: maxWidth === 'lg'
							? 'sm:max-w-lg'
							: maxWidth === 'xl'
								? 'sm:max-w-xl'
								: maxWidth === '3xl'
									? 'sm:max-w-3xl'
									: maxWidth === '4xl'
										? 'sm:max-w-4xl'
										: 'sm:max-w-md')}"
			style="background:var(--surface);border-color:var(--border);{fullscreen
				? ''
				: 'max-height:100dvh'}"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					e.stopPropagation();
					tutup();
				} else {
					e.stopPropagation();
				}
			}}
		>
			<!-- Close button -->
			<button
				onclick={tutup}
				class="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full text-base leading-none"
				style="top:4px;right:4px;background:var(--surface2);color:var(--text-dim)"
				aria-label="Tutup">&times;</button
			>

			<!-- Drag handle (mobile only, non-fullscreen) -->
			{#if !fullscreen}
				<div class="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
					<div class="h-1 w-10 rounded-full" style="background:var(--border)"></div>
				</div>
			{/if}

			<!-- Header -->
			{#if title}
				<div
					class="shrink-0 border-b"
					style="border-color:var(--border);padding:16px;padding-right:48px"
				>
					<h3 class="text-sm font-bold" style="color:var(--text)">{title}</h3>
				</div>
			{/if}

			<!-- Body -->
			<div
				class={noPadding ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-4 py-4 sm:px-6'}
			>
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.ui-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(3px);
	}
</style>
