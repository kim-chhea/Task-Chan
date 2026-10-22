<?php

use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Mail\Transport\ArrayTransport;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->postJson('/api/forgot-password', ['email' => $user->email])
        ->assertOk()
        ->assertExactJson(['status' => PasswordResetLinkController::STATUS]);

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
        ])->assertOk()->assertExactJson(['status' => 'Your password has been reset.']);

        return true;
    });
});

test('requesting a reset for an unknown email looks the same as for a known one', function () {
    Notification::fake();

    $known = User::factory()->create();

    $a = $this->postJson('/api/forgot-password', ['email' => $known->email])->assertOk()->json();
    $b = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json();

    expect($b)->toBe($a)
        ->and($a)->toBe(['status' => PasswordResetLinkController::STATUS]);
    Notification::assertSentToTimes($known, ResetPassword::class, 1);
});

test('an invalid email is rejected', function () {
    $this->postJson('/api/forgot-password', ['email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    $this->postJson('/api/forgot-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('a repeated request for a known email still looks like every other request', function () {
    Notification::fake();

    $user = User::factory()->create();

    $first = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->json();
    $second = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->json();

    expect($second)->toBe($first)->and($first)->toBe(['status' => PasswordResetLinkController::STATUS]);
    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

test('forgot-password is limited to six requests per minute', function () {
    foreach (range(1, 6) as $i) {
        $this->postJson('/api/forgot-password', ['email' => "nobody{$i}@example.com"])
            ->assertOk()
            ->assertExactJson(['status' => PasswordResetLinkController::STATUS]);
    }

    $this->postJson('/api/forgot-password', ['email' => 'nobody7@example.com'])
        ->assertTooManyRequests()
        ->assertJson(['message' => 'Too Many Attempts.']);
});

test('the real reset notification links to the frontend', function () {
    config(['app.frontend_url' => 'https://app.example.test']);

    $user = User::factory()->create(['email' => 'ada+tag@example.com']);

    $this->postJson('/api/forgot-password', ['email' => $user->email])
        ->assertOk()
        ->assertExactJson(['status' => PasswordResetLinkController::STATUS]);

    $transport = app('mailer')->getSymfonyTransport();
    expect($transport)->toBeInstanceOf(ArrayTransport::class);

    $raw = $transport->messages()->sole()->getOriginalMessage();
    $body = html_entity_decode((string) ($raw->getHtmlBody() ?: $raw->getTextBody()), ENT_QUOTES);

    $email = rawurlencode($user->email);
    expect($body)->toMatch("#https://app\\.example\\.test/reset-password/[A-Za-z0-9]+\\?email={$email}#");

    preg_match("#https://app\\.example\\.test/reset-password/([A-Za-z0-9]+)\\?email={$email}#", $body, $match);
    $token = $match[1];

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertOk()->assertExactJson(['status' => 'Your password has been reset.']);

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('reset-password rejects a bad token', function () {
    $user = User::factory()->create();

    $this->postJson('/api/reset-password', [
        'token' => 'not-a-real-token',
        'email' => $user->email,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('reset-password rejects a bad password', function () {
    Notification::fake();

    $user = User::factory()->create();
    $this->postJson('/api/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $this->postJson('/api/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'different-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        return true;
    });

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});
