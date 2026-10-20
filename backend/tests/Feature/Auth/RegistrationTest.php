<?php

use App\Models\User;

test('the first user can register', function () {
    $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertCreated()->assertJsonPath('user.email', 'test@example.com');

    $this->assertAuthenticated();
});

test('registration closes once a user exists', function () {
    config(['app.debug' => false]);

    User::factory()->create();

    $this->postJson('/api/register', [
        'name' => 'Second',
        'email' => 'second@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertForbidden()->assertExactJson(['message' => 'Registration is closed.']);
});
