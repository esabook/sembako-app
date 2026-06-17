// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// cally web components
declare namespace svelteHTML {
	interface IntrinsicElements {
		'calendar-date': Record<string, unknown>;
		'calendar-month': Record<string, unknown>;
		'calendar-range': Record<string, unknown>;
	}
}

export {};
