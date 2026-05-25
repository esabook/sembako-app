import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    build: {
        // Satukan semua CSS jadi 1 file — eliminasi warning preload CSS per-chunk
        cssCodeSplit: false,

        // Vite 8 pakai oxc (rolldown) sebagai minifier default — lebih cepat dari esbuild
        // Tidak perlu set minify secara eksplisit

        // target tidak di-set — biarkan SvelteKit yang atur per-environment
        // (SSR server butuh esnext untuk top-level await, client bisa es2020)

        // Tidak perlu source map di production (hemat ukuran + sembunyikan source)
        sourcemap: false,

        rollupOptions: {
            output: {
                // Pisahkan library besar ke chunk sendiri — tidak re-download saat kode app update
                // (entryFileNames/chunkFileNames/assetFileNames dikontrol SvelteKit, tidak perlu di-set)
                manualChunks(id) {
                    if (id.includes('node_modules/qrcode'))            return 'vendor-qrcode';
                    if (id.includes('node_modules/jsbarcode'))          return 'vendor-jsbarcode';
                    if (id.includes('node_modules/barcode-detector'))   return 'vendor-barcode';
                },
            },
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/uploads': {
                target: 'http://localhost:3000',
            }
        }
    }
});
