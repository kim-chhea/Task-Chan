<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind a load balancer the request arrives as plain HTTP; trust its X-Forwarded-* headers so URLs, secure cookies and rate limits see the real client.
        $proxies = (string) env('TRUSTED_PROXIES', '');
        if ($proxies !== '') {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(fn () => rtrim((string) config('app.frontend_url'), '/').'/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API-only: every error is JSON.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);
    })->create();
