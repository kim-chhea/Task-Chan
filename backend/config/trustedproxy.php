<?php

// TrustProxies reads config('trustedproxy.proxies') on each request.
// A config file keeps the value after `php artisan config:cache`, which
// stops Laravel from reading .env on later requests. Empty trusts nobody.

$proxies = env('TRUSTED_PROXIES');

return [
    'proxies' => ($proxies === null || $proxies === '') ? null : $proxies,
];
