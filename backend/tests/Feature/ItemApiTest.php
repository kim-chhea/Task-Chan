<?php

use App\Enums\ItemStatus;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});
afterEach(fn () => Carbon::setTestNow());

function mine(User $u, array $attrs = []): Item
{
    return Item::factory()->for($u)->create(['number' => Item::nextNumber($u->id), ...$attrs]);
}

it('requires authentication for everything', function () {
    $this->postJson('/api/items', ['title' => 'x'])->assertUnauthorized();
    $this->getJson('/api/today')->assertUnauthorized();
    $this->getJson('/api/locker')->assertUnauthorized();
});

it('creates an item with a per-user number', function () {
    $a = $this->actingAs($this->user)->postJson('/api/items', ['title' => 'Ticket from DGB', 'type' => 'ticket', 'deadline' => '2026-10-09', 'priority' => 'high'])
        ->assertCreated()->json('item');
    $b = $this->postJson('/api/items', ['title' => 'Another'])->assertCreated()->json('item');

    expect($a['number'])->toBe('0001')->and($b['number'])->toBe('0002')
        ->and($a['reward'])->toBe(20); // high 15 + on-time 5

    $other = User::factory()->create();
    $c = $this->actingAs($other)->postJson('/api/items', ['title' => 'Mine'])->json('item');
    expect($c['number'])->toBe('0001');
});

it('validates input', function () {
    $this->actingAs($this->user)->postJson('/api/items', ['title' => '', 'type' => 'nonsense'])->assertUnprocessable();
});

it('never lets a user touch another user\'s rows', function () {
    $theirs = mine(User::factory()->create());
    $this->actingAs($this->user);

    $this->patchJson("/api/items/{$theirs->id}", ['title' => 'hacked'])->assertForbidden();
    $this->patchJson("/api/items/{$theirs->id}/status", ['status' => 'done'])->assertForbidden();
    $this->deleteJson("/api/items/{$theirs->id}")->assertForbidden();
    $this->getJson("/api/items/{$theirs->id}")->assertForbidden();
    $this->postJson("/api/items/{$theirs->id}/sub-tasks", ['title' => 'x'])->assertForbidden();
});

it('completes an item, pays tokens and returns the authoritative balance', function () {
    $item = mine($this->user, ['priority' => 'high', 'deadline' => '2026-10-09']);
    $item->subTasks()->createMany([['title' => 'a', 'position' => 1], ['title' => 'b', 'position' => 2]]);

    $res = $this->actingAs($this->user)->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->assertOk();

    expect($res->json('balance'))->toBe(20)
        ->and($res->json('awarded'))->toBe(20)
        ->and($res->json('item.status'))->toBe('done')
        ->and($item->subTasks()->where('done', false)->count())->toBe(0);

    // idempotent
    $again = $this->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->json();
    expect($again['balance'])->toBe(20)->and($again['awarded'])->toBe(0);

    // undo
    $undo = $this->patchJson("/api/items/{$item->id}/status", ['status' => 'in_progress'])->json();
    expect($undo['balance'])->toBe(0)->and($undo['reversed'])->toBe(20);
});

it('reschedules via PATCH deadline', function () {
    $item = mine($this->user);
    $this->actingAs($this->user)->patchJson("/api/items/{$item->id}", ['deadline' => '2026-10-20'])->assertOk()->assertJsonPath('item.deadline', '2026-10-20');
});

it('rejects linking a master record that belongs to someone else', function () {
    $foreign = MasterRecord::create(['user_id' => User::factory()->create()->id, 'code' => 'MR-1', 'title' => 'x']);
    $item = mine($this->user);
    $this->actingAs($this->user)->patchJson("/api/items/{$item->id}", ['master_record_id' => $foreign->id])->assertUnprocessable();
});

it('stores attachments within the size limit and blocks oversize files', function () {
    Storage::fake('local');
    $item = mine($this->user);
    $this->actingAs($this->user);

    $this->postJson("/api/items/{$item->id}/attachments", ['file' => UploadedFile::fake()->create('brief.pdf', 200, 'application/pdf')])->assertCreated();
    $this->postJson("/api/items/{$item->id}/attachments", ['file' => UploadedFile::fake()->create('huge.bin', 11 * 1024)])->assertUnprocessable();
    expect($item->attachments()->count())->toBe(1);
});

