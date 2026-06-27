<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { api } from '$lib/utils/api.js';
	import { TIER_COLOR, TIER_LABEL, type KartuResult, type Pelanggan } from '../pelanggan.helpers.js';

	let {
		open = $bindable(false),
		target = null as Pelanggan | null,
		onSuccess
	}: {
		open: boolean;
		target?: Pelanggan | null;
		onSuccess: () => void;
	} = $props();

	let searchQ = $state('');
	let searchResults = $state<KartuResult[]>([]);
	let searchLoading = $state(false);
	let selectedId = $state<number | null>(null);
	let selectedLabel = $state('');
	let err = $state('');

	$effect(() => {
		if (!open) return;
		searchQ = '';
		searchResults = [];
		selectedId = null;
		selectedLabel = '';
		err = '';
	});

	async function cari() {
		if (searchQ.length < 3) { searchResults = []; return; }
		searchLoading = true;
		const res = await api.get<KartuResult[]>(`/kartu-anggota?status=available&q=${searchQ}`);
		if (res.success) searchResults = res.data;
		searchLoading = false;
	}

	function pilih(k: KartuResult) {
		selectedId = k.id;
		selectedLabel = `${k.no_kartu} · ${TIER_LABEL[k.tier]}${k.diskon_member > 0 ? ` · −${k.diskon_member}%` : ''}`;
		searchResults = [];
		searchQ = '';
	}

	async function simpan() {
		err = '';
		if (!target || !selectedId) { err = 'Pilih kartu terlebih dahulu'; return; }
		const res = await api.post(`/pelanggan/${target.id}/assign-kartu`, { kartu_id: selectedId });
		if (!res.success) { err = (res as { success: false; error: string }).error; return; }
		open = false;
		onSuccess();
	}
</script>

<SlideOver bind:open title="Assign Kartu — {target?.nama ?? ''}">
	<div class="space-y-3">
		{#if selectedId}
			<div
				class="flex items-center justify-between rounded border p-2.5"
				style="background:var(--surface2);border-color:var(--border)"
			>
				<div class="text-sm">
					<span class="font-mono font-bold" style="color:var(--accent)">
						{selectedLabel.split(' · ')[0]}
					</span>
					<span class="ml-2 text-xs" style="color:var(--text-dim)">
						{selectedLabel.split(' · ').slice(1).join(' · ')}
					</span>
				</div>
				<Button variant="ghost" size="xs" onclick={() => { selectedId = null; selectedLabel = ''; }}>
					Ganti
				</Button>
			</div>
		{:else}
			<div>
				<label for="kartu-cari" class="mb-1 block text-xs" style="color:var(--text-dim)">
					Cari No. Kartu (min. 3 digit)
				</label>
				<div class="relative">
					<input
						id="kartu-cari"
						bind:value={searchQ}
						oninput={cari}
						placeholder="Ketik min. 3 digit nomor kartu..."
						class="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1"
						style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"
					/>
					{#if searchLoading}
						<p class="mt-1 text-xs" style="color:var(--text-dim)">Mencari...</p>
					{:else if searchResults.length > 0}
						<div
							class="absolute top-full right-0 left-0 z-20 mt-1 max-h-48 overflow-y-auto rounded border shadow-lg"
							style="background:var(--surface);border-color:var(--border)"
						>
							{#each searchResults as k (k.id)}
								<button
									onclick={() => pilih(k)}
									class="w-full border-t px-3 py-2 text-left text-xs"
									style="border-color:var(--border)"
								>
									<span class="font-mono font-bold" style="color:var(--accent)">{k.no_kartu}</span>
									<span class="ml-2 font-bold" style={TIER_COLOR[k.tier]}>{TIER_LABEL[k.tier]}</span>
									{#if k.diskon_member > 0}
										<span class="ml-2" style="color:var(--accent)">−{k.diskon_member}%</span>
									{/if}
									<span class="ml-2" style="color:var(--info)">{k.poin} poin</span>
								</button>
							{/each}
						</div>
					{:else if searchQ.length >= 3}
						<p class="mt-1 text-xs" style="color:var(--warn)">
							Tidak ada kartu tersedia dengan nomor tersebut.
						</p>
					{:else if searchQ.length > 0}
						<p class="mt-1 text-xs" style="color:var(--text-dim)">Ketik minimal 3 digit.</p>
					{/if}
				</div>
			</div>
			<p class="text-xs" style="color:var(--text-dim)">
				Belum ada kartu? Generate dulu di tab Kartu Anggota.
			</p>
		{/if}

		{#if err}<p class="text-xs" style="color:var(--danger)">{err}</p>{/if}
		<div class="flex justify-end gap-2 pt-1">
			<Button variant="ghost" onclick={() => (open = false)}>Batal</Button>
			{#if selectedId}
				<Button onclick={simpan}>Assign</Button>
			{/if}
		</div>
	</div>
</SlideOver>
