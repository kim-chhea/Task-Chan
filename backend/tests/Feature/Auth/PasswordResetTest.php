<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

    Notification::assertSentTo($user, ResetPassword::class);
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->postJson('/api/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $this->postJson('/api/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertOk();

        return true;
    });
});

test('requesting a reset for an unknown email looks the same as for a known one', function () {
    Notification::fake();

    $known = User::factory()->create();

    $a = $this->postJson('/api/forgot-password', ['email' => $known->email])->assertOk()->json();
    $b = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json();

    expect($b)->toBe($a);
    Notification::assertSentToTimes($known, ResetPassword::class, 1);
});
