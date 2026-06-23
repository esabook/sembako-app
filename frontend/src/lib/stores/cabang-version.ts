import { writable } from 'svelte/store';

export const cabangListVersion = writable(0);

export function invalidateCabangList() {
	cabangListVersion.update((v) => v + 1);
}
