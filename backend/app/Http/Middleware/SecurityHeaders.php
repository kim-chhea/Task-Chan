<?php

namespace App\Http\Middleware;

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

        return $response;
    }
}
