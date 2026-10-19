<?php

// Only needed when the frontend is served from a different origin than the API (not when it proxies /api, as in dev).
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:5173')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 600, // cross-origin JSON calls preflight; let the browser cache that for 10 minutes
    'supports_credentials' => true,
];
