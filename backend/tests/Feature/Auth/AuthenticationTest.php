<?php

use App\Models\User;

test('users can authenticate with the login endpoint', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()->assertJsonPath('user.email', $user->email);

    $this->assertAuthenticated();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertUnprocessable()->assertJsonValidationErrors('email');

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/logout')->assertNoContent();

    $this->app['auth']->forgetGuards(); // actingAs caches the user on the guard
    $this->assertGuest();
});

test('bootstrap reports the current user, or null when logged out', function () {
    $this->getJson('/api/bootstrap')->assertOk()->assertJsonPath('auth.user', null)->assertJsonPath('game', null);

    $user = User::factory()->create();
    $this->actingAs($user)->getJson('/api/bootstrap')->assertOk()
        ->assertJsonPath('auth.user.id', $user->id)->assertJsonPath('canRegister', false)
        ->assertJsonStructure(['game' => ['balance', 'equipped'], 'catalog', 'rules']);
});