it('rejects an attachment over 10 MB', function () {
    Storage::fake('local');
    $item = mine($this->user);
    $this->actingAs($this->user);

    $this->postJson("/api/items/{$item->id}/attachments", [
        'file' => UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf'),
    ])->assertUnprocessable()->assertExactJson([
        'message' => 'The file must be 10 MB or smaller.',
        'errors' => ['file' => ['The file must be 10 MB or smaller.']],
    ]);

    expect($item->attachments()->count())->toBe(0);
});

it('rejects an attachment type that is not allowed', function () {
    Storage::fake('local');
    $item = mine($this->user);
    $this->actingAs($this->user);

    $this->postJson("/api/items/{$item->id}/attachments", [
        'file' => UploadedFile::fake()->create('payload.exe', 20),
    ])->assertUnprocessable()->assertExactJson([
        'message' => 'This file type is not allowed.',
        'errors' => ['file' => ['This file type is not allowed.']],
    ]);

    expect($item->attachments()->count())->toBe(0);
});

it('stores each allowed attachment type and keeps the created payload', function () {
    Storage::fake('local');
    $item = mine($this->user);
    $this->actingAs($this->user);

    foreach (['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md', 'csv', 'docx', 'xlsx', 'zip'] as $ext) {
        $created = $this->postJson("/api/items/{$item->id}/attachments", [
            'file' => UploadedFile::fake()->create("notes.{$ext}", 12),
        ])->assertCreated();

        $body = $created->json();
        expect(array_keys($body))->toEqualCanonicalizing([
            'id', 'item_id', 'disk', 'path', 'original_name', 'mime', 'size', 'created_at', 'updated_at',
        ])->and($body['item_id'])->toBe($item->id)
            ->and($body['original_name'])->toBe("notes.{$ext}")
            ->and($body['disk'])->toBe('local')
            ->and($body['size'])->toBe(12 * 1024);
    }

    $this->postJson("/api/items/{$item->id}/attachments", [
        'file' => UploadedFile::fake()->create('edge.pdf', 10240, 'application/pdf'),
    ])->assertCreated();

    expect($item->attachments()->count())->toBe(13);
});

it('handles sub-tasks and links', function () {
    $item = mine($this->user);
    $other = mine($this->user);
    $this->actingAs($this->user);

    $sub = $this->postJson("/api/items/{$item->id}/sub-tasks", ['title' => 'Do it'])->assertCreated()->json();
    $this->patchJson("/api/sub-tasks/{$sub['id']}", ['done' => true])->assertOk()->assertJsonPath('done', true);

    $this->postJson("/api/items/{$item->id}/links", ['linked_item_id' => $other->id])->assertCreated();
    $this->postJson("/api/items/{$item->id}/links", ['linked_item_id' => $other->id])->assertCreated(); // duplicate is harmless
    expect($item->links()->count())->toBe(1);
});

it('registration is closed once a user exists', function () {
    config(['app.debug' => false]);

    $this->postJson('/api/register', ['name' => 'x', 'email' => 'x@example.com', 'password' => 'password-123', 'password_confirmation' => 'password-123'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'Registration is closed.']);
});

it('registration works for the very first user and grants the free locker items', function () {
    User::query()->delete();
    $this->postJson('/api/register', ['name' => 'Me', 'email' => 'me@example.com', 'password' => 'password-123', 'password_confirmation' => 'password-123'])->assertCreated();
    expect(User::count())->toBe(1)->and(User::first()->ownedCosmetics()->count())->toBe(7);
});

it('serves every screen endpoint for a logged-in user', function () {
    $item = mine($this->user);
    $case = MasterRecord::create(['user_id' => $this->user->id, 'code' => 'MR-031', 'title' => 'Exam']);
    $this->actingAs($this->user);

    foreach (['/today', '/items', '/calendar', '/review', '/locker', '/master-records', "/items/{$item->id}", "/master-records/{$case->id}", '/calendar?month=2026-11', '/profile'] as $url) {
        $this->getJson("/api$url")->assertOk();
    }
});

