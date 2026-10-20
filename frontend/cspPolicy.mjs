/** Production CSP for the SPA. Vite dev does not send this (see vite.config.ts). */

/** Origin the browser will call for /api and /sanctum, or null when that is this page ('self'). */
export function apiOrigin(apiUrl) {
    const raw = (apiUrl ?? '').trim();
    if (raw === '') return null;
    try {
        const url = new URL(raw);
        if (url.origin === 'null' || url.origin === '') return null;
        return url.origin;
    } catch {
        return null;
    }
}

/**
 * Same policy as backend/deploy/nginx/csp.conf and App\Support\ContentSecurityPolicy.
 * `apiUrl` is VITE_API_URL. When it is empty the API is this host, and connect-src 'self' covers it.
 * When it is set, that origin is added so a split-host build can still reach the API.
 *
 * `frame-ancestors` is header-only. A meta policy cannot set it, and browsers log a warning if it is present there.
 */
export function contentSecurityPolicy(apiUrl, delivery = 'header') {
    const connect = ["'self'"];
    const origin = apiOrigin(apiUrl);
    if (origin && !connect.includes(origin)) connect.push(origin);

    const directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "style-src-attr 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: blob:",
        `connect-src ${connect.join(' ')}`,
        "worker-src 'self'",
    ];

    return directives.filter((directive) => delivery === 'header' || !directive.startsWith('frame-ancestors')).join('; ');
}
