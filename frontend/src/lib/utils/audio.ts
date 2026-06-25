// Pengaturan suara kasir — tersimpan di localStorage (per-device, bukan per-user).

const KEY_ON   = 'kasir_audio_on';
const KEY_MODE = 'kasir_audio_mode';
const KEY_SRC  = 'kasir_audio_src';
const KEY_NAME = 'kasir_audio_name';

export type AudioMode = 'beep' | 'file';

export interface AudioSettings {
	on:   boolean;
	mode: AudioMode;
	src:  string;   // data URL jika mode='file', kosong jika beep
	name: string;   // nama file asli untuk tampilan
}

export function audioLoad(): AudioSettings {
	try {
		return {
			on:   localStorage.getItem(KEY_ON) !== 'false',
			mode: (localStorage.getItem(KEY_MODE) as AudioMode | null) ?? 'beep',
			src:  localStorage.getItem(KEY_SRC)  ?? '',
			name: localStorage.getItem(KEY_NAME) ?? '',
		};
	} catch {
		return { on: true, mode: 'beep', src: '', name: '' };
	}
}

export function audioSave(s: AudioSettings) {
	try {
		localStorage.setItem(KEY_ON, String(s.on));
		localStorage.setItem(KEY_MODE, s.mode);
		if (s.src)  localStorage.setItem(KEY_SRC, s.src);
		else        localStorage.removeItem(KEY_SRC);
		if (s.name) localStorage.setItem(KEY_NAME, s.name);
		else        localStorage.removeItem(KEY_NAME);
	} catch { /* quota exceeded atau SSR */ }
}

let _ctx: AudioContext | null = null;
let _el:  HTMLAudioElement  | null = null;

function beepGenerated() {
	try {
		_ctx ??= new AudioContext();
		if (_ctx.state === 'suspended') void _ctx.resume();
		const osc  = _ctx.createOscillator();
		const gain = _ctx.createGain();
		osc.connect(gain);
		gain.connect(_ctx.destination);
		osc.type = 'sine';
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.3, _ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + 0.12);
		osc.start();
		osc.stop(_ctx.currentTime + 0.12);
	} catch { /* browser tidak support */ }
}

export function playKasirSound() {
	const { on, mode, src } = audioLoad();
	if (!on) return;
	if (mode === 'file' && src) {
		try {
			_el ??= new Audio();
			_el.src = src;
			_el.currentTime = 0;
			void _el.play();
		} catch { beepGenerated(); }
		return;
	}
	beepGenerated();
}