it('locker buy/equip endpoints enforce server prices and ownership', function () {
    $this->actingAs($this->user);
    $this->postJson('/api/locker/buy', ['category' => 'hair', 'key' => 'gold'])->assertUnprocessable()->assertJsonPath('needed', 120);
    $this->postJson('/api/locker/equip', ['category' => 'hair', 'key' => 'gold'])->assertUnprocessable();
    $this->postJson('/api/locker/equip', ['category' => 'hair', 'key' => 'midnight'])->assertOk()->assertJsonPath('equipped.hair', 'midnight');
    $this->postJson('/api/locker/buy', ['category' => 'bogus', 'key' => 'x'])->assertUnprocessable();
});

it('weekly review covers the ISO week and carry-over', function () {
    $done = mine($this->user, ['deadline' => '2026-10-08']);
    $this->actingAs($this->user)->patchJson("/api/items/{$done->id}/status", ['status' => 'done'])->assertOk();
    $open = mine($this->user);

    $this->getJson('/api/review')->assertOk()->assertJsonPath('finished', 1)->assertJsonCount(1, 'carry')->assertJsonPath('earned', 15);
});
it('restores the previous status when undoing with "previous"', function () {
    $item = mine($this->user, ['status' => 'in_progress']);
    $this->actingAs($this->user)->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->assertOk();
    $this->patchJson("/api/items/{$item->id}/status", ['status' => 'previous'])->assertOk()->assertJsonPath('item.status', 'in_progress');
});

it('returns 422 with the real balance when an undo would go negative', function () {
    $item = mine($this->user, ['priority' => 'high', 'deadline' => '2026-10-09']);
    $this->actingAs($this->user)->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->assertOk(); // +20
    DB::table('token_ledger')->insert(['user_id' => $this->user->id, 'delta' => -20, 'reason' => 'purchase', 'balance_after' => 0, 'created_at' => now(), 'updated_at' => now()]);

    $this->patchJson("/api/items/{$item->id}/status", ['status' => 'not_started'])->assertUnprocessable()->assertJsonPath('balance', 0);
    expect($item->fresh()->status)->toBe(ItemStatus::Done);
});

it('answers unknown API paths with a JSON 404', function () {
    $this->actingAs($this->user)->getJson('/api/nope')
        ->assertNotFound()
        ->assertExactJson(['message' => 'Not found.']);
});

it('does not leak the model when an attachment is missing', function () {
    $this->actingAs($this->user)->getJson('/api/attachments/999999')
        ->assertNotFound()
        ->assertExactJson(['message' => 'Not found.']);

    $this->deleteJson('/api/attachments/999999')
        ->assertNotFound()
        ->assertExactJson(['message' => 'Not found.']);
});

it('serves the calendar in month, week and day views', function () {
    $this->actingAs($this->user);
    $item = mine($this->user, ['deadline' => '2026-10-08']);

    $this->getJson('/api/calendar?view=week&date=2026-10-07')->assertOk()->assertJsonPath('view', 'week')->assertJsonPath('dayCount', 7)->assertJsonPath('gridStart', '2026-10-05')->assertJsonCount(1, 'items');
    $this->getJson('/api/calendar?view=day&date=2026-10-08')->assertOk()->assertJsonPath('dayCount', 1)->assertJsonCount(1, 'items');
    $this->getJson('/api/calendar?view=month&date=2026-10-08')->assertOk()->assertJsonPath('view', 'month')->assertJsonPath('title', 'October');
    $this->getJson('/api/calendar?view=bogus&date=garbage')->assertOk()->assertJsonPath('view', 'month');
});

it('does not count undone completions or locker spending as earned in the weekly review', function () {
    $item = mine($this->user, ['deadline' => '2026-10-08']); // medium + on-time = 15
    $this->actingAs($this->user)->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->assertOk();
    $this->patchJson("/api/items/{$item->id}/status", ['status' => 'previous'])->assertOk();

    $this->getJson('/api/review')->assertOk()->assertJsonPath('earned', 0)->assertJsonPath('finished', 0);

    $this->patchJson("/api/items/{$item->id}/status", ['status' => 'done'])->assertOk();
    DB::table('token_ledger')->insert(['user_id' => $this->user->id, 'delta' => -10, 'reason' => 'purchase', 'balance_after' => 5, 'created_at' => now(), 'updated_at' => now()]);

    $this->getJson('/api/review')->assertOk()->assertJsonPath('earned', 15);
});

it('sends defensive headers on API responses', function () {
    $this->actingAs($this->user)->getJson('/api/today')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'no-referrer');
});
