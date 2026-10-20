<?php

use App\Http\Middleware\SecurityHeaders;
use App\Support\ContentSecurityPolicy;
use Illuminate\Http\Request;
use Tests\TestCase;

uses(TestCase::class);

it('builds a same-origin spa policy', function () {
    $directives = cspDirectives(ContentSecurityPolicy::header());

    expect($directives['style-src'])->toBe("'self'")
        ->and($directives['font-src'])->toBe("'self'")
        ->and($directives['script-src'])->toBe("'self'")
        ->and($directives['connect-src'])->toBe("'self'")
        ->and($directives['style-src'])->not->toContain('unsafe-inline');
});

it('adds a separate api origin to connect-src', function () {
    $directives = cspDirectives(ContentSecurityPolicy::header('https://api.example.com'));

    expect($directives['connect-src'])->toBe("'self' https://api.example.com");
});

it('sets the spa policy on html and leaves json alone', function () {
    $middleware = new SecurityHeaders;

    $html = $middleware->handle(
        Request::create('/login'),
        fn () => response('ok', 200, ['Content-Type' => 'text/html; charset=UTF-8']),
    );
    $json = $middleware->handle(
        Request::create('/api/today'),
        fn () => response()->json(['ok' => true]),
    );

    expect($html->headers->get('Content-Security-Policy'))->toBe(ContentSecurityPolicy::header())
        ->and($json->headers->has('Content-Security-Policy'))->toBeFalse();
});

function cspDirectives(string $policy): array
{
    $out = [];
    foreach (explode(';', $policy) as $part) {
        $part = trim($part);
        if ($part === '') {
            continue;
        }
        [$name, $value] = array_pad(preg_split('/\s+/', $part, 2), 2, '');
        $out[$name] = $value;
    }

    return $out;
}
