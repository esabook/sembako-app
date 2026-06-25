<script lang="ts">
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
		ubahTipeHarga,
		openSearch,
		totalAkhir,
		draftStatus
	} from './kasir.store';
	import { rupiah } from './kasir.logic';
	import { thumbUrl } from '$lib/utils/upload';
	import type { ShiftAktif } from './kasir.types';
	import Search from '@lucide/svelte/icons/search';
	import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TicketPercent from '@lucide/svelte/icons/ticket-percent';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import BadgeDollarSign from '@lucide/svelte/icons/badge-dollar-sign';

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
			<!-- Mobile card layout -->
			<div class="divide-y md:hidden" style="border-color:var(--border)">
				{#each $keranjang as item, idx (`${item.barang_id}-${item.tipe_harga}`)}
					{@const aktif = $itemAktifIdx === idx}
					{@const visButtons = hoveredIdx === idx || (aktif && hoveredIdx === null)}
					<div
						role="button"
						tabindex="0"
						class="flex cursor-pointer gap-2 px-2 py-2 transition-colors"
						style={aktif
							? 'background:var(--surface2);border-left:3px solid var(--accent)'
							: 'border-left:3px solid transparent'}
						onclick={() => itemAktifIdx.set(idx)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') itemAktifIdx.set(idx);
						}}
					>
						<!-- Col 1: foto -->
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded"
							style="background:var(--surface2);border:1px solid var(--border)"
						>
							{#if item.foto_path}
								<img
									src={thumbUrl(item.foto_path) ?? ''}
									alt={item.nama_barang}
									class="h-full w-full object-cover"
								/>
							{:else}
								<span class="text-xs font-bold" style="color:var(--text-dim)"
									>{item.nama_barang.slice(0, 2).toUpperCase()}</span
								>
							{/if}
						</div>

						<!-- Col 2: detail -->
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<!-- Row 1: nama + tipe dropdown -->
							<div class="flex items-start justify-between gap-1">
								<span class="truncate text-sm leading-tight font-medium">{item.nama_barang}</span>
								<select
									value={item.tipe_harga}
									onchange={(e) => {
										e.stopPropagation();
										ubahTipeHarga(
											idx,
											(e.target as HTMLSelectElement).value as 'eceran' | 'grosir'
										);
									}}
									onclick={(e) => e.stopPropagation()}
									class="shrink-0 cursor-pointer rounded border px-1 py-0 text-xs font-bold outline-none"
									style="background:var(--surface2);border-color:var(--border);color:var(--accent)"
								>
									<option value="eceran">ECR</option>
									<option value="grosir">GRS</option>
								</select>
							</div>

							<!-- Row 2: kode_barang -->
							<div class="flex items-center justify-between gap-1">
								<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
								<span class="flex items-center text-xs" style="color:var(--text-dim)"
									>{rupiah(item.harga_jual)} <BadgeDollarSign size="0.8rem" class="ml-2" /></span
								>
							</div>

							<!-- Row 3: harga + stepper -->
							<div class="flex items-center justify-between gap-1">
								<div></div>
								<div class="flex w-fit items-center">
									{#if aktif}
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
											size={Math.max(1, String(item.diskon_item || 0).length)}
											class="item-center [field-sizing:content] h-[1.1rem] cursor-auto rounded border px-1 text-right text-xs outline-none"
											style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										/>
									{:else}
										<span class="h-[1.1rem] text-xs" style="color:var(--text-dim)" title="Diskon"
											>{rupiah(item.diskon_item)}</span
										>
									{/if}
									<TicketPercent size="0.8rem" class="ml-2" title="Diskon" />
								</div>
							</div>

							<!-- Row 4: diskon + subtotal -->
							<div class="flex items-center justify-between gap-1">
								<div class="flex items-center">
									<span class="w-fit text-xs">{item.jumlah}</span>
									<span class="ml-1 text-xs" style="color:var(--text-dim)"
										>{item.singkatan_satuan}</span
									>
									<button
										onclick={(e) => {
											e.stopPropagation();
											if (item.jumlah <= 1) konfirmasiHapusIdx.set(idx);
											else ubahJumlah(idx, -1);
										}}
										class={`ml-1 flex h-6 w-6 items-center justify-center rounded-l-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
										style="background:var(--surface);color:var(--text-dim)">−</button
									>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ubahJumlah(idx, 1);
										}}
										class={`ml-[1px] flex h-6 w-6 items-center justify-center rounded-r-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
										style="background:var(--surface);color:var(--text-dim)">+</button
									>

									<button
										onclick={(e) => {
											e.stopPropagation();
											konfirmasiHapusIdx.set(idx);
										}}
										aria-label="Hapus item"
										class={`ml-2 flex h-6 w-6 items-center justify-center rounded-full transition-opacity ${aktif ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
										style="background:var(--surface);color:var(--danger)"
									>
										<Trash2 size="0.8rem" />
									</button>
								</div>
								<span class="flex items-center text-xs"
									>{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
									<ReceiptText size="0.8rem" class="ml-2" /></span
								>
							</div>

							<!-- Row 5: info banner (slot untuk promo/notif per-item) -->
							<div class="info-banner empty:hidden"></div>
						</div>
					</div>
				{/each}

				<!-- Dummy row: tambah barang baru -->
				<div
					role="button"
					tabindex="0"
					class="flex cursor-pointer gap-2 px-2 py-2 transition-colors"
					style={$itemAktifIdx === $keranjang.length
						? 'background:var(--surface2);border-left:3px solid var(--accent)'
						: `border-left:3px solid transparent;opacity:0.4`}
					onclick={() => itemAktifIdx.set($keranjang.length)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') itemAktifIdx.set($keranjang.length);
					}}
				>
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded text-2xl"
						style="color:var(--text-dim)"
					>
						+
					</div>
					<div class="flex flex-1 flex-col gap-1">
						<button
							class="flex items-center gap-1 text-left text-sm italic"
							style="color:var(--text-dim)"
							onclick={(e) => {
								e.stopPropagation();
								openSearch();
							}}
						>
							Tambah barang... <Search size="1rem" /><ScanBarcode size="1rem" />
						</button>
						<div class="flex items-center gap-1">
							<button
								onclick={(e) => {
									e.stopPropagation();
									dummyJumlah.update((n: number) => Math.max(1, n - 1));
								}}
								class="flex h-6 w-6 items-center justify-center rounded-full text-xs leading-none font-bold"
								style="background:var(--surface);color:var(--text-dim)">−</button
							>
							<span class="w-8 text-center font-mono text-sm tabular-nums">{$dummyJumlah}</span>
							<button
								onclick={(e) => {
									e.stopPropagation();
									dummyJumlah.update((n: number) => n + 1);
								}}
								class="flex h-6 w-6 items-center justify-center rounded-full text-xs leading-none font-bold"
								style="background:var(--surface);color:var(--text-dim)">+</button
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Desktop table layout -->
			<div class="hidden h-full overflow-x-auto md:block">
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
											<Trash2 size="1rem" color="currentColor" />
										</button>
									{:else}
										{idx + 1}
									{/if}
								</td>
								<td class="px-1 py-2">
									<div class="flex items-center gap-1.5">
										<span class="truncate leading-tight">{item.nama_barang}</span>
										<select
											value={item.tipe_harga}
											onchange={(e) => {
												e.stopPropagation();
												ubahTipeHarga(
													idx,
													(e.target as HTMLSelectElement).value as 'eceran' | 'grosir'
												);
											}}
											onclick={(e) => e.stopPropagation()}
											class="shrink-0 cursor-pointer rounded border px-1 py-0 text-xs font-bold outline-none"
											style="background:var(--surface2);border-color:var(--border);color:var(--accent)"
										>
											<option value="eceran">ECR</option>
											<option value="grosir">GRS</option>
										</select>
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
										class={`absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-90' : 'pointer-events-none opacity-0'}`}
										style="background:var(--surface);color:var(--text-dim)">−</button
									>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ubahJumlah(idx, 1);
										}}
										class={`absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none font-bold transition-opacity ${visButtons ? 'opacity-90' : 'pointer-events-none opacity-0'}`}
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
										maxlength="8"
										size={Math.max(1, String(item.diskon_item || 0).length)}
										class="item-center [field-sizing:content] h-[1.1rem] cursor-auto [appearance:textfield] rounded border px-1 text-right text-xs outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
							<td class="px-1 py-2 text-center text-lg" style="color:var(--text-dim)">+</td>
							<td class="px-1 py-2">
								<button
									class="flex items-center gap-1 text-left text-sm italic"
									style="color:var(--text-dim)"
									onclick={(e) => {
										e.stopPropagation();
										openSearch();
									}}
								>
									Tambah barang...
									<Search size="1rem" /><ScanBarcode size="1rem" />
								</button>
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
