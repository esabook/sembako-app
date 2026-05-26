<script lang="ts">
	import type { ToastTipe } from '$lib/types/error.types';

	let {
		tipe = 'info',
		pesan,
		onhapus,
	}: {
		tipe?: ToastTipe;
		pesan: string;
		onhapus?: () => void;
	} = $props();

	const warna: Record<ToastTipe, string> = {
		sukses: 'var(--accent)',
		error: 'var(--danger)',
		warn: 'var(--warn)',
		info: 'var(--info)',
	};

	const ikon: Record<ToastTipe, string> = {
		sukses: '✓',
		error: '⦚',
		warn: '!',
		info: 'i',
	};
</script>

<div
	class="toast flex items-start gap-2 rounded border px-3 py-2 text-xs shadow-lg"
	style="background:var(--surface);border-color:{warna[tipe]};color:var(--text)"
	role="status"
>
	<span class="font-bold" style="color:{warna[tipe]}">{ikon[tipe]}</span>
	<span class="min-w-0 flex-1 break-words">{pesan}</span>
	<button
		onclick={onhapus}
		class="shrink-0 leading-none"
		style="color:var(--text-dim)"
		aria-label="Tutup notifikasi">&times;</button
	>
</div>

<style>
	.toast {
		animation: masuk 0.18s ease-out;
		will-change: transform, opacity;
	}
	@keyframes masuk {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
