<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('password can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->putJson('/api/password', [
        'current_password' => 'password',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertNoContent();

    $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
});

test('correct password must be provided to update password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->putJson('/api/password', [
        'current_password' => 'wrong-password',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
});
