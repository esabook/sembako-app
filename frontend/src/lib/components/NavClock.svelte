<script lang="ts">
	import { onMount } from 'svelte';

	let waktu = $state('');
	let tanggal = $state('');
	let bukaKalender = $state(false);
	let bulanKalender = $state(new Date());
	let interval: ReturnType<typeof setInterval>;
	let ref: HTMLDivElement;

	const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
	const BULAN_LABEL = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];

	function perbarui() {
		const now = new Date();
		waktu = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
		tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
	}

	function hariDalamBulan(tgl: Date) {
		const tahun = tgl.getFullYear();
		const bulan = tgl.getMonth();
		const pertama = new Date(tahun, bulan, 1).getDay();
		const total = new Date(tahun, bulan + 1, 0).getDate();
		const sel: (number | null)[] = Array(pertama).fill(null);
		for (let i = 1; i <= total; i++) sel.push(i);
		while (sel.length % 7 !== 0) sel.push(null);
		return sel;
	}

	function bulanSebelum() {
		bulanKalender = new Date(bulanKalender.getFullYear(), bulanKalender.getMonth() - 1, 1);
	}

	function bulanBerikut() {
		bulanKalender = new Date(bulanKalender.getFullYear(), bulanKalender.getMonth() + 1, 1);
	}

	function keHariIni() {
		bulanKalender = new Date();
	}

	function tutupJikaLuar(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) bukaKalender = false;
	}

	onMount(() => {
		perbarui();
		interval = setInterval(perbarui, 1000);
		document.addEventListener('click', tutupJikaLuar);
		return () => {
			clearInterval(interval);
			document.removeEventListener('click', tutupJikaLuar);
		};
	});

	const sekarang = new Date();
	$effect(() => { bulanKalender; }); // track reaktif

	function isHariIni(hari: number | null) {
		if (!hari) return false;
		const now = new Date();
		return (
			hari === now.getDate() &&
			bulanKalender.getMonth() === now.getMonth() &&
			bulanKalender.getFullYear() === now.getFullYear()
		);
	}
</script>

<div class="relative" bind:this={ref}>
	<button
		onclick={() => bukaKalender = !bukaKalender}
		class="flex flex-col items-end px-2 py-0.5 rounded transition-colors leading-tight"
		style="color:var(--text-dim)"
	>
		<span class="text-xs font-mono tracking-wide" style="color:var(--text)">{waktu}</span>
		<span class="text-[0.7em]">{tanggal}</span>
	</button>

	{#if bukaKalender}
		<div
			class="absolute right-0 top-full mt-1 z-50 rounded border shadow-lg p-3 w-64"
			style="background:var(--surface);border-color:var(--border)"
		>
			<!-- Header bulan -->
			<div class="flex items-center justify-between mb-2">
				<button
					onclick={bulanSebelum}
					class="w-6 h-6 flex items-center justify-center rounded text-sm"
					style="color:var(--text-dim)"
				>‹</button>
				<button
					onclick={keHariIni}
					class="text-xs font-medium"
					style="color:var(--text)"
				>{BULAN_LABEL[bulanKalender.getMonth()]} {bulanKalender.getFullYear()}</button>
				<button
					onclick={bulanBerikut}
					class="w-6 h-6 flex items-center justify-center rounded text-sm"
					style="color:var(--text-dim)"
				>›</button>
			</div>

			<!-- Label hari -->
			<div class="grid grid-cols-7 mb-1">
				{#each HARI as h (h)}
					<span class="text-center text-[0.7em]" style="color:var(--text-dim)">{h}</span>
				{/each}
			</div>

			<!-- Grid tanggal -->
			<div class="grid grid-cols-7 gap-y-0.5">
				{#each hariDalamBulan(bulanKalender) as hari, i (i)}
					<div class="flex items-center justify-center h-7">
						{#if hari}
							<span
								class="w-6 h-6 flex items-center justify-center rounded-full text-xs"
								style={isHariIni(hari)
									? 'background:var(--accent);color:var(--bg);font-weight:700'
									: 'color:var(--text)'}
							>{hari}</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Jam realtime -->
			<div class="mt-2 pt-2 text-center text-xs font-mono" style="border-top:1px solid var(--border);color:var(--text-dim)">
				{waktu}
			</div>
		</div>
	{/if}
</div>
