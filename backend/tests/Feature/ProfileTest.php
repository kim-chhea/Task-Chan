<?php

use App\Models\Item;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('profile data is returned', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/profile')->assertOk()->assertJsonStructure(['mustVerifyEmail']);
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/profile', ['name' => 'Test User', 'email' => 'test@example.com'])
        ->assertOk()->assertJsonPath('email', 'test@example.com');

    $user->refresh();

    $this->assertSame('Test User', $user->name);
    $this->assertSame('test@example.com', $user->email);
    $this->assertNull($user->email_verified_at);
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/profile', ['name' => 'Test User', 'email' => $user->email])->assertOk();

    $this->assertNotNull($user->refresh()->email_verified_at);
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->deleteJson('/api/profile', ['password' => 'password'])->assertNoContent();

    $this->app['auth']->forgetGuards(); // actingAs caches the user on the guard
    $this->assertGuest();
    $this->assertNull($user->fresh());
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->deleteJson('/api/profile', ['password' => 'wrong-password'])
        ->assertUnprocessable()->assertJsonValidationErrors('password');

    $this->assertNotNull($user->fresh());
});

test('deleting the account also removes uploaded files', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $item = Item::factory()->for($user)->create(['number' => 1]);
    $path = UploadedFile::fake()->create('brief.pdf', 10)->store("attachments/{$user->id}/{$item->id}", 'local');
    $item->attachments()->create(['disk' => 'local', 'path' => $path, 'original_name' => 'brief.pdf', 'mime' => 'application/pdf', 'size' => 10240]);
    Storage::disk('local')->assertExists($path);

    $this->actingAs($user)->deleteJson('/api/profile', ['password' => 'password'])->assertNoContent();

    Storage::disk('local')->assertMissing($path);
});
