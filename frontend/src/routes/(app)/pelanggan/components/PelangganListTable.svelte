<script lang="ts">
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
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

	const columns: Column[] = [
		{ key: 'kode_pelanggan', label: 'Kode', sortable: true, minWidth: 80 },
		{ key: 'nama', label: 'Nama', sortable: true, minWidth: 130 },
		{ key: 'tipe', label: 'Tipe', sortable: true, priority: 2 },
		{ key: 'kontak', label: 'Kontak', priority: 3 },
		{ key: 'saldo_piutang', label: 'Piutang', align: 'right', sortable: true, priority: 2 },
		{ key: 'no_kartu', label: 'Kartu', priority: 3 },
		{ key: 'aksi', label: 'Aksi', align: 'right', sortable: false, hideable: false }
	];

	let sortKey = $state('');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(1);
	let pageSize = $state(25);

	let sortedList = $derived.by(() => {
		if (!sortKey) return items;
		const list = [...items];
		list.sort((a, b) => {
			const av = a[sortKey as keyof Pelanggan];
			const bv = b[sortKey as keyof Pelanggan];
			if (av == null) return 1;
			if (bv == null) return -1;
			const cmp =
				typeof av === 'number' && typeof bv === 'number'
					? av - bv
					: String(av).localeCompare(String(bv), 'id');
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	let pagedList = $derived(
		sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	$effect(() => {
		items;
		currentPage = 1;
	});
</script>

<DataTable
	{columns}
	bind:sortKey
	bind:sortDir
	totalRows={sortedList.length}
	rowCount={pagedList.length}
	bind:currentPage
	bind:pageSize
	emptyText="Belum ada pelanggan."
	tableId="pelanggan-list"
	maxRows={12}
>
	{#snippet body(hidden)}
		{#each pagedList as p (p.id)}
			<tr
				class="border-t"
				style="border-color:var(--border);{!p.is_active ? 'opacity:0.5' : ''}"
			>
				{#if !hidden.has('kode_pelanggan')}
					<td class="px-3 py-2 font-mono text-xs" style="color:var(--text-dim)">
						{p.kode_pelanggan}
					</td>
				{/if}
				{#if !hidden.has('nama')}
					<td class="px-3 py-2">
						<span class="font-medium" style="color:var(--text)">{p.nama}</span>
						{#if p.gender}
							<span class="ml-1 text-xs" style={genderColor(p.gender)}>
								{genderSymbol(p.gender)}
							</span>
						{/if}
					</td>
				{/if}
				{#if !hidden.has('tipe')}
					<td class="px-3 py-2 text-xs">
						<span class="rounded px-1.5 py-0.5" style="background:var(--surface2);color:var(--text-dim)">
							{p.tipe}
						</span>
					</td>
				{/if}
				{#if !hidden.has('kontak')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{p.kontak ?? '—'}</td>
				{/if}
				{#if !hidden.has('saldo_piutang')}
					<td
						class="px-3 py-2 text-right text-xs"
						style="color:{p.saldo_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}"
					>
						{p.saldo_piutang > 0 ? rupiah(p.saldo_piutang) : '—'}
					</td>
				{/if}
				{#if !hidden.has('no_kartu')}
					<td class="px-3 py-2 text-xs">
						{#if p.no_kartu}
							<span class="font-mono" style="color:var(--accent)">{p.no_kartu}</span>
							{#if p.tier}
								<span class="ml-1 font-bold" style={TIER_COLOR[p.tier]}>{TIER_LABEL[p.tier]}</span>
							{/if}
						{:else}
							<span style="color:var(--text-dim)">—</span>
						{/if}
					</td>
				{/if}
				{#if !hidden.has('aksi')}
					<td class="px-3 py-2">
						<div class="flex flex-wrap items-center justify-end gap-1">
							<Button variant="ghost" size="xs" onclick={() => onedit(p)} title="Edit">
								<PencilLine size="1rem" />
							</Button>
							<Button
								variant="ghost"
								size="xs"
								onclick={() => onriwayat(p.id, p.nama)}
								title="Riwayat"
							>
								<ClockFading size="1rem" />
							</Button>
							{#if p.no_kartu}
								<Button variant="ghost" size="xs" onclick={() => onunassign(p)} title="Lepas kartu">
									<Unlink size="1rem" />
								</Button>
							{:else}
								<Button variant="ghost" size="xs" onclick={() => onassign(p)} title="Assign kartu">
									<Link size="1rem" />
								</Button>
							{/if}
							<Button
								variant={p.is_active ? 'danger' : 'ghost'}
								size="xs"
								onclick={() => ontoggle(p)}
							>
								{p.is_active ? 'Nonaktif' : 'Aktifkan'}
							</Button>
						</div>
					</td>
				{/if}
			</tr>
		{/each}
	{/snippet}
</DataTable>
