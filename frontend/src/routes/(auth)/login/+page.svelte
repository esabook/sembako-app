<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';

	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let rememberMe = $state(false);
	let loading = $state(false);
	let error = $state('');
	let attemptsLeft = $state(3);
	let showBrand = $state(true);
	let usernameInput!: HTMLInputElement;
	let passwordInput!: HTMLInputElement;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	let namaToko = $state('');
	let timeStr = $state('--:--:--');
	let dateStr = $state('');

	const IDLE_MS = 5000;
	const themes = ['dark', 'light', 'eye', 'bww', 'bwb'];

	function resetIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			if (password) {
				password = '';
				usernameInput?.focus();
			}
		}, IDLE_MS);
	}

	function nextTheme() {
		const html = document.documentElement;
		const current = html.getAttribute('data-theme') ?? 'dark';
		html.setAttribute('data-theme', themes[(themes.indexOf(current) + 1) % themes.length]);
	}

	function tick() {
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
		const mo = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
		dateStr = `${now.getDate()} ${mo[now.getMonth()]} ${now.getFullYear()}`;
	}

	function refocusIfNone() {
		requestAnimationFrame(() => {
			const el = document.activeElement;
			if (!el || el === document.body) usernameInput?.focus();
		});
	}

	onMount(() => {
		usernameInput?.focus();
		tick();
		const t = setInterval(tick, 1000);
		api.get<{ nama_toko: string }>('/pengaturan/publik').then((res) => {
			if (res.success && res.data.nama_toko) namaToko = res.data.nama_toko;
		});

		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'F2') { e.preventDefault(); nextTheme(); }
			if (e.key === 'F12') { e.preventDefault(); (document.getElementById('lf') as HTMLFormElement)?.requestSubmit(); }
		}
		window.addEventListener('keydown', onKeydown);
		document.addEventListener('click', refocusIfNone);

		return () => {
			clearInterval(t);
			if (idleTimer) clearTimeout(idleTimer);
			window.removeEventListener('keydown', onKeydown);
			document.removeEventListener('click', refocusIfNone);
		};
	});

	async function login(e: Event) {
		e.preventDefault();
		if (attemptsLeft <= 0) return;
		loading = true;
		error = '';

		const res = await api.post<{ id: number; nama: string; role: string }>(
			'/auth/login',
			{ username, password }
		);

		loading = false;

		if (!res.success) {
			attemptsLeft = Math.max(0, attemptsLeft - 1);
			error = res.error;
			return;
		}

		user.set(res.data as import('$lib/stores/auth.js').User);
		goto('/dashboard');
	}

	const navItems = ['Dashboard','Kasir','Pelanggan','Gudang','Karyawan','Keuangan','Laporan','Harga','Pengaturan'];
	const features: [string, string][] = [['F1–F12','Shortcut'],['USB/BT','Scanner'],['System','Lokal'],['4 Role','Jabatan']];
</script>

