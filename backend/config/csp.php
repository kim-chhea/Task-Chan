<?php

// Origins the SPA may call besides its own host. Empty when the SPA and the API share a host.
// Space- or comma-separated. Scheme, host, and port only; paths are ignored.
// The frontend build reads the same variable so the meta tag matches this header.
return [
    'connect_src' => env('CSP_CONNECT_SRC', ''),
];
