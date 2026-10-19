<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum only starts a session for requests that look like they come from the SPA.
        $this->withHeader('Referer', 'http://localhost:5173');
    }
}