<div class="screen">

	<!-- ── Status strip (full-width, top of screen) ───── -->
	<div class="status-strip">
		<span class="s-item s-server">
			<span class="s-dot">●</span>
			SERVER <span class="s-val">192.168.1.42</span>
		</span>
		<span class="s-sep s-server">│</span>
		<span class="s-val tnum">{dateStr} · {timeStr}</span>
		<span class="grow"></span>
		<span class="s-item">VERSI <span class="s-val">1.0</span></span>
		<span class="s-sep">│</span>
		<span class="s-item">{namaToko}</span>
	</div>

	<!-- ── Modal layer ────────────────────────────────── -->
	<div class="modal-layer">
		<div class="modal">

			<!-- Body -->
			<div class="modal-body">

				<!-- TOP: brand panel -->
				<div class="brand-panel" class:brand-vis={showBrand}>
					<div class="brand-inner">
						<div class="brand-head">
							<img src="logo.png" alt="" class="brand-logo" />
							<span class="brand-name">{namaToko}</span>
						</div>
						<div class="brand-tagline">POS · GUDANG · PELANGGAN · KEUANGAN · ALERT</div>
						<p class="hl-desc">
							Server offline di belakang meja kasir. Login dari laptop atau HP yang
							tersambung WiFi toko.
						</p>
						<span class="grow"></span>
						<div class="feat-grid">
							{#each features as [key, label], i (key)}
								<div class="feat-cell" class:feat-first={i === 0}>
									<div class="feat-key">{key}</div>
									<div class="feat-lbl">{label}</div>
								</div>
							{/each}
						</div>
						<div class="role-row">
							<span class="role-bracket">▷</span>
							<span>Role :</span>
							<span class="r">pemilik</span><span class="rsep">·</span>
							<span class="r">manajer</span><span class="rsep">·</span>
							<span class="r">kasir</span><span class="rsep">·</span>
							<span class="r">gudang</span>
						</div>
					</div>
				</div>

				<!-- Toggle between brand and form -->
				<button
					class="toggle-btn"
					class:toggle-open={showBrand}
					onclick={() => (showBrand = !showBrand)}
					title={showBrand ? 'Sembunyikan info' : 'Tampilkan info'}
				>
					<span class="tgl-icon">
						<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.28 16.532.073-.084a.75.75 0 0 0-.073-.977l-2.72-2.72h6.69l.102-.006A.75.75 0 0 0 17 12l-.006-.101a.75.75 0 0 0-.744-.649H9.56l2.722-2.72.072-.084a.75.75 0 0 0-1.133-.977l-4.001 4-.073.084a.75.75 0 0 0 .073.977l4 4 .085.073a.75.75 0 0 0 .976-.072ZM12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10Zm0 18.5a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17Z" fill="#fff"/></svg>
					</span>
				</button>

				<!-- BOTTOM: form panel -->
				<div class="form-panel">
						<div class="f-sub">MASUK / SIGN-IN</div>
						<h2 class="f-title">Selamat datang kembali.</h2>

						<form id="lf" onsubmit={login} autocomplete="off">
							<div class="field">
								<div class="field-lbl">USERNAME</div>
								<div class="field-wrap accent-left">
									<span class="field-caret">›</span>
									<input
										type="text"
										bind:value={username}
										bind:this={usernameInput}
										autocomplete="off"
										name="sembako-user"
										required
										disabled={loading || attemptsLeft <= 0}
										class="field-input"
										placeholder="username"
										oninput={resetIdleTimer}
										onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); passwordInput?.focus(); } }}
									/>
								</div>
							</div>

							<div class="field">
								<div class="field-lbl">PASSWORD</div>
								<div class="field-wrap">
									<input
										type={showPassword ? 'text' : 'password'}
										bind:value={password}
										bind:this={passwordInput}
										autocomplete="new-password"
										name="sembako-pass"
										required
										disabled={loading || attemptsLeft <= 0}
										class="field-input"
										placeholder="••••••••"
										oninput={resetIdleTimer}
										onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('lf') as HTMLFormElement)?.requestSubmit(); } }}
									/>
									<button
										type="button"
										class="pw-btn"
										onclick={() => (showPassword = !showPassword)}
										tabindex="-1"
									>{showPassword ? 'HIDE' : 'SHOW'}</button>
								</div>
							</div>

							<div class="form-opts">
								<label class="remember-lbl" for="remember">
									<input type="checkbox" id="remember" bind:checked={rememberMe} class="sr-only" />
									<span class="checkbox" aria-hidden="true">
										{#if rememberMe}<span class="chk">✓</span>{/if}
									</span>
									Ingat saya 8 jam
								</label>
								<button type="button" class="forgot-btn">Lupa password?</button>
							</div>

							{#if error}
								<div class="err-row" role="alert">
									<span class="err-tag">ERR</span>
									{error}
								</div>
							{/if}
						</form>

						<span class="grow"></span>
					</div>
			</div>

			<!-- Footer actions -->
			<div class="modal-footer">
				<button type="button" class="ghost-btn" onclick={nextTheme}>
					TEMA <kbd class="kbd">F2</kbd>
				</button>
				<button type="button" class="ghost-btn">
					SCAN KARTU <kbd class="kbd">F9</kbd>
				</button>
				<span class="grow"></span>
				{#if attemptsLeft < 3}
					<span class="attempts">{attemptsLeft} percobaan tersisa</span>
				{/if}
				<button
					type="button"
					class="primary-btn"
					disabled={loading || attemptsLeft <= 0}
					onclick={() => (document.getElementById('lf') as HTMLFormElement)?.requestSubmit()}
				>
					{loading ? 'MEMPROSES...' : 'MASUK'}
					<kbd class="kbd-inv">F12</kbd>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Base ─────────────────────────────────────────── */
	.screen {
		position: fixed;
		inset: 0;
		overflow: hidden;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		background: var(--bg);
		color: var(--text);
	}

	.grow { flex: 1; }

	/* ── Status strip (fixed, full width, top) ───────── */
	.status-strip {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 30px;
		padding: 0 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 11px;
		color: var(--text-dim);
		background: var(--surface2);
		border-bottom: 1px solid var(--border);
		letter-spacing: 0.04em;
		white-space: nowrap;
		overflow: hidden;
		z-index: 10;
	}

	/* ── Modal layer ──────────────────────────────────── */
	.modal-layer {
		position: absolute;
		top: 30px;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 24px;
		overflow-y: auto;
	}

	.modal {
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text);
		width: 860px;
		max-width: 100%;
		margin: auto 0;
	}
	.s-dot  { color: var(--accent); }
	.s-val  { color: var(--text); }
	.s-sep  { color: var(--border); }
	.s-item { display: inline-flex; align-items: center; gap: 6px; }
	.tnum   { font-feature-settings: 'tnum'; }

	/* ── Modal body ───────────────────────────────────── */
	.modal-body {
		display: flex;
		flex-direction: row;
		min-height: 420px;
		position: relative;
	}

	/* Toggle button */
	.toggle-btn {
		position: relative;
		flex-shrink: 0;
		width: 28px;
		align-self: stretch;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		overflow: visible;
		z-index: 2;
		transition: width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	/* Dashed divider — only when expanded */
	.toggle-btn.toggle-open::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		transform: translateX(-50%);
		width: 1px;
		background: repeating-linear-gradient(
			to bottom,
			var(--border) 0px,
			var(--border) 4px,
			transparent 4px,
			transparent 8px
		);
	}

	/* Icon (SVG placeholder) */
	.tgl-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		z-index: 3;
		user-select: none;
		transition: color 0.15s, transform 0.15s;
	}
	.toggle-btn:hover .tgl-icon { color: var(--accent); }

	/* Collapsed desktop: half-circle tab on left edge */
	.toggle-btn:not(.toggle-open) { width: 16px; }
	.toggle-btn:not(.toggle-open) .tgl-icon {
		left: 0;
		transform: translateY(-50%) rotate(180deg);
	}

	/* ── Brand panel (left, width-transition collapse) ── */
	.brand-panel {
		flex-shrink: 0;
		width: 460px;
		max-width: 460px;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
		transition: max-width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1), opacity 0.2s;
	}
	.brand-panel.brand-vis {
		opacity: 1;
		pointer-events: auto;
	}
	.brand-panel:not(.brand-vis) {
		max-width: 0;
		border-right-color: transparent;
	}

	.brand-inner {
		width: 460px;
		box-sizing: border-box;
		padding: 32px 36px 28px;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.brand-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 2px;
		position: relative;
	}
	.brand-logo { width: 36px; height: 36px; }
	.brand-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--accent);
		letter-spacing: 0.18em;
	}

	.brand-tagline {
		font-size: 10px;
		color: var(--text-dim);
		letter-spacing: 0.1em;
		margin-bottom: 16px;
	}

	.hl-desc {
		font-size: 12px;
		color: var(--text-dim);
		margin-top: 0;
		margin-bottom: 16px;
		line-height: 1.6;
	}

	/* Feature ticker */
	.feat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-top: 1px solid var(--border);
		padding-top: 14px;
		position: relative;
	}
	.feat-cell {
		border-right: 1px solid var(--border);
		padding-left: 12px;
		padding-right: 12px;
	}
	.feat-cell:last-child { border-right: none; }
	.feat-first { padding-left: 0; }
	.feat-key { font-size: 13px; font-weight: 700; color: var(--text); }
	.feat-lbl {
		font-size: 9px;
		color: var(--text-dim);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-top: 2px;
	}

	/* Role list */
	.role-row {
		margin-top: 10px;
		font-size: 10px;
		color: var(--text-dim);
		letter-spacing: 0.08em;
		position: relative;
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		border: 1px solid var(--border);
		padding: 6px 8px;
	}
	.role-bracket { color: var(--border); }
	.r    { color: var(--text-dim); }
	.rsep { color: var(--border); }

	/* ── Form panel ───────────────────────────────────── */
	.form-panel {
		flex: 1;
		min-width: 340px;
		box-sizing: border-box;
		padding: 32px 36px 28px;
		display: flex;
		flex-direction: column;
	}

	.f-sub {
		font-size: 10px;
		color: var(--text-dim);
		letter-spacing: 0.18em;
		margin-bottom: 4px;
	}
	.f-title {
		margin: 0 0 22px;
		font-size: 22px;
		font-weight: 700;
		color: var(--text);
	}

	.field { margin-bottom: 14px; }
	.field-lbl {
		font-size: 9px;
		color: var(--text-dim);
		letter-spacing: 0.16em;
		margin-bottom: 5px;
	}

	.field-wrap {
		background: var(--bg);
		border: 1px solid var(--border);
		border-left: 2px solid var(--border);
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--text);
	}
	.field-wrap.accent-left { border-left-color: var(--accent); }

	.field-caret { color: var(--accent); flex-shrink: 0; }

	.field-input {
		background: none;
		border: none;
		color: var(--text);
		font-family: inherit;
		font-size: 14px;
		outline: none;
		flex: 1;
		min-width: 0;
	}
	.field-input::placeholder { color: var(--text-dim); opacity: 0.4; }
	.field-input:disabled { opacity: 0.6; }

	.pw-btn {
		background: none;
		border: none;
		color: var(--text-dim);
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.08em;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}
	.pw-btn:hover { color: var(--text); }

	/* Options row */
	.form-opts {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2px;
		margin-bottom: 8px;
	}

	.remember-lbl {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--text-dim);
		cursor: pointer;
		user-select: none;
	}
	.checkbox {
		width: 14px;
		height: 14px;
		border: 1px solid var(--border);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--surface2);
		font-size: 10px;
		flex-shrink: 0;
	}
	.chk { color: var(--accent); }

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.forgot-btn {
		background: none;
		border: none;
		font-family: inherit;
		font-size: 11px;
		color: var(--text-dim);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
		padding: 0;
	}

	.err-row {
		font-size: 11px;
		color: var(--danger);
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
	}
	.err-tag {
		font-size: 9px;
		font-weight: 700;
		border: 1px solid var(--danger);
		padding: 0 4px;
		letter-spacing: 0.06em;
		flex-shrink: 0;
	}

	/* ── Footer ───────────────────────────────────────── */
	.modal-footer {
		border-top: 1px solid var(--border);
		background: var(--surface2);
		padding: 14px 18px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.ghost-btn {
		background: transparent;
		color: var(--text);
		border: 1px solid var(--border);
		padding: 8px 12px;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.ghost-btn:hover { border-color: var(--text-dim); }

	.kbd {
		font-family: inherit;
		background: var(--bg);
		color: var(--text-dim);
		border: 1px solid var(--border);
		font-size: 9px;
		padding: 1px 5px;
		font-weight: 700;
	}

	.attempts {
		font-size: 10px;
		color: var(--text-dim);
		letter-spacing: 0.06em;
		margin-right: 4px;
	}

	.primary-btn {
		background: var(--accent);
		color: var(--bg);
		border: 1px solid var(--accent);
		padding: 10px 18px;
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.14em;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.primary-btn:not(:disabled):hover { opacity: 0.85; }
	.primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

	.kbd-inv {
		font-family: inherit;
		background: rgba(0, 0, 0, 0.22);
		color: var(--bg);
		font-size: 9px;
		padding: 2px 6px;
		font-weight: 700;
	}

	/* ── Responsive — Medium 601–860px (top-bottom, brand visible) ── */
	@media (max-width: 860px) and (min-width: 601px) {
		.modal-body {
			flex-direction: column;
			min-height: auto;
		}

		/* Brand panel: switch collapse ke max-height */
		.brand-panel {
			width: 100%;
			max-width: none !important;
			border-right: none;
			max-height: 600px;
			transition: max-height 0.3s cubic-bezier(0.2, 0.7, 0.3, 1), opacity 0.2s;
		}
		.brand-panel:not(.brand-vis) {
			max-width: none !important;
			max-height: 0;
			opacity: 0;
			border-bottom: none;
		}
		.brand-inner { width: 100%; height: auto; }

		/* Reset desktop collapsed overrides */
		.toggle-btn:not(.toggle-open) { width: 100%; }
		.toggle-btn:not(.toggle-open) .tgl-icon { left: 50%; }

		/* Toggle: horizontal bar */
		.toggle-btn {
			width: 100%;
			height: 36px;
			background: transparent;
		}

		/* Horizontal dashed line when expanded */
		.toggle-btn.toggle-open::before {
			display: block;
			top: 50%;
			left: 0;
			right: 0;
			bottom: auto;
			transform: translateY(-50%);
			width: 100%;
			height: 1px;
			background: repeating-linear-gradient(
				to right,
				var(--border) 0px,
				var(--border) 4px,
				transparent 4px,
				transparent 8px
			);
		}
		.toggle-btn:not(.toggle-open)::before { display: none; }

		/* Icon: always centered, rotate for direction */
		.tgl-icon {
			position: absolute;
			top: 50%;
			left: 50%;
		}
		.toggle-btn.toggle-open .tgl-icon    { transform: translate(-50%, -50%) rotate(90deg); }
		.toggle-btn:not(.toggle-open) .tgl-icon { transform: translate(-50%, -50%) rotate(-90deg); }

		.form-panel { flex: 1 1 auto; min-width: 0; }
	}

	/* ── Responsive — Mobile ≤600px ───────────────────── */
	@media (max-width: 600px) {
		.s-server { display: none; }

		.modal-layer {
			padding: 0;
			align-items: stretch;
		}

		.modal {
			width: 100%;
			border-left: none;
			border-right: none;
			border-bottom: none;
			margin: 0;
		}

		.modal-body {
			flex-direction: column;
			min-height: auto;
		}

		.brand-panel { display: none; }
		.toggle-btn  { display: none; }

		.form-panel {
			flex: 1 1 auto;
			min-width: 0;
			padding: 24px 20px 20px;
		}

		.field-input { font-size: 16px; }
		.field-wrap  { font-size: 16px; }

		.primary-btn {
			flex: 1;
			justify-content: center;
			padding: 14px 18px;
		}

		.modal-footer { flex-wrap: wrap; }
		.ghost-btn    { display: none; }
	}
</style>
