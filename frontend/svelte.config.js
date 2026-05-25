import adapter from 'svelte-adapter-bun';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	onwarn(warning, handler) {
		// Label-di-atas-input adalah pola UI yang valid untuk app internal ini
		if (warning.code === 'a11y_label_has_associated_control') return;
		handler(warning);
	},
	kit: {
		adapter: adapter({
			// Pre-compress static assets (gzip + brotli) — server langsung serve .gz/.br
			// Mengurangi CPU runtime saat serve ke banyak HP sekaligus
			precompress: true,
		})
	}
};

export default config;
