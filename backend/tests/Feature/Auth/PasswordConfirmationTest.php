<?php

use App\Models\User;

test('password can be confirmed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/confirm-password', ['password' => 'password'])->assertNoContent();
});

test('password is not confirmed with invalid password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/confirm-password', ['password' => 'wrong-password'])
        ->assertUnprocessable()->assertJsonValidationErrors('password');
});
