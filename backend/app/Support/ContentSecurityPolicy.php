<?php

namespace App\Support;

/** CSP for the SPA document. The API is same-origin, so connect-src 'self' is the API origin. */
class ContentSecurityPolicy
{
    /**
     * @param  string|null  $apiOrigin  Extra connect-src origin when the API is not this host (scheme, host, and port only).
     */
    public static function header(?string $apiOrigin = null): string
    {
        $connect = ["'self'"];
        if (is_string($apiOrigin) && $apiOrigin !== '' && ! in_array($apiOrigin, $connect, true)) {
            $connect[] = $apiOrigin;
        }

        return implode('; ', [
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
            'connect-src '.implode(' ', $connect),
            "worker-src 'self'",
        ]);
    }
}
