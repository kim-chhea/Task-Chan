<?php

namespace App\Support;

/**
 * CSP for the SPA document.
 *
 * connect-src always starts with 'self' and then the origins in CSP_CONNECT_SRC.
 * The nginx snippet and this header both read that one config value. The browser
 * enforces the header and the meta tag together, so they have to agree.
 *
 * style-src is 'self' plus a per-request nonce for the notes editor's style tags.
 * It never allows 'unsafe-inline'. style-src-attr still does, because a nonce
 * does not cover element style attributes.
 */
class ContentSecurityPolicy
{
    /** Replaced in the built HTML with the same nonce the CSP header sends. */
    public const NONCE_PLACEHOLDER = '__CSP_NONCE__';

    public static function header(?string $nonce = null): string
    {
        return self::policy(self::styleSrc($nonce), implode(' ', self::connectSources()));
    }

    /**
     * nginx snippet for the current CSP_CONNECT_SRC. Paste it into the site server
     * block, or overwrite deploy/nginx/csp.conf with `php artisan csp:nginx`.
     */
    public static function nginxSnippet(): string
    {
        $connect = implode(' ', self::connectSources());
        $policy = self::policy("'self' 'nonce-\$csp_nonce'", '$csp_connect_src');

        $lines = [
            '# Content-Security-Policy for the Task-Chan SPA.',
            '# Paste into the Forge site server block that serves frontend/dist (see DEPLOY.md).',
            '# CSP_CONNECT_SRC is the only extra connect-src value. Leave it empty when the SPA',
            '# and the API share a host. After changing it, regenerate this file with',
            '# `php artisan csp:nginx` so this header matches the SPA meta tag. The browser',
            '# enforces both. The meta tag cannot set frame-ancestors; this header does.',
            '# __CSP_NONCE__ in the HTML is replaced with $request_id, the same nonce style-src',
            '# sends for the notes editor style tags. style-src does not allow unsafe-inline.',
            '# nginx does not inherit add_header into a location that sets its own add_header.',
            '# Repeat the add_header line there. Requires ngx_http_sub_module and ngx_http_gunzip_module.',
            '',
            'set $csp_connect_src "'.$connect.'";',
            'set $csp_nonce $request_id;',
            'gunzip on;',
            'sub_filter_once off;',
            'sub_filter_types text/html;',
            'sub_filter "'.self::NONCE_PLACEHOLDER.'" $csp_nonce;',
            'add_header Content-Security-Policy "'.$policy.'" always;',
            '',
        ];

        return implode("\n", $lines);
    }

    /**
     * @return list<string>
     */
    public static function connectSources(): array
    {
        $sources = ["'self'"];
        $raw = trim((string) config('csp.connect_src', ''));
        if ($raw === '') {
            return $sources;
        }

        foreach (preg_split('/[\s,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY) as $part) {
            if ($part === "'self'" || strcasecmp($part, 'self') === 0) {
                continue;
            }
            $origin = self::normalizeOrigin($part);
            if ($origin !== null && ! in_array($origin, $sources, true)) {
                $sources[] = $origin;
            }
        }

        return $sources;
    }

    private static function styleSrc(?string $nonce): string
    {
        if (! is_string($nonce) || preg_match('/^[A-Za-z0-9_-]+$/', $nonce) !== 1) {
            return "'self'";
        }

        return "'self' 'nonce-".$nonce."'";
    }

    private static function policy(string $styleSrc, string $connectSrc): string
    {
        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self'",
            'style-src '.$styleSrc,
            "style-src-attr 'unsafe-inline'",
            "font-src 'self'",
            "img-src 'self' data: blob:",
            'connect-src '.$connectSrc,
            "worker-src 'self'",
        ]);
    }

    private static function normalizeOrigin(string $value): ?string
    {
        $parts = parse_url($value);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = (string) ($parts['host'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return null;
        }

        if (str_contains($host, ':')) {
            $host = '['.trim($host, '[]').']';
            if (preg_match('/^\[[0-9A-Fa-f:.]+\]$/', $host) !== 1) {
                return null;
            }
        } elseif (preg_match('/^[A-Za-z0-9._-]+$/', $host) !== 1) {
            return null;
        }

        $port = $parts['port'] ?? null;
        if ($port !== null && (! is_int($port) || $port < 1 || $port > 65535)) {
            return null;
        }
        if (($scheme === 'https' && $port === 443) || ($scheme === 'http' && $port === 80)) {
            $port = null;
        }

        return $scheme.'://'.$host.($port !== null ? ':'.$port : '');
    }
}
