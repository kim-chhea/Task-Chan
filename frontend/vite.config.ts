import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiOrigin, connectOrigins, contentSecurityPolicy, CSP_NONCE_PLACEHOLDER, isSpaDocument } from './cspPolicy.mjs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // The Laravel backend. In dev the browser only talks to Vite, which forwards API + Sanctum requests, so cookies stay same-origin.
    const backend = env.BACKEND_URL || 'http://localhost:8000';

    return {
        plugins: [react(), tailwindcss(), spaContentSecurityPolicy(env.CSP_CONNECT_SRC, env.VITE_API_URL, backend)],
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
 * sends the same header nginx would, with a fresh nonce on each document.
 *
 * connect-src comes only from CSP_CONNECT_SRC, the same variable Laravel and `php artisan csp:nginx` use.
 * If VITE_API_URL names an origin that variable does not include, the build fails instead of shipping a
 * meta tag the header would cancel out.
 */
function spaContentSecurityPolicy(connectSrc: string | undefined, apiUrl: string | undefined, backend: string): Plugin {
    const shared = connectSrc ?? '';
    const api = apiOrigin(apiUrl);
    if (api && !connectOrigins(shared).includes(api)) {
        throw new Error(
            `CSP_CONNECT_SRC must include the VITE_API_URL origin ${api}. The meta tag, nginx header, and Laravel header are all enforced, so connect-src has to match. Set CSP_CONNECT_SRC=${api} for the frontend build and for Laravel, then run php artisan csp:nginx.`,
        );
    }

    const indexHtml = path.resolve(import.meta.dirname, 'dist/index.html');
    const meta = [
        `        <meta name="csp-nonce" content="${CSP_NONCE_PLACEHOLDER}" />`,
        `        <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy({ connectSrc: shared, nonce: CSP_NONCE_PLACEHOLDER, delivery: 'meta' })}" />`,
    ].join('\n');

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
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '/';
                const pathname = url.split('?')[0] ?? '/';
                if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/sanctum' || pathname.startsWith('/sanctum/')) {
                    proxyToBackend(req, res, backend);
                    return;
                }

                const nonce = randomBytes(16).toString('base64url');
                const policy = contentSecurityPolicy({ connectSrc: shared, nonce, delivery: 'header' });

                if (!isSpaDocument(pathname, req.method ?? 'GET')) {
                    res.setHeader('Content-Security-Policy', policy);
                    next();
                    return;
                }

                let html: string;
                try {
                    html = readFileSync(indexHtml, 'utf8');
                } catch {
                    next();
                    return;
                }

                const body = html.replaceAll(CSP_NONCE_PLACEHOLDER, nonce);
                res.statusCode = 200;
                res.setHeader('Content-Security-Policy', policy);
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Length', Buffer.byteLength(body));
                res.end(req.method === 'HEAD' ? undefined : body);
            });
        },
    };
}

/** Forward /api and /sanctum to Laravel without rewriting Host, so the session cookie stays on the preview origin. */
function proxyToBackend(req: IncomingMessage, res: ServerResponse, backend: string): void {
    const target = new URL(backend);
    const transport = target.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(
        {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            method: req.method,
            path: req.url,
            headers: req.headers,
        },
        (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
            proxyRes.pipe(res);
        },
    );
    proxyReq.on('error', () => {
        if (!res.headersSent) res.statusCode = 502;
        res.end();
    });
    req.pipe(proxyReq);
}
