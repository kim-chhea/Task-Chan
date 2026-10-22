<?php

use App\Support\ContentSecurityPolicy;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Output\OutputInterface;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('csp:nginx', function () {
    // OUTPUT_RAW so nginx $variables are not treated as console formatting.
    $this->output->write(ContentSecurityPolicy::nginxSnippet(), false, OutputInterface::OUTPUT_RAW);
})->purpose('Print the nginx CSP snippet for the current CSP_CONNECT_SRC');
