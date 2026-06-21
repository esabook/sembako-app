<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { keranjang } from '$lib/stores/kasir'
	import { ubahDiskon, loadOpenBills, switchToBill, closeBill, newBill, openBills } from '../kasir.store'
	import { rupiah } from '../kasir.logic'
	import { toast } from '$lib/stores/ui.store'
	import Percent from '@lucide/svelte/icons/percent'
	import Plus from '@lucide/svelte/icons/plus'
	import FileText from '@lucide/svelte/icons/file-text'

	const keranjangItems = $derived($keranjang)

	// ── Diskon per item ───────────────────────────────────────────────
	let diskonTipe = $state<'persen' | 'rupiah'>('persen')
	let diskonNilai = $state('')
	let diskonItemIdx = $state(-1)

	function applyDiskon() {
		const idx = diskonItemIdx
		if (idx < 0 || !diskonNilai) return
		const item = keranjangItems[idx]
		if (!item) return
		const val = parseFloat(diskonNilai)
		if (isNaN(val) || val < 0) return
		const diskon =
			diskonTipe === 'persen'
				? Math.min(Math.round((item.harga_jual * val) / 100), item.harga_jual)
				: Math.min(val, item.harga_jual)
		ubahDiskon(idx, String(Math.round(diskon)))
		toast.sukses(`Diskon diterapkan ke ${item.nama_barang}`)
		diskonNilai = ''
	}

	// ── Item manual ───────────────────────────────────────────────────
	let namaManual = $state('')
	let hargaManual = $state('')
	let jumlahManual = $state('1')

	function tambahItemManual() {
		const harga = parseInt(hargaManual.replace(/\D/g, '')) || 0
		const jumlah = Math.max(1, parseInt(jumlahManual) || 1)
		if (!namaManual.trim() || harga <= 0) {
			toast.error('Isi nama dan harga item')
			return
		}
		keranjang.update((k) => [
			...k,
			{
				barang_id: -Date.now(),
				nama_barang: namaManual.trim(),
				kode_barang: 'MANUAL',
				satuan_id: null,
				singkatan_satuan: 'pcs',
				stok_sekarang: 9999,
				harga_jual: harga,
				harga_eceran: harga,
				harga_grosir: harga,
				tipe_harga: 'eceran' as const,
				jumlah,
				diskon_item: 0
			}
		])
		toast.sukses('Item manual ditambahkan')
		namaManual = ''
		hargaManual = ''
		jumlahManual = '1'
		goto('/kasir')
	}

	// ── Open bills ────────────────────────────────────────────────────
	onMount(() => { void loadOpenBills() })

	async function bukaBill(id: number) {
		await switchToBill(id)
		goto('/kasir')
	}

	async function hapusBill(id: number) {
		await closeBill(id)
	}

	async function buatBillBaru() {
		await newBill()
		goto('/kasir')
	}

	function formatWaktu(iso: string): string {
		return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
	}
</script>

