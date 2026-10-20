import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { contentSecurityPolicy } from './cspPolicy.mjs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // The Laravel backend. In dev the browser only talks to Vite, which forwards API + Sanctum requests, so cookies stay same-origin.
    const backend = env.BACKEND_URL || 'http://localhost:8000';

    return {
        plugins: [react(), tailwindcss(), spaContentSecurityPolicy(env.VITE_API_URL)],
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

/**
 * Production CSP only. `npm run dev` skips it: the Vite client needs an inline preamble and a websocket,
 * which this policy would block. `vite build` writes the policy into index.html, and `vite preview`
 * also sends it as a header, matching backend/deploy/nginx/csp.conf.
 */
function spaContentSecurityPolicy(apiUrl: string | undefined): Plugin {
    const header = contentSecurityPolicy(apiUrl, 'header');
    const meta = `        <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(apiUrl, 'meta')}" />`;

    return {
        name: 'spa-content-security-policy',
        transformIndexHtml: {
            order: 'pre',
            handler(html, ctx) {
                if (ctx.server) return html;
                return html.replace('<head>', `<head>\n${meta}`);
            },
        },
        configurePreviewServer(server) {
            server.middlewares.use((_req, res, next) => {
                res.setHeader('Content-Security-Policy', header);
                next();
            });
        },
    };
}
