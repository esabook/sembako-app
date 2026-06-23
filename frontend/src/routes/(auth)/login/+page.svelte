<script lang="ts">
	import { onMount } from 'svelte';
	import { tema, nextTema } from '$lib/stores/tema';
	import { createLoginStore } from './login.store.svelte';
	import { env } from '$env/dynamic/public';
	import CircleArrowRight from '@lucide/svelte/icons/circle-arrow-right';

	const store = createLoginStore();

	// Daftar mandiri hanya di mode cloud/online; LAN tetap dibuat admin.
	const bisaDaftar = env.PUBLIC_DEPLOYMENT_MODE === 'online';

	let usernameInput!: HTMLInputElement;
	let passwordInput!: HTMLInputElement;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	const IDLE_MS = 5000;

	const features: [string, string][] = [
		['F1–F12', 'Shortcut'],
		['USB/BT', 'Scanner'],
		['System', 'Lokal'],
		['4 Role', 'Jabatan']
	];

	function resetIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			if (store.password) {
				store.clearPassword();
				usernameInput?.focus();
			}
		}, IDLE_MS);
	}

	function refocusIfNone() {
		requestAnimationFrame(() => {
			const el = document.activeElement;
			if (!el || el === document.body) usernameInput?.focus();
		});
	}

	onMount(() => {
		usernameInput?.focus();
		store.tick(new Date());
		store.muatInfo(window.location.hostname);
		const t = setInterval(() => store.tick(new Date()), 1000);

		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'F2') {
				e.preventDefault();
				nextTema($tema);
			}
			if (e.key === 'F12') {
				e.preventDefault();
				(document.getElementById('lf') as HTMLFormElement)?.requestSubmit();
			}
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
</script>

<svelte:head>
	<title>Login - Stokasir</title>
	<meta
		name="description"
		content="Login to Stokasir - Aplikasi manajemen stok-kasir untuk toko grosir dan eceran. Kelola stok, kasir, gudang, dan keuangan dengan mudah."
	/>
</svelte:head>

<div class="screen">
	<!-- ── Status strip (full-width, top of screen) ───── -->
	<!-- 	<div class="status-strip">
		<span class="s-item s-server">
			<span class="s-dot">●</span>
			SERVER <span class="s-val">{store.serverIP}</span>
		</span>
		<span class="s-sep s-server">│</span>
		<span class="s-val tnum">{store.dateStr} · {store.timeStr}</span>
		<span class="grow"></span>
		<span class="s-item">VERSI <span class="s-val">1.0</span></span>
		<span class="s-sep">│</span>
		<span class="s-item">{store.namaToko}</span>
	</div> -->

	<!-- ── Modal layer ────────────────────────────────── -->
	<div class="modal-layer">
		<div class="lcard">
			<!-- Body -->
			<div class="modal-body">
				<!-- TOP: brand panel -->
				<div class="brand-panel" class:brand-vis={store.showBrand}>
					<div class="brand-inner">
						<a href="/" class="brand-head">
							<enhanced:img
								src="$lib/assets/logo.webp"
								alt=""
								class="brand-logo"
								fetchpriority="high"
							/>
							<span class="brand-name">Stokasir</span>
						</a>
						<div class="brand-tagline">POS · GUDANG · PELANGGAN · KEUANGAN · ALERT</div>
						<p class="hl-desc">
							Server offline di belakang meja kasir. Login dari laptop atau HP yang tersambung ke
							WiFi toko. Mendukung server online untuk transaksi dimana saja.
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
					class:toggle-open={store.showBrand}
					onclick={() => (store.showBrand = !store.showBrand)}
					title={store.showBrand ? 'Sembunyikan info' : 'Tampilkan info'}
				>
					<span class="tgl-icon" style="background:var(--surface2);border-radius:50%">
						<CircleArrowRight size="24px" />
					</span>
				</button>

				<!-- BOTTOM: form panel -->
				<div class="form-panel">
					<div class="f-sub">MASUK / SIGN-IN</div>
					<h2 class="f-title">Selamat datang kembali.</h2>

					<form id="lf" onsubmit={store.login} autocomplete="off">
						<div class="field">
							<div class="field-lbl">USERNAME / EMAIL</div>
							<div class="field-wrap accent-left">
								<span class="field-caret">›</span>
								<input
									type="text"
									bind:value={store.username}
									bind:this={usernameInput}
									autocomplete="off"
									name="stokasir-user"
									required
									disabled={store.loading || store.attemptsLeft <= 0}
									class="field-input"
									placeholder="username"
									oninput={resetIdleTimer}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											passwordInput?.focus();
										}
									}}
								/>
							</div>
						</div>

						<div class="field">
							<div class="field-lbl">PASSWORD</div>
							<div class="field-wrap">
								<input
									type={store.showPassword ? 'text' : 'password'}
									bind:value={store.password}
									bind:this={passwordInput}
									autocomplete="new-password"
									name="stokasir-pass"
									required
									disabled={store.loading || store.attemptsLeft <= 0}
									class="field-input"
									placeholder="••••••••"
									oninput={resetIdleTimer}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											(document.getElementById('lf') as HTMLFormElement)?.requestSubmit();
										}
									}}
								/>
								<button
									type="button"
									class="pw-btn"
									onclick={() => (store.showPassword = !store.showPassword)}
									tabindex="-1">{store.showPassword ? 'HIDE' : 'SHOW'}</button
								>
							</div>
						</div>

						<div class="form-opts">
							<label class="remember-lbl" for="remember">
								<input
									type="checkbox"
									id="remember"
									bind:checked={store.rememberMe}
									class="sr-only"
									style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
								/>
								<span class="checkbox" aria-hidden="true">
									{#if store.rememberMe}<span class="chk">✓</span>{/if}
								</span>
								Ingat saya 8 jam
							</label>
							<button type="button" class="forgot-btn">Lupa password?</button>
						</div>
					</form>

					<span class="grow"></span>
					{#if bisaDaftar}
						<div class="signup-row grid grid-cols-1 items-end">
							Belum punya akun?
							<a href="/daftar" class="signup-link">Daftar toko baru</a>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer actions -->
			<div class="modal-footer">
				<button type="button" class="ghost-btn" onclick={() => nextTema($tema)}>
					TEMA <kbd class="kbd">F2</kbd>
				</button>
				<!-- <button type="button" class="ghost-btn">
					SCAN KARTU <kbd class="kbd">F9</kbd>
				</button> -->
				<span class="grow"></span>
				{#if store.attemptsLeft < 3}
					<span class="attempts">{store.attemptsLeft} percobaan tersisa</span>
				{/if}
				<button
					type="button"
					class="primary-btn"
					disabled={store.loading || store.attemptsLeft <= 0}
					onclick={() => (document.getElementById('lf') as HTMLFormElement)?.requestSubmit()}
				>
					{store.loading ? 'MEMPROSES...' : 'MASUK'}
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
		font-family: inherit;
		background: var(--bg);
		color: var(--text);
	}

	.grow {
		flex: 1;
	}

	/* ── Status strip (fixed, full width, top) ───────── */
	/* .status-strip {
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
	} */

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

	.lcard {
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text);
		width: 860px;
		max-width: 100%;
		margin: auto 0;
	}
	/* .s-dot {
		color: var(--accent);
	}
	.s-val {
		color: var(--text);
	}
	.s-sep {
		color: var(--border);
	}
	.s-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.tnum {
		font-feature-settings: 'tnum';
	} */

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
		transition:
			color 0.15s,
			transform 0.15s;
	}
	.toggle-btn:hover .tgl-icon {
		color: var(--accent);
	}

	/* Collapsed desktop: half-circle tab on left edge */
	.toggle-btn:not(.toggle-open) {
		width: 16px;
	}
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
		transition:
			max-width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1),
			opacity 0.2s;
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
		padding: 16px 16px 16px 16px;
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
	.brand-logo {
		width: 36px;
		height: 36px;
	}
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
	.feat-cell:last-child {
		border-right: none;
	}
	.feat-first {
		padding-left: 0;
	}
	.feat-key {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
	}
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
	.role-bracket {
		color: var(--border);
	}
	.r {
		color: var(--text-dim);
	}
	.rsep {
		color: var(--border);
	}

	/* ── Form panel ───────────────────────────────────── */
	.form-panel {
		flex: 1;
		min-width: 340px;
		box-sizing: border-box;
		padding: 16px 16px 16px 16px;
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

	.field {
		margin-bottom: 14px;
	}
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
	.field-wrap.accent-left {
		border-left-color: var(--accent);
	}

	.field-caret {
		color: var(--accent);
		flex-shrink: 0;
	}

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
	.field-input::placeholder {
		color: var(--text-dim);
		opacity: 0.4;
	}
	.field-input:disabled {
		opacity: 0.6;
	}

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
	.pw-btn:hover {
		color: var(--text);
	}

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
	.chk {
		color: var(--accent);
	}

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

	.signup-row {
		margin-top: 14px;
		font-size: 11px;
		color: var(--text-dim);
		letter-spacing: 0.04em;
	}
	.signup-link {
		color: var(--accent);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.signup-link:hover {
		opacity: 0.8;
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
	.ghost-btn:hover {
		border-color: var(--text-dim);
	}

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
	.primary-btn:not(:disabled):hover {
		opacity: 0.85;
	}
	.primary-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.kbd-inv {
		font-family: inherit;
		background: rgba(0, 0, 0, 0.22);
		color: var(--bg);
		font-size: 9px;
		padding: 2px 6px;
		font-weight: 700;
	}

	/* ── Responsive — Medium 601–860px (top-bottom, brand visible) ── */
	@media (max-width: 860px) {
		/* ── Modal layer ──────────────────────────────────── */
		.modal-layer {
			padding: 16px;
		}
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
			transition:
				max-height 0.3s cubic-bezier(0.2, 0.7, 0.3, 1),
				opacity 0.2s;
		}
		.brand-panel:not(.brand-vis) {
			max-width: none !important;
			max-height: 0;
			opacity: 0;
			border-bottom: none;
		}
		.brand-inner {
			width: 100%;
			height: auto;
		}

		/* Reset desktop collapsed overrides */
		.toggle-btn:not(.toggle-open) {
			width: 100%;
		}
		.toggle-btn:not(.toggle-open) .tgl-icon {
			left: 50%;
		}

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
		.toggle-btn:not(.toggle-open)::before {
			display: none;
		}

		/* Icon: always centered, rotate for direction */
		.tgl-icon {
			position: absolute;
			top: 50%;
			left: 50%;
		}
		.toggle-btn.toggle-open .tgl-icon {
			transform: translate(-50%, -50%) rotate(90deg);
		}
		.toggle-btn:not(.toggle-open) .tgl-icon {
			transform: translate(-50%, -50%) rotate(-90deg);
		}

		.form-panel {
			flex: 1 1 auto;
			min-width: 0;
		}

		.kbd-inv {
			display: none;
		}

		.kbd {
			display: none;
		}
	}
</style>
