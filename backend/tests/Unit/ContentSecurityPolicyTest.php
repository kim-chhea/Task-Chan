<?php

use App\Http\Middleware\SecurityHeaders;
use App\Support\ContentSecurityPolicy;
use Illuminate\Http\Request;
use Tests\TestCase;

uses(TestCase::class);

it('builds a same-origin spa policy', function () {
    config(['csp.connect_src' => '']);

    $directives = cspDirectives(ContentSecurityPolicy::header());

    expect($directives['style-src'])->toBe("'self'")
        ->and($directives['font-src'])->toBe("'self'")
        ->and($directives['script-src'])->toBe("'self'")
        ->and($directives['connect-src'])->toBe("'self'")
        ->and($directives['frame-ancestors'])->toBe("'none'")
        ->and($directives['style-src'])->not->toContain('unsafe-inline');
});

it('nonces style-src and never allows unsafe-inline there', function () {
    config(['csp.connect_src' => '']);

    $directives = cspDirectives(ContentSecurityPolicy::header('abc_XYZ-09'));

    expect($directives['style-src'])->toBe("'self' 'nonce-abc_XYZ-09'")
        ->and($directives['style-src'])->not->toContain('unsafe-inline')
        ->and($directives['style-src-attr'])->toBe("'unsafe-inline'");
});

it('uses CSP_CONNECT_SRC for connect-src in the header and the nginx snippet', function () {
    config(['csp.connect_src' => 'https://api.example.com/v1, not-a-url javascript:alert(1)']);

    $header = cspDirectives(ContentSecurityPolicy::header());
    $snippet = ContentSecurityPolicy::nginxSnippet();

    expect($header['connect-src'])->toBe("'self' https://api.example.com")
        ->and($snippet)->toContain('set $csp_connect_src "\'self\' https://api.example.com";')
        ->and($snippet)->toContain('connect-src $csp_connect_src')
        ->and($snippet)->toContain("style-src 'self' 'nonce-\$csp_nonce'")
        ->and($snippet)->toContain('sub_filter "__CSP_NONCE__" $csp_nonce')
        ->and($snippet)->not->toContain("style-src 'unsafe-inline'");

    config(['csp.connect_src' => 'https://api.example.com https://files.example.com:8443']);
    expect(cspDirectives(ContentSecurityPolicy::header())['connect-src'])
        ->toBe("'self' https://api.example.com https://files.example.com:8443")
        ->and(ContentSecurityPolicy::nginxSnippet())->toContain('https://files.example.com:8443');
});

it('sends no-store and the csp on the html document only', function () {
    config(['csp.connect_src' => '']);

    $snippet = ContentSecurityPolicy::nginxSnippet();
    preg_match('/location = \/index\.html \{(.+?)\n\}/s', $snippet, $location);
    $block = $location[1] ?? '';
    $outside = preg_replace('/location = \/index\.html \{.+?\n\}/s', '', $snippet);

    expect($block)->toContain('add_header Cache-Control "no-store" always;')
        ->and($block)->toContain('add_header Content-Security-Policy')
        ->and($block)->toContain("style-src 'self' 'nonce-\$csp_nonce'")
        ->and($block)->toContain('add_header X-Content-Type-Options "nosniff" always;')
        ->and($block)->toContain('add_header X-Frame-Options "DENY" always;')
        ->and($block)->toContain('add_header Referrer-Policy "no-referrer" always;')
        ->and($outside)->not->toContain('add_header Cache-Control')
        ->and($outside)->toContain('add_header Content-Security-Policy')
        ->and($snippet)->toContain('gzip_static');
});

it('keeps the committed nginx snippet equal to an empty CSP_CONNECT_SRC', function () {
    config(['csp.connect_src' => '']);

    expect(file_get_contents(base_path('deploy/nginx/csp.conf')))->toBe(ContentSecurityPolicy::nginxSnippet());
});

it('does not treat a header argument as an api origin', function () {
    config(['csp.connect_src' => '']);

    $directives = cspDirectives(ContentSecurityPolicy::header('https://api.example.com'));

    expect($directives['connect-src'])->toBe("'self'")
        ->and($directives['style-src'])->toBe("'self'");
});

it('sets the spa policy on html, substitutes the nonce, and leaves json alone', function () {
    config(['csp.connect_src' => 'https://api.example.com']);

    $middleware = new SecurityHeaders;
    $placeholder = ContentSecurityPolicy::NONCE_PLACEHOLDER;
    $html = $middleware->handle(
        Request::create('/login'),
        fn () => response(
            '<meta name="csp-nonce" content="'.$placeholder.'" /><meta http-equiv="Content-Security-Policy" content="style-src \'self\' \'nonce-'.$placeholder.'\'" />',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8'],
        ),
    );
    $json = $middleware->handle(
        Request::create('/api/today'),
        fn () => response()->json(['ok' => true]),
    );

    $policy = (string) $html->headers->get('Content-Security-Policy');
    preg_match("/'nonce-([^']+)'/", $policy, $nonce);

    $directives = cspDirectives($policy);

    expect($nonce[1] ?? '')->not->toBe('')
        ->and($directives['connect-src'])->toBe("'self' https://api.example.com")
        ->and($directives['style-src'])->toBe("'self' 'nonce-{$nonce[1]}'")
        ->and($directives['style-src'])->not->toContain('unsafe-inline')
        ->and($directives['frame-ancestors'])->toBe("'none'")
        ->and($html->getContent())->toContain($nonce[1])
        ->and($html->getContent())->not->toContain($placeholder)
        ->and(substr_count($html->getContent(), $nonce[1]))->toBe(2)
        ->and($json->headers->has('Content-Security-Policy'))->toBeFalse();
});

it('prints the nginx snippet for the current config', function () {
    config(['csp.connect_src' => 'https://api.example.com']);

    $this->artisan('csp:nginx')
        ->expectsOutputToContain('set $csp_connect_src "\'self\' https://api.example.com";')
        ->assertSuccessful();
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
