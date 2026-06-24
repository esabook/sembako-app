<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/ui.store';
	import { emailInput } from '$lib/actions/email';

	let email = $state('');
	let wa = $state('');

	function lanjut(ev: SubmitEvent) {
		ev.preventDefault();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
			toast.error('Format email tidak valid');
			return;
		}
		if (!/^[0-9+\s-]{8,}$/.test(wa.trim())) {
			toast.error('Nomor WhatsApp tidak valid');
			return;
		}
		const q = new URLSearchParams({ email: email.trim().toLowerCase(), wa: wa.trim() });
		goto(`/daftar?${q.toString()}`);
	}
</script>

<section class="mx-auto max-w-5xl px-4 py-12">
	<div class="px-4 text-center">
		<h2 class="text-xl font-bold sm:text-2xl">Cuma mau lihat-lihat dulu?</h2>
		<p class="mx-auto mt-2 max-w-2xl text-sm" style="color:var(--text-dim)">
			Isi email &amp; WhatsApp, lanjut coba di langkah berikutnya. Bisa pilih buka versi
			<strong style="color:var(--text)"> demo dengan data contoh </strong> tanpa repot isi data toko.
		</p>
	</div>
	<div
		class="mt-6 rounded-2xl border p-6 sm:p-8"
		style="border-color:var(--border);background:var(--surface, var(--bg))"
	>
		<form class="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row" onsubmit={lanjut}>
			<input
				type="email"
				bind:value={email}
				use:emailInput
				placeholder="nama@gmail.com"
				class="input w-full text-sm"
				aria-label="Email"
			/>
			<input
				type="tel"
				bind:value={wa}
				placeholder="08xxxxxxxxxx"
				class="input w-full text-sm"
				aria-label="No. WhatsApp"
			/>
			<button
				type="submit"
				class="btn shrink-0"
				style="background:var(--accent);color:var(--bg);border-color:var(--accent)"
			>
				Lanjut akses demo
			</button>
		</form>
	</div>
</section>
