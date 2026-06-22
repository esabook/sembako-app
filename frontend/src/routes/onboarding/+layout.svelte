<script lang="ts">
	import { font, FONT_CSS } from '$lib/stores/font.js';
	import { ukuranFont } from '$lib/stores/ukuran-font.js';
	let { children } = $props();
</script>

<div
	class="min-h-dvh w-full overflow-auto"
	style="background:var(--bg);color:var(--text);font-family:{FONT_CSS[$font]};font-size:{$ukuranFont}px"
>
	<div class="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8">
		{@render children()}
	</div>
</div>
