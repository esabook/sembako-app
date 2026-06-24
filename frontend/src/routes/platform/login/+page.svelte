<script lang="ts">
	import { goto } from '$app/navigation';
	import { padmin } from '../platform.api';
	import { toast } from '$lib/stores/ui.store';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;
		loading = true;
		const res = await padmin.post('/platform/login', { username: username.trim(), password });
		loading = false;
		if (res.success) goto('/platform/toko');
		else toast.error(res.error || 'Login gagal');
	}
</script>

<svelte:head>
	<title>Admin Platform · Stokasir</title>
</svelte:head>

<section class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
	<h1 class="text-2xl font-bold">Admin Platform</h1>
	<p class="mt-1 text-sm" style="color:var(--text-dim)">Operator lintas-tenant Stokasir.</p>

	<form class="mt-6 flex flex-col gap-4" onsubmit={submit}>
		<label class="block">
			<span class="mb-1 block text-xs" style="color:var(--text-dim)">Username</span>
			<input bind:value={username} class="input w-full text-sm" autocomplete="username" />
		</label>
		<label class="block">
			<span class="mb-1 block text-xs" style="color:var(--text-dim)">Password</span>
			<input
				bind:value={password}
				type="password"
				class="input w-full text-sm"
				autocomplete="current-password"
			/>
		</label>
		<button type="submit" class="btn mt-2 btn-primary" disabled={loading}>
			{loading ? 'Memproses…' : 'Masuk'}
		</button>
	</form>
</section>
