<script lang="ts">
	import { user } from '$lib/stores/auth.js';
</script>

<h2 class="text-lg font-bold mb-1">Dashboard</h2>
<p class="text-sm" style="color:var(--text-dim)">Selamat datang, {$user?.nama ?? '...'} — akan diisi di Fase 5.</p>
