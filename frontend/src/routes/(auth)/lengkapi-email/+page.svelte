<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let loading = $state(false);
	let error = $state('');

	async function submit(e: Event) {
		e.preventDefault();
		error = '';
		const val = email.trim().toLowerCase();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
			error = 'Format email tidak valid.';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/auth/lengkapi-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: val })
			});
			const json = (await res.json()) as { success: boolean; error?: string };
			if (!json.success) throw new Error(json.error ?? 'Gagal menyimpan email');
			// Reload server load → gate perlu_email kini false.
			await goto('/dashboard', { invalidateAll: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal menyimpan email';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Lengkapi Email - Stokasir</title>
</svelte:head>

<div class="wrap">
	<div class="card">
		<h1>Lengkapi Email</h1>
		<p class="lead">
			Halo <strong>{data.user.nama}</strong>. Akun kamu belum punya email. Tambahkan email untuk
			mengamankan akun & mengaktifkan login modern (Google, kelola perangkat).
		</p>

		<form onsubmit={submit}>
			<label class="lbl" for="email">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				placeholder="nama@email.com"
				autocomplete="email"
				disabled={loading}
				required
			/>

			{#if error}
				<div class="err" role="alert">{error}</div>
			{/if}

			<button type="submit" class="btn btn-primary" disabled={loading}>
				{loading ? 'Menyimpan...' : 'Simpan Email'}
			</button>
		</form>
	</div>
</div>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 20px;
		background: var(--bg, #0b0b0c);
	}
	.card {
		width: 100%;
		max-width: 420px;
		background: var(--surface, #16171a);
		border: 1px solid var(--border, #2a2c31);
		border-radius: 12px;
		padding: 28px 24px;
	}
	h1 {
		margin: 0 0 8px;
		font-size: 20px;
		color: var(--text, #f1f1f1);
	}
	.lead {
		margin: 0 0 20px;
		font-size: 13px;
		line-height: 1.55;
		color: var(--muted, #a0a3aa);
	}
	.lbl {
		display: block;
		margin-bottom: 6px;
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--muted, #a0a3aa);
	}
	input {
		width: 100%;
		padding: 11px 13px;
		background: var(--surface2, #1d1f23);
		border: 1px solid var(--border, #2a2c31);
		border-radius: 8px;
		color: var(--text, #f1f1f1);
		font-size: 14px;
	}
	input:focus {
		outline: none;
		border-color: var(--primary, #4285f4);
	}
	.err {
		margin-top: 10px;
		padding: 8px 12px;
		background: color-mix(in srgb, var(--danger, #e5484d) 12%, transparent);
		border-left: 2px solid var(--danger, #e5484d);
		color: var(--danger, #e5484d);
		font-size: 12px;
	}
	.btn {
		margin-top: 16px;
		width: 100%;
		padding: 11px;
		background: var(--primary, #4285f4);
		border: none;
		border-radius: 8px;
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
