/** Production CSP for the SPA. Vite dev does not send this (see vite.config.ts). */

/** Replaced in the built HTML with the per-request nonce. Must match ContentSecurityPolicy::NONCE_PLACEHOLDER. */
export const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

/**
 * True for index.html and the SPA routes that fall back to it.
 * /assets/* is never a document, so those files are not marked no-store.
 */
export function isSpaDocument(url, method = 'GET') {
    if (method !== 'GET' && method !== 'HEAD') return false;
    const pathname = String(url ?? '/').split('?')[0] || '/';
    if (pathname === '/assets' || pathname.startsWith('/assets/')) return false;
    if (pathname === '/index.html' || pathname.endsWith('/index.html')) return true;
    const last = pathname.split('/').pop() ?? '';
    return !last.includes('.');
}

/** Origin the browser will call, or null when the value is not an absolute http(s) URL. */
export function apiOrigin(apiUrl) {
    const raw = (apiUrl ?? '').trim();
    if (raw === '') return null;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (url.origin === 'null' || url.origin === '') return null;
        return url.origin;
    } catch {
        return null;
    }
}

/**
 * Origins allowed on connect-src. Always starts with 'self', then each http(s)
 * origin in `connectSrc` (CSP_CONNECT_SRC). Paths, junk, and duplicates are dropped.
 */
export function connectOrigins(connectSrc) {
    const connect = ["'self'"];
    const raw = (connectSrc ?? '').trim();
    if (raw === '') return connect;
    for (const part of raw.split(/[\s,]+/)) {
        if (part === '' || part === "'self'" || part.toLowerCase() === 'self') continue;
        const origin = apiOrigin(part);
        if (origin && !connect.includes(origin)) connect.push(origin);
    }
    return connect;
}

/**
 * Same policy as App\Support\ContentSecurityPolicy and deploy/nginx/csp.conf.
 *
 * `connectSrc` is CSP_CONNECT_SRC, the one value shared with nginx and Laravel.
 * Do not pass VITE_API_URL here by itself: a looser meta tag cannot override a
 * stricter header, because the browser enforces both.
 *
 * `frame-ancestors` is header-only. A meta policy cannot set it, and browsers
 * log a warning if it is present there. The meta tag is not a full replacement
 * for the header.
 *
 * `nonce`, when set, is added to style-src for the notes editor's style tags.
 * style-src never includes 'unsafe-inline'.
 */
export function contentSecurityPolicy({ connectSrc = '', nonce = '', delivery = 'header' } = {}) {
    if (typeof arguments[0] === 'string') {
        throw new TypeError(
            'contentSecurityPolicy expects { connectSrc, nonce, delivery }. Pass CSP_CONNECT_SRC, not VITE_API_URL alone.',
        );
    }

    const styleSrc = nonce ? `'self' 'nonce-${nonce}'` : `'self'`;
    const directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self'",
        `style-src ${styleSrc}`,
        "style-src-attr 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: blob:",
        `connect-src ${connectOrigins(connectSrc).join(' ')}`,
        "worker-src 'self'",
    ];

    return directives.filter((directive) => delivery === 'header' || !directive.startsWith('frame-ancestors')).join('; ');
}
