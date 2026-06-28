<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth';
	import { toast } from '$lib/stores/ui.store';
	import Button from '$lib/components/ui/Button.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

	type Sesi = {
		id: string;
		ip: string | null;
		perangkat: string | null;
		dibuat: string | null;
		berakhir: string | null;
		current: boolean;
	};

	let sesi = $state<Sesi[]>([]);
	let loading = $state(true);
	let revoking = $state<string | null>(null);
	let loggingOut = $state(false);
	let konfirmKeluar = $state(false);
	let cabutTarget = $state<string | null>(null); // sid sesi yg mau dicabut (buka dialog)

	// Logout perangkat ini = cabut sesi current + hapus cookie, lalu ke /login.
	async function keluarPerangkatIni() {
		loggingOut = true;
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		user.set(null);
		goto('/login');
	}

	// Sesi hanya ada bila akun punya identity better-auth (sudah ber-email & login
	// setelah migrasi). Akun lama tanpa email → daftar kosong.
	async function muat() {
		loading = true;
		try {
			const res = await fetch('/api/auth/sesi', { credentials: 'include' });
			const json = (await res.json()) as { success: boolean; data?: Sesi[] };
			sesi = json.success && json.data ? json.data : [];
		} catch {
			sesi = [];
		} finally {
			loading = false;
		}
	}

	async function cabut(id: string) {
		revoking = id;
		try {
			const res = await fetch(`/api/auth/sesi/${id}/cabut`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' }
			});
			const json = (await res.json()) as { success: boolean; error?: string };
			if (json.success) {
				sesi = sesi.filter((s) => s.id !== id);
				toast.sukses('Sesi perangkat dicabut');
			} else {
				toast.error(json.error ?? 'Gagal mencabut sesi');
			}
		} catch {
			toast.error('Gagal mencabut sesi');
		} finally {
			revoking = null;
		}
	}

	function fmtTanggal(iso: string | null): string {
		if (!iso) return '-';
		return new Date(iso).toLocaleString('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(muat);
</script>

<div class="flex flex-col gap-3">
	<div>
		<h3 class="text-sm font-bold">Perangkat & Sesi</h3>
		<p class="mt-0.5 text-xs" style="color:var(--text-dim)">
			Daftar perangkat yang masuk ke akunmu. Cabut sesi yang tak dikenali.
		</p>
	</div>

	{#if loading}
		<Skeleton w="100%" h="4rem" br="rounded-lg" />
		<Skeleton w="100%" h="4rem" br="rounded-lg" />
	{:else if sesi.length === 0}
		<div
			class="rounded border px-3 py-2 text-xs"
			style="border-color:var(--border);color:var(--text-dim)"
		>
			Belum ada sesi tercatat. Fitur ini aktif setelah akun memakai email & login ulang.
		</div>
	{:else}
		{#each sesi as s (s.id)}
			<div
				class="flex items-center justify-between gap-3 rounded border px-3 py-2"
				style="border-color:var(--border)"
			>
				<div class="min-w-0">
					{#if s.current}
						<span class="badge badge-xs badge-info">Perangkat ini</span>
					{/if}
					<div class="flex items-center gap-2">
						<span class="truncate text-sm font-medium"
							>{s.perangkat ?? 'Perangkat tak dikenal'}</span
						>
					</div>
					<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
						{s.ip || 'IP tak diketahui'} · masuk {fmtTanggal(s.dibuat)}
					</div>
				</div>
				{#if !s.current}
					<Button variant="danger" loading={revoking === s.id} onclick={() => (cabutTarget = s.id)}>
						Cabut
					</Button>
				{:else}
					<Button variant="danger" loading={loggingOut} onclick={() => (konfirmKeluar = true)}>
						Keluar
					</Button>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<ConfirmDialog
	bind:open={konfirmKeluar}
	judul="Keluar dari perangkat ini?"
	pesan="Kamu akan logout dan kembali ke halaman masuk."
	labelKiri="Batal"
	labelKanan="Keluar"
	warnaKanan="var(--danger)"
	onkanan={keluarPerangkatIni}
/>

<ConfirmDialog
	open={cabutTarget !== null}
	judul="Cabut sesi perangkat ini?"
	pesan="Perangkat tersebut akan diminta masuk ulang."
	labelKiri="Batal"
	labelKanan="Cabut"
	warnaKanan="var(--danger)"
	onkiri={() => (cabutTarget = null)}
	onkanan={() => {
		const id = cabutTarget;
		cabutTarget = null;
		if (id) cabut(id);
	}}
/>