<div class="flex h-full flex-col overflow-auto p-4 sm:p-6">
	<h1 class="mb-4 text-base font-semibold sm:mb-6 sm:text-lg">Custom</h1>

	<div class="grid gap-4 sm:grid-cols-3">
		<!-- Tambah Diskon -->
		<div
			class="flex flex-col gap-3 rounded-2xl p-4 sm:p-5"
			style="background:var(--surface);border:1px solid var(--border)"
		>
			<div class="flex items-center gap-2">
				<Percent size={18} style="color:var(--accent)" />
				<span class="text-sm font-semibold">Tambah Diskon</span>
			</div>

			{#if keranjangItems.length === 0}
				<p class="text-xs" style="color:var(--text-dim)">Keranjang kosong</p>
			{:else}
				<select
					bind:value={diskonItemIdx}
					class="w-full rounded-lg border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				>
					<option value={-1} disabled>Pilih item</option>
					{#each keranjangItems as item, i (i)}
						<option value={i}>{item.nama_barang} — {rupiah(item.harga_jual)}</option>
					{/each}
				</select>

				<div class="flex gap-2">
					<div
						class="flex overflow-hidden rounded-lg border text-xs"
						style="border-color:var(--border)"
					>
						<button
							onclick={() => (diskonTipe = 'persen')}
							class="px-3 py-2 transition-colors"
							style={diskonTipe === 'persen'
								? 'background:var(--accent);color:#fff'
								: 'background:var(--bg);color:var(--text)'}
						>%</button>
						<button
							onclick={() => (diskonTipe = 'rupiah')}
							class="px-3 py-2 transition-colors"
							style={diskonTipe === 'rupiah'
								? 'background:var(--accent);color:#fff'
								: 'background:var(--bg);color:var(--text)'}
						>Rp</button>
					</div>
					<input
						type="number"
						bind:value={diskonNilai}
						placeholder={diskonTipe === 'persen' ? '0–100' : 'Nominal'}
						min="0"
						class="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
						style="background:var(--bg);border-color:var(--border);color:var(--text)"
					/>
				</div>

				<button
					onclick={applyDiskon}
					disabled={diskonItemIdx < 0 || !diskonNilai}
					class="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
					style="background:var(--accent)"
				>
					Terapkan Diskon
				</button>
			{/if}
		</div>

		<!-- Tambah Item Manual -->
		<div
			class="flex flex-col gap-3 rounded-2xl p-4 sm:p-5"
			style="background:var(--surface);border:1px solid var(--border)"
		>
			<div class="flex items-center gap-2">
				<Plus size={18} style="color:var(--accent)" />
				<span class="text-sm font-semibold">Tambah Item Manual</span>
			</div>

			<input
				type="text"
				bind:value={namaManual}
				placeholder="Nama item"
				class="w-full rounded-lg border px-3 py-2 text-sm"
				style="background:var(--bg);border-color:var(--border);color:var(--text)"
			/>
			<input
				type="number"
				bind:value={hargaManual}
				placeholder="Harga (Rp)"
				min="0"
				class="w-full rounded-lg border px-3 py-2 text-sm"
				style="background:var(--bg);border-color:var(--border);color:var(--text)"
			/>
			<input
				type="number"
				bind:value={jumlahManual}
				placeholder="Jumlah"
				min="1"
				class="w-full rounded-lg border px-3 py-2 text-sm"
				style="background:var(--bg);border-color:var(--border);color:var(--text)"
			/>
			<button
				onclick={tambahItemManual}
				class="mt-auto w-full rounded-lg py-2.5 text-sm font-medium text-white"
				style="background:var(--accent)"
			>
				Tambah ke Keranjang
			</button>
		</div>

		<!-- Tagihan Tertunda (Multi Open Bill) -->
		<div
			class="flex flex-col gap-3 rounded-2xl p-4 sm:p-5"
			style="background:var(--surface);border:1px solid var(--border)"
		>
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<FileText size={18} style="color:var(--accent)" />
					<span class="text-sm font-semibold">Tagihan Tertunda</span>
				</div>
				{#if $openBills.length > 0}
					<span class="rounded-full px-2 py-0.5 text-xs font-medium text-white" style="background:var(--accent)">
						{$openBills.length}
					</span>
				{/if}
			</div>

			{#if $openBills.length === 0}
				<p class="text-xs" style="color:var(--text-dim)">Belum ada tagihan yang ditunda.</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each $openBills as bill (bill.id)}
						<div
							class="flex items-center gap-2 rounded-xl p-2.5"
							style="background:var(--bg);border:1px solid var(--border)"
						>
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<div class="flex items-center gap-1.5">
									<span class="text-xs font-bold" style="color:var(--accent)">#{bill.nomor_bill}</span>
									{#if bill.label}
										<span class="truncate text-xs font-medium">{bill.label}</span>
									{/if}
									<span class="ml-auto shrink-0 text-xs" style="color:var(--text-dim)">{formatWaktu(bill.updated_at)}</span>
								</div>
								<div class="flex items-center gap-2 text-xs" style="color:var(--text-dim)">
									<span>{bill.jumlah_item} item</span>
									<span>·</span>
									<span class="font-medium" style="color:var(--text)">Rp {rupiah(bill.subtotal)}</span>
								</div>
							</div>
							<button
								onclick={() => void bukaBill(bill.id)}
								class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
								style="background:var(--accent)"
							>
								Lanjutkan
							</button>
							<button
								onclick={() => void hapusBill(bill.id)}
								class="shrink-0 rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-70"
								style="color:var(--text-dim)"
							>
								✕
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<button
				onclick={() => void buatBillBaru()}
				class="mt-auto w-full rounded-lg border py-2.5 text-sm font-medium transition-colors"
				style="border-color:var(--border);color:var(--text)"
			>
				+ Bill Baru
			</button>
		</div>
	</div>
</div>
