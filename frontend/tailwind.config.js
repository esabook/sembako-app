/** @type {import('tailwindcss').Config} */
export default {
	plugins: [require('daisyui')],
	daisyui: {
		themes: [
			{
				light: {
					'primary': 'var(--accent)',
					'primary-content': 'var(--bg)',
					'secondary': 'var(--info)',
					'secondary-content': 'var(--bg)',
					'accent': 'var(--accent)',
					'accent-content': 'var(--bg)',
					'neutral': 'var(--surface)',
					'neutral-content': 'var(--text)',
					'base-100': 'var(--bg)',
					'base-200': 'var(--surface)',
					'base-300': 'var(--surface2)',
					'base-content': 'var(--text)',
					'info': 'var(--info)',
					'info-content': 'var(--bg)',
					'success': 'var(--accent)',
					'success-content': 'var(--bg)',
					'warning': 'var(--warn)',
					'warning-content': 'var(--bg)',
					'error': 'var(--danger)',
					'error-content': 'var(--bg)'
				}
			},
			{
				dark: {
					'primary': 'var(--accent)',
					'primary-content': 'var(--bg)',
					'secondary': 'var(--info)',
					'secondary-content': 'var(--bg)',
					'accent': 'var(--accent)',
					'accent-content': 'var(--bg)',
					'neutral': 'var(--surface)',
					'neutral-content': 'var(--text)',
					'base-100': 'var(--bg)',
					'base-200': 'var(--surface)',
					'base-300': 'var(--surface2)',
					'base-content': 'var(--text)',
					'info': 'var(--info)',
					'info-content': 'var(--bg)',
					'success': 'var(--accent)',
					'success-content': 'var(--bg)',
					'warning': 'var(--warn)',
					'warning-content': 'var(--bg)',
					'error': 'var(--danger)',
					'error-content': 'var(--bg)'
				}
			}
		]
	}
};
