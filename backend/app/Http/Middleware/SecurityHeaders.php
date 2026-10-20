<?php

namespace App\Http\Middleware;

use App\Support\ContentSecurityPolicy;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Defensive headers for a JSON API: no sniffing, no framing, no referrer leaks, and nothing cached for a logged-in user. */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        if (! $response->headers->has('Cache-Control') || $response->headers->get('Cache-Control') === 'no-cache, private') {
            $response->headers->set('Cache-Control', 'no-store, private');
        }

        // The SPA is static files in production (nginx sets the same policy; Vite dev sets none).
        // If this app is what returns the HTML document, the browser still gets the policy.
        // The nonce matches __CSP_NONCE__ in that HTML. connect-src comes from CSP_CONNECT_SRC.
        if (str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            $nonce = rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
            $response->headers->set('Content-Security-Policy', ContentSecurityPolicy::header($nonce));
            $body = $response->getContent();
            if (is_string($body) && str_contains($body, ContentSecurityPolicy::NONCE_PLACEHOLDER)) {
                $response->setContent(str_replace(ContentSecurityPolicy::NONCE_PLACEHOLDER, $nonce, $body));
            }
        }

        return $response;
    }
}
