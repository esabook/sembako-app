<script lang="ts">
	import { slide } from 'svelte/transition';
	import {
		keranjang,
		itemAktifIdx,
		subtotal,
		diskonTotal,
		kasirMode,
		setModeOverride,
		type KasirMode
	} from '$lib/stores/kasir';
	import {
		konfirmasiHapusIdx,
		dummyJumlah,
		ubahJumlah,
		ubahDiskon,
		openSearch,
		totalAkhir,
		draftStatus
	} from './kasir.store';
	import { rupiah } from './kasir.logic';
	import type { ShiftAktif } from './kasir.types';

	let {
		shiftAktif,
		diskonInputRefs = $bindable<(HTMLInputElement | undefined)[]>([]),
		onbukaTutupShift,
		onbukaBukaShift,
		onprocesBayar
	}: {
		shiftAktif: ShiftAktif | null;
		diskonInputRefs?: (HTMLInputElement | undefined)[];
		onbukaTutupShift?: () => void;
		onbukaBukaShift?: () => void;
		onprocesBayar?: () => void;
	} = $props();

	let hoveredIdx = $state<number | null>(null);
	let dummyHovered = $state(false);

	const MODE_ORDER: KasirMode[] = ['guided', 'normal', 'pro'];
	const MODE_LABEL: Record<KasirMode, string> = { guided: 'GUIDED', normal: 'NORMAL', pro: 'PRO' };

	function cycleMode() {
		const cur = $kasirMode;
		const next = MODE_ORDER[(MODE_ORDER.indexOf(cur) + 1) % MODE_ORDER.length]!;
		setModeOverride(next);
	}
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<!-- Keranjang table -->
	<div class="min-h-0 flex-1 overflow-y-auto rounded border" style="border-color:var(--border)">
		{#if $keranjang.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center gap-4 p-6"
				style="color:var(--text-dim)"
			>
				{#if $kasirMode === 'guided'}
					<p class="text-xs font-bold tracking-widest" style="color:var(--text-dim)">
						PANDUAN KASIR
					</p>
					<div class="flex flex-col gap-3 text-left text-sm">
						<div class="flex items-center gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--accent);color:var(--bg)">1</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">F3</kbd
								> atau klik tombol di bawah untuk cari barang</span
							>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--text-dim)">2</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">Enter</kbd
								> untuk pilih / konfirmasi</span
							>
						</div>
						<div class="flex items-center gap-3" style="opacity:0.5">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--text-dim)">3</span
							>
							<span
								>Tekan <kbd
									class="rounded border px-1.5 py-0.5 font-mono text-xs"
									style="border-color:var(--border)">F10</kbd
								> untuk proses pembayaran</span
							>
						</div>
					</div>
				{:else}
					<p class="text-sm">Keranjang kosong</p>
				{/if}
				<button
					onclick={openSearch}
					class="mt-2 rounded border px-4 py-2 font-mono text-sm transition-all"
					style="border-color:var(--accent);color:var(--accent)"
				>
					F3 · Cari / scan barang
				</button>
			</div>
		{:else}
			<div class="h-full overflow-x-auto">
				<table class="min-w-full text-sm">
					<thead
						class="sticky top-0 border-b"
						style="background:var(--surface2);border-color:var(--border)"
					>
						<tr style="color:var(--text-dim)">
							<th class="w-6 px-1 py-2 text-center font-medium">#</th>
							<th class="px-3 py-2 text-left font-medium">Barang</th>
							<th class="w-20 px-1 py-2 text-right font-medium">Harga</th>
							<th class="w-12 px-1 py-2 text-center font-medium">Jml</th>
							<th class="px-1 py-1 text-right font-medium" style="width:1px">Diskon</th>
							<th class="w-20 px-2 py-2 text-right font-medium">Subtotal</th>
						</tr>
					</thead>
					<tbody>
						{#each $keranjang as item, idx (`${item.barang_id}-${item.tipe_harga}`)}
							{@const aktif = $itemAktifIdx === idx}
							{@const visButtons = hoveredIdx === idx || (aktif && hoveredIdx === null)}
							<tr
								transition:slide={{ duration: 150 }}
								class="cursor-pointer border-t transition-colors"
								style={aktif
									? 'background:var(--surface2);border-color:var(--border);border-left:2px solid var(--accent)'
									: 'border-color:var(--border);border-left:2px solid transparent'}
								onclick={() => itemAktifIdx.set(idx)}
								onmouseenter={() => {
									hoveredIdx = idx;
								}}
								onmouseleave={() => {
									hoveredIdx = null;
								}}
							>
								<td class="w-6 px-1 py-2 text-center text-xs" style="color:var(--text-dim)">
									{#if visButtons}
										<button
											onclick={(e) => {
												e.stopPropagation();
												konfirmasiHapusIdx.set(idx);
											}}
											aria-label="Hapus item"
											class="rounded opacity-50 transition-opacity hover:opacity-100"
											style="color:var(--danger)"
										>
											<svg
												width="1em"
												height="1em"
												viewBox="0 0 24 24"
												fill="currentColor"
												xmlns="http://www.w3.org/2000/svg"
												><path
													d="M10 5H14C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5ZM8.5 5C8.5 3.067 10.067 1.5 12 1.5C13.933 1.5 15.5 3.067 15.5 5H21.25C21.6642 5 22 5.33579 22 5.75C22 6.16421 21.6642 6.5 21.25 6.5H19.9309L18.7589 18.6112C18.5729 20.5334 16.9575 22 15.0263 22H8.97369C7.04254 22 5.42715 20.5334 5.24113 18.6112L4.06908 6.5H2.75C2.33579 6.5 2 6.16421 2 5.75C2 5.33579 2.33579 5 2.75 5H8.5ZM10.5 9.75C10.5 9.33579 10.1642 9 9.75 9C9.33579 9 9 9.33579 9 9.75V17.25C9 17.6642 9.33579 18 9.75 18C10.1642 18 10.5 17.6642 10.5 17.25V9.75ZM14.25 9C13.8358 9 13.5 9.33579 13.5 9.75V17.25C13.5 17.6642 13.8358 18 14.25 18C14.6642 18 15 17.6642 15 17.25V9.75C15 9.33579 14.6642 9 14.25 9Z"
												/></svg
											>
										</button>
									{:else}
										{idx + 1}
									{/if}
								</td>
								<td class="px-1 py-2">
									<div class="flex items-center gap-1.5">
										<span class="truncate leading-tight">{item.nama_barang}</span>
										<span
											class="shrink-0 rounded px-1 text-xs font-bold"
											style="background:var(--surface2);color:var(--accent)"
											>{item.tipe_harga === 'grosir' ? 'GRS' : 'ECR'}</span
										>
									</div>
									<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
								</td>
								<td class="px-1 py-2 text-right font-mono tabular-nums"
									>{rupiah(item.harga_jual)}</td
								>
								<td class="relative px-1 py-1.5 text-center">
									<span class="font-mono tabular-nums">{item.jumlah}</span>
									<div class="text-xs" style="color:var(--text-dim)">{item.singkatan_satuan}</div>
									<button
										onclick={(e) => {
											e.stopPropagation();
											if (item.jumlah <= 1) konfirmasiHapusIdx.set(idx);
											else ubahJumlah(idx, -1);
										}}
										class={`absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-100' : 'sm:pointer-events-none sm:opacity-0'}`}
										style="background:var(--surface);color:var(--text-dim)">−</button
									>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ubahJumlah(idx, 1);
										}}
										class={`absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-100' : 'sm:pointer-events-none sm:opacity-0'}`}
										style="background:var(--surface);color:var(--text-dim)">+</button
									>
								</td>
								<td class="px-1 py-1.5 text-right">
									<input
										bind:this={diskonInputRefs[idx]}
										type="number"
										min="0"
										step="500"
										value={item.diskon_item}
										oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === 'Escape') {
												e.preventDefault();
												e.stopPropagation();
												(e.target as HTMLInputElement).blur();
											}
										}}
										minlength="2"
										maxlength="8"
										size="8"
										class="fit-content [field-sizing:content] cursor-auto [appearance:textfield] rounded border px-1 py-0.5 text-right font-mono text-xs font-medium tabular-nums transition-colors outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										style={visButtons
											? 'background:var(--surface2);border-color:var(--border);color:var(--text)'
											: 'background:transparent;border-color:transparent;color:var(--text)'}
									/>
								</td>
								<td class="px-2 py-2 text-right font-mono font-medium tabular-nums">
									{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
								</td>
							</tr>
						{/each}
						<!-- Dummy row: klik nama/enter → buka cari barang -->
						<tr
							class="border-t"
							style={$itemAktifIdx === $keranjang.length
								? 'background:var(--surface2);border-color:var(--border);border-left:2px solid var(--accent)'
								: `border-color:var(--border);border-left:2px solid transparent;opacity:0.4`}
							onclick={() => itemAktifIdx.set($keranjang.length)}
							onmouseenter={() => {
								dummyHovered = true;
							}}
							onmouseleave={() => {
								dummyHovered = false;
							}}
						>
							<td class="px-1 py-2 text-center text-xs" style="color:var(--text-dim)">+</td>
							<td class="px-1 py-2">
								<button
									class="text-left text-sm italic"
									style="color:var(--text-dim)"
									onclick={(e) => {
										e.stopPropagation();
										openSearch();
									}}>Tambah barang...</button
								>
							</td>
							<td></td>
							<td class="relative px-1 py-1.5 text-center">
								<span class="font-mono tabular-nums">{$dummyJumlah}</span>
								<button
									onclick={(e) => {
										e.stopPropagation();
										dummyJumlah.update((n: number) => Math.max(1, n - 1));
									}}
									class={`absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${dummyHovered || ($itemAktifIdx === $keranjang.length && hoveredIdx === null) ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
									style="background:var(--surface);color:var(--text-dim)">−</button
								>
								<button
									onclick={(e) => {
										e.stopPropagation();
										dummyJumlah.update((n: number) => n + 1);
									}}
									class={`absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${dummyHovered || ($itemAktifIdx === $keranjang.length && hoveredIdx === null) ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
									style="background:var(--surface);color:var(--text-dim)">+</button
								>
							</td>
							<td></td>
							<td></td>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Bottom bar -->
	<div
		class="flex shrink-0 flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4"
		style="border-color:var(--border)"
	>
		<!-- Totals: tampil di atas di HP, kanan di desktop -->
		<div class="flex items-center justify-between gap-4 md:order-2 md:justify-end md:gap-6">
			<div class="flex flex-col gap-0.5 text-xs md:text-sm" style="color:var(--text-dim)">
				<div class="flex justify-between gap-3">
					<span>Subtotal</span>
					<span class="font-mono tabular-nums" style="color:var(--text)">{rupiah($subtotal)}</span>
				</div>
				{#if $diskonTotal > 0}
					<div class="flex justify-between gap-3">
						<span>Diskon</span>
						<span class="font-mono tabular-nums" style="color:var(--warn)"
							>−{rupiah($diskonTotal)}</span
						>
					</div>
				{/if}
			</div>
			<span class="font-mono text-2xl font-bold tabular-nums md:text-4xl"
				>{rupiah($totalAkhir)}</span
			>
		</div>

		<!-- Buttons: wrap di HP, single row di desktop -->
		<div class="flex flex-wrap items-center gap-2 md:order-1">
			<!-- mode badge: klik untuk ganti manual -->
			<button
				onclick={cycleMode}
				title="Mode kasir — klik untuk ganti"
				class="rounded border px-3 py-1 font-mono text-xs font-bold transition-all"
				style={$kasirMode === 'guided'
					? 'border-color:var(--info);color:var(--info)'
					: $kasirMode === 'pro'
						? 'border-color:var(--accent);color:var(--accent)'
						: 'border-color:var(--border);color:var(--text-dim)'}
			>
				{MODE_LABEL[$kasirMode]}
			</button>

			<!-- Shift indicator + buka/tutup -->
			{#if shiftAktif}
				<button
					onclick={onbukaTutupShift}
					class="rounded border px-3 py-1 text-xs transition-all"
					style="border-color:var(--accent);color:var(--accent)"
				>
					{$kasirMode === 'pro' ? 'F11' : `F11 · Shift ${shiftAktif.jam_buka}`}
				</button>
			{:else}
				<button
					onclick={onbukaBukaShift}
					class="rounded border px-3 py-1 text-xs font-bold transition-all"
					style="border-color:var(--warn);color:var(--warn)"
				>
					{$kasirMode === 'pro' ? 'F11' : 'F11 · Buka Shift ⚠'}
				</button>
			{/if}

			{#if $keranjang.length > 0}
				<button
					onclick={onprocesBayar}
					disabled={!shiftAktif}
					class="rounded px-4 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
					style="background:var(--accent);color:var(--bg)"
				>
					{$kasirMode === 'pro' ? 'F10' : 'F10 · PROSES BAYAR'}
				</button>
			{/if}

			<!-- draft status indicator -->
			{#if $draftStatus === 'saving'}
				<span class="font-mono text-xs" style="color:var(--text-dim)">Menyimpan...</span>
			{:else if $draftStatus === 'saved'}
				<span class="font-mono text-xs" style="color:var(--text-dim)">✓ Tersimpan</span>
			{:else if $draftStatus === 'error'}
				<span class="font-mono text-xs" style="color:var(--danger)">Gagal simpan</span>
			{/if}
		</div>
	</div>
</div>
