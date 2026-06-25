<script lang="ts">
	import type { ToastTipe } from '$lib/types/error.types';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CircleOff from '@lucide/svelte/icons/circle-off';
	import Button from './Button.svelte';

	let {
		tipe = 'info',
		pesan,
		onhapus
	}: {
		tipe?: ToastTipe;
		pesan: string;
		onhapus?: () => void;
	} = $props();

	const warna: Record<ToastTipe, string> = {
		sukses: 'var(--accent)',
		error: 'var(--danger)',
		warn: 'var(--warn)',
		info: 'var(--info)'
	};

	const ikon: Record<ToastTipe, any> = {
		sukses: CircleCheck,
		error: CircleOff,
		warn: AlertTriangle,
		info: Info
	};
</script>

{#snippet iconRender()}
	{@const Ikon = ikon[tipe]}
	<span class="font-bold" style="color:{warna[tipe]}"><Ikon size="1rem" /></span>
{/snippet}

<div
	class="toast-my text-m flex items-center gap-2 rounded border px-3 py-2 shadow-lg"
	style="background:var(--surface);border-color:{warna[tipe]};color:var(--text)"
	role="status"
>
	{@render iconRender()}
	<span class="min-w-0 flex-1 break-words">{pesan}</span>
	<Button onclick={onhapus} variant="ghost" size="sm" title="Tutup notifikasi">Tutup</Button>
</div>

<style>
	.toast-my {
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
