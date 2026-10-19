import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // The Laravel backend. In dev the browser only talks to Vite, which forwards API + Sanctum requests, so cookies stay same-origin.
    const backend = env.BACKEND_URL || 'http://localhost:8000';

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(import.meta.dirname, 'src'),
            },
        },
        server: {
            port: 5173,
            proxy: {
                '/api': backend,
                '/sanctum': backend,
            },
        },
    };
});
