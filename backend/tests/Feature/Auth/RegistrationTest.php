<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;

test('the first user can register', function () {
    $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertCreated()->assertJsonPath('user.email', 'test@example.com');

    $this->assertAuthenticated();
});

test('registration is busy when the first-user lock is held', function () {
    config(['app.debug' => false]);

    expect(Cache::lock('register-first-user', 10)->get())->toBeTrue();

    $this->postJson('/api/register', [
        'name' => 'Busy',
        'email' => 'busy@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertTooManyRequests()->assertExactJson(['message' => 'Registration is busy. Try again.']);

    expect(User::query()->exists())->toBeFalse();
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
