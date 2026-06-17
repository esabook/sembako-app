import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), enhancedImages(), sveltekit()],
    ssr: {
        noExternal: ['bits-ui', '@internationalized/date'],
    },
    build: {
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
                // Long-poll scan-relay holds connection 30s — give headroom
                // proxyTimeout: 35_000,
                configure: (proxy) => {
                    // Vite adds its error handler synchronously after configure() returns.
                    // Use setImmediate to wrap it so ECONNRESET/EPIPE from client AbortController
                    // (expected on long-poll cleanup) don't flood the console.
                    setImmediate(() => {
                        const original = proxy.rawListeners('error');
                        proxy.removeAllListeners('error');
                        proxy.on('error', (err, req, res) => {
                            const code = (err as NodeJS.ErrnoException).code;
                            if (code === 'ECONNRESET' || code === 'ECONNABORTED' || code === 'EPIPE') return;
                            for (const fn of original) (fn as (...a: unknown[]) => void)(err, req, res);
                        });
                    });
                },
            },
            '/uploads': {
                target: 'http://localhost:3000',
            }
        }
    }
});
