<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function login(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const res = await api.post<{ id: number; nama: string; role: string }>(
			'/auth/login',
			{ username, password }
		);

		loading = false;

		if (!res.success) {
			error = res.error;
			return;
		}

		user.set(res.data as import('$lib/stores/auth.js').User);
		goto('/dashboard');
	}
</script>

<div class="min-h-screen flex items-center justify-center" style="background:var(--bg)">
	<div class="w-full max-w-sm p-8 rounded-lg border" style="background:var(--surface);border-color:var(--border)">
		<h1 class="text-xl font-bold mb-1" style="color:var(--accent)">TOKO SEMBAKO</h1>
		<p class="text-sm mb-8" style="color:var(--text-dim)">Masuk ke sistem</p>

		<form onsubmit={login} class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label class="text-xs" style="color:var(--text-dim)" for="username">USERNAME</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					autocomplete="username"
					required
					class="px-3 py-2 rounded border text-sm outline-none transition-colors"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs" style="color:var(--text-dim)" for="password">PASSWORD</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					required
					class="px-3 py-2 rounded border text-sm outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>

			{#if error}
				<p class="text-xs px-3 py-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="py-2 rounded text-sm font-bold transition-opacity disabled:opacity-50"
				style="background:var(--accent);color:var(--bg)"
			>
				{loading ? 'Memproses...' : 'MASUK'}
			</button>
		</form>
	</div>
</div>
