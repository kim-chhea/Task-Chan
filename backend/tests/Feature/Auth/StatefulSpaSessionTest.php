<?php

use App\Models\User;

/**
 * Sanctum starts the session only when Referer or Origin matches SANCTUM_STATEFUL_DOMAINS.
 * A same-origin GET /api/bootstrap usually has no Origin. Referrer-Policy: no-referrer also
 * omits Referer, so the session cookie is ignored and bootstrap returns a guest. same-origin
 * keeps that Referer, which is what the SPA needs after login.
 */
test('a first-party session survives bootstrap when the spa sends a referer', function () {
    $user = User::factory()->create();
    $referer = 'http://localhost:5173/login';

    $login = $this->withHeader('Referer', $referer)
        ->postJson('/api/login', ['email' => $user->email, 'password' => 'password']);

    $login->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertHeader('Referrer-Policy', 'same-origin');

    $sessionCookie = $login->getCookie(config('session.cookie'), false);
    expect($sessionCookie)->not->toBeNull();

    // Same-origin fetch sends cookies. The test client only does that with withCredentials.
    $this->withCredentials()->withUnencryptedCookie($sessionCookie->getName(), $sessionCookie->getValue());

    // Each production request is a new process. Drop the guard and the in-memory session
    // so the next call has to load this cookie, not the login that just ran.
    $this->app['auth']->forgetGuards();
    $this->app['session']->driver()->flush();

    $this->withHeader('Referer', $referer)
        ->getJson('/api/bootstrap')
        ->assertOk()
        ->assertJsonPath('auth.user.id', $user->id);

    $this->app['auth']->forgetGuards();
    $this->app['session']->driver()->flush();
    $this->withoutHeader('Referer')->withoutHeader('Origin');

    // The session cookie is still sent. Without Referer or Origin, Sanctum never starts the session.
    $this->getJson('/api/bootstrap')
        ->assertOk()
        ->assertJsonPath('auth.user', null)
        ->assertJsonPath('game', null);
});
