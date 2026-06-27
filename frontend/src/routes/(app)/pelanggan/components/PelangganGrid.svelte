<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import Unlink from '@lucide/svelte/icons/unlink';
	import Link from '@lucide/svelte/icons/link';
	import ClockFading from '@lucide/svelte/icons/clock-fading';
	import {
		TIER_COLOR,
		TIER_LABEL,
		genderSymbol,
		genderColor,
		rupiah,
		type Pelanggan
	} from '../pelanggan.helpers.js';

	let {
		items,
		onedit,
		onriwayat,
		onassign,
		onunassign,
		ontoggle
	}: {
		items: Pelanggan[];
		onedit: (p: Pelanggan) => void;
		onriwayat: (id: number, nama: string) => void;
		onassign: (p: Pelanggan) => void;
		onunassign: (p: Pelanggan) => void;
		ontoggle: (p: Pelanggan) => void;
	} = $props();
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each items as p (p.id)}
		<div
			class="flex flex-col gap-2 rounded border p-3 text-sm"
			style="background:var(--surface);border-color:var(--border);{!p.is_active ? 'opacity:0.5' : ''}"
		>
			<div class="flex items-center justify-between gap-2">
				<span class="font-mono text-xs" style="color:var(--text-dim)">{p.kode_pelanggan}</span>
				<span
					class="rounded px-1.5 py-0.5 text-xs"
					style="background:var(--surface2);color:var(--text-dim)">{p.tipe}</span
				>
			</div>

			<div class="leading-tight font-medium">
				{p.nama}
				{#if p.gender}
					<span class="ml-1 text-xs" style={genderColor(p.gender)}>{genderSymbol(p.gender)}</span>
				{/if}
			</div>

			<div class="flex items-center justify-between gap-2 text-xs">
				<span style="color:var(--text-dim)">{p.kontak ?? '—'}</span>
				<span style="color:{p.saldo_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
					{p.saldo_piutang > 0 ? rupiah(p.saldo_piutang) : '—'}
				</span>
			</div>

			{#if p.no_kartu}
				<div class="space-y-1 border-t pt-2" style="border-color:var(--border)">
					<p class="text-xs font-medium" style="color:var(--text-dim)">Kartu Anggota:</p>
					<div class="flex items-center justify-between text-xs">
						<span class="font-mono" style="color:var(--accent)">{p.no_kartu}</span>
						{#if p.diskon_member && p.diskon_member > 0}
							<span style="color:var(--accent)">−{p.diskon_member}%</span>
						{:else}
							<span style="color:var(--text-dim)">—</span>
						{/if}
					</div>
					<div class="flex items-center justify-between text-xs">
						<span class="font-bold" style={TIER_COLOR[p.tier ?? 'reguler']}>
							{TIER_LABEL[p.tier ?? 'reguler']}
						</span>
						<span style="color:var(--info)">{p.poin ?? 0} poin</span>
					</div>
				</div>
			{/if}

			<div
				class="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-2"
				style="border-color:var(--border)"
			>
				<Button variant="ghost" size="xs" onclick={() => onedit(p)} title="Edit pelanggan">
					<PencilLine size="1rem" />
				</Button>
				<Button
					variant="ghost"
					size="xs"
					onclick={() => onriwayat(p.id, p.nama)}
					title="Lihat riwayat"
				>
					<ClockFading size="1rem" />
				</Button>
				{#if p.no_kartu}
					<Button variant="ghost" size="xs" onclick={() => onunassign(p)} title="Lepas kartu">
						<Unlink size="1rem" /> Lepas Kartu
					</Button>
				{:else}
					<Button variant="ghost" size="xs" onclick={() => onassign(p)} title="Assign kartu">
						<Link size="1rem" /> Assign Kartu
					</Button>
				{/if}
				<Button
					variant={p.is_active ? 'danger' : 'ghost'}
					size="xs"
					onclick={() => ontoggle(p)}
					clasz="ml-auto"
					title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
				>
					{p.is_active ? 'Nonaktif' : 'Aktifkan'}
				</Button>
			</div>
		</div>
	{/each}
</div>
