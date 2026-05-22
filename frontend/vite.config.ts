import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    build: {
        // Satukan semua CSS jadi 1 file — eliminasi warning preload CSS per-chunk
        // Aman untuk LAN app: ukuran bundle bukan prioritas utama
        cssCodeSplit: false,
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
