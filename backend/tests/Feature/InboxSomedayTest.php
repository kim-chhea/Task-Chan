<?php

use App\Models\Item;
use App\Models\MasterRecord;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});
afterEach(fn () => Carbon::setTestNow());

function phase2Item(User $user, array $attrs = []): Item
{
    return Item::factory()->for($user)->create(['number' => Item::nextNumber($user->id), ...$attrs]);
}

it('stores someday as a non-null boolean that defaults to false', function () {
    $column = collect(Schema::getColumns('items'))->firstWhere('name', 'someday');

    expect($column)->not->toBeNull()
        ->and($column['nullable'])->toBeFalse()
        ->and((string) $column['default'])->toBe('0');

    $item = phase2Item($this->user, ['deadline' => null]);

    expect($item->fresh()->someday)->toBeFalse()
        ->and($item->fresh()->isInbox())->toBeTrue()
        ->and($item->fresh()->isSomeday())->toBeFalse();
});

it('requires authentication for the inbox', function () {
    $this->getJson('/api/inbox')->assertUnauthorized();
});

it('lists inbox and someday for the signed-in user', function () {
    $case = MasterRecord::create([
        'user_id' => $this->user->id, 'code' => 'MR-1', 'title' => 'Exam',
    ]);
    $inbox = phase2Item($this->user, ['number' => 1, 'title' => 'Loose note', 'deadline' => null, 'someday' => false, 'master_record_id' => $case->id]);
    $doing = phase2Item($this->user, ['number' => 2, 'title' => 'Started note', 'deadline' => null, 'status' => 'in_progress']);
    $parked = phase2Item($this->user, ['number' => 3, 'title' => 'Later', 'deadline' => null, 'someday' => true]);
    $datedPark = phase2Item($this->user, ['number' => 4, 'title' => 'Dated park', 'deadline' => '2026-11-01', 'someday' => true]);
    phase2Item($this->user, ['number' => 5, 'title' => 'Scheduled', 'deadline' => '2026-10-12', 'someday' => false]);
    phase2Item($this->user, ['number' => 6, 'title' => 'Finished note', 'deadline' => null, 'status' => 'done']);
    phase2Item($this->user, ['number' => 7, 'title' => 'Finished park', 'deadline' => null, 'status' => 'done', 'someday' => true]);
    $deleted = phase2Item($this->user, ['number' => 8, 'title' => 'Deleted note', 'deadline' => null]);
    $deleted->delete();
    phase2Item(User::factory()->create(), ['title' => 'Not mine', 'deadline' => null, 'someday' => true]);

    $this->actingAs($this->user);
    $listed = collect($this->getJson('/api/items')->json('items'))->firstWhere('id', $inbox->id);
    $res = $this->getJson('/api/inbox')->assertOk();

    expect(array_keys($res->json()))->toBe(['inbox', 'someday', 'counts'])
        ->and($res->json('counts'))->toBe(['inbox' => 2, 'someday' => 2])
        ->and(collect($res->json('inbox'))->pluck('title')->all())->toBe(['Loose note', 'Started note'])
        ->and(collect($res->json('someday'))->pluck('title')->all())->toBe(['Later', 'Dated park'])
        ->and(array_keys($res->json('inbox.0')))->toBe(array_keys($listed))
        ->and($res->json('inbox.0'))->toMatchArray([
            'id' => $inbox->id,
            'number' => '0001',
            'title' => 'Loose note',
            'deadline' => null,
            'someday' => false,
            'status' => 'not_started',
            'master_record' => [
                'id' => $case->id,
                'code' => 'MR-1',
                'title' => 'Exam',
                'session_date' => null,
                'student_count' => null,
            ],
        ])
        ->and($res->json('inbox.1.id'))->toBe($doing->id)
        ->and($res->json('someday.0'))->toMatchArray(['id' => $parked->id, 'someday' => true, 'deadline' => null])
        ->and($res->json('someday.1'))->toMatchArray(['id' => $datedPark->id, 'someday' => true, 'deadline' => '2026-11-01']);
});

it('counts inbox on today and keeps inbox and someday out of coming up', function () {
    phase2Item($this->user, ['title' => 'Loose note', 'deadline' => null]);
    phase2Item($this->user, ['title' => 'Started note', 'deadline' => null, 'status' => 'in_progress']);
    phase2Item($this->user, ['title' => 'Later', 'deadline' => null, 'someday' => true]);
    phase2Item($this->user, ['title' => 'Dated park', 'deadline' => '2026-10-20', 'someday' => true, 'status' => 'not_started']);
    phase2Item($this->user, ['title' => 'Soon', 'deadline' => '2026-10-12']);
    phase2Item($this->user, ['title' => 'Due', 'deadline' => '2026-10-07']);
    phase2Item($this->user, ['title' => 'Doing dated', 'deadline' => '2026-10-20', 'status' => 'in_progress']);
    phase2Item($this->user, ['title' => 'Finished note', 'deadline' => null, 'status' => 'done']);
    phase2Item(User::factory()->create(), ['title' => 'Not mine', 'deadline' => null]);

    $res = $this->actingAs($this->user)->getJson('/api/today')->assertOk();
    $titles = fn (string $group) => collect($res->json("groups.{$group}"))->pluck('title');

    expect($res->json('counts'))->toBe(['inbox' => 2])
        ->and($titles('coming_up')->all())->toBe(['Soon'])
        ->and($titles('due')->all())->toContain('Due')
        ->and($titles('in_progress')->all())->toContain('Started note', 'Doing dated');
});

it('does not let inbox items use up the coming up slots', function () {
    phase2Item($this->user, ['title' => 'Loose note', 'deadline' => null]);
    phase2Item($this->user, ['title' => 'Later', 'deadline' => null, 'someday' => true]);
    foreach (range(1, 9) as $day) {
        phase2Item($this->user, ['title' => "Day {$day}", 'deadline' => Carbon::parse('2026-10-07')->addDays($day)->toDateString()]);
    }

    $titles = $this->actingAs($this->user)->getJson('/api/today')->assertOk()->json('groups.coming_up');

    expect($titles)->toHaveCount(8)
        ->and(collect($titles)->pluck('title')->all())->toBe(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8']);
});

it('creates inbox, scheduled, and someday items', function () {
    $this->actingAs($this->user);

    $inbox = $this->postJson('/api/items', ['title' => 'Loose note'])->assertCreated()->json('item');
    $scheduled = $this->postJson('/api/items', ['title' => 'Due Friday', 'deadline' => '2026-10-09'])->assertCreated()->json('item');
    $parked = $this->postJson('/api/items', ['title' => 'Later', 'someday' => true])->assertCreated()->json('item');
    $explicit = $this->postJson('/api/items', ['title' => 'Not later', 'someday' => false])->assertCreated()->json('item');
    $dated = $this->postJson('/api/items', ['title' => 'Schedule wins', 'someday' => true, 'deadline' => '2026-10-21'])->assertCreated()->json('item');

    expect($inbox)->toMatchArray(['deadline' => null, 'someday' => false])
        ->and($scheduled)->toMatchArray(['deadline' => '2026-10-09', 'someday' => false])
        ->and($parked)->toMatchArray(['deadline' => null, 'someday' => true])
        ->and($explicit)->toMatchArray(['deadline' => null, 'someday' => false])
        ->and($dated)->toMatchArray(['deadline' => '2026-10-21', 'someday' => false]);

    $res = $this->getJson('/api/inbox')->assertOk();
    expect(collect($res->json('inbox'))->pluck('title')->all())->toBe(['Loose note', 'Not later'])
        ->and(collect($res->json('someday'))->pluck('title')->all())->toBe(['Later']);
});

it('parks and schedules through the existing item update', function () {
    $dated = phase2Item($this->user, ['title' => 'Due Friday', 'deadline' => '2026-10-09']);
    $parked = phase2Item($this->user, ['title' => 'Later', 'deadline' => null, 'someday' => true]);
    $note = phase2Item($this->user, ['title' => 'Loose note', 'deadline' => null]);
    $this->actingAs($this->user);

    $this->patchJson("/api/items/{$dated->id}", ['someday' => true])
        ->assertOk()
        ->assertJsonPath('item.someday', true)
        ->assertJsonPath('item.deadline', null);
    expect($dated->fresh()->deadline)->toBeNull()->and($dated->fresh()->someday)->toBeTrue();

    $this->patchJson("/api/items/{$parked->id}", ['deadline' => '2026-10-20'])
        ->assertOk()
        ->assertJsonPath('item.someday', false)
        ->assertJsonPath('item.deadline', '2026-10-20');

    $this->patchJson("/api/items/{$parked->id}", ['someday' => true, 'deadline' => '2026-11-02'])
        ->assertOk()
        ->assertJsonPath('item.someday', false)
        ->assertJsonPath('item.deadline', '2026-11-02');

    $this->patchJson("/api/items/{$note->id}", ['title' => 'Renamed'])->assertOk()->assertJsonPath('item.title', 'Renamed');
    expect($note->fresh()->someday)->toBeFalse()->and($note->fresh()->deadline)->toBeNull();

    $this->patchJson("/api/items/{$note->id}", ['someday' => false, 'deadline' => null])
        ->assertOk()
        ->assertJsonPath('item.someday', false)
        ->assertJsonPath('item.deadline', null);

    // "0" and "1" pass the boolean rule. "0" must not be read as true.
    $this->patchJson("/api/items/{$dated->id}", ['someday' => '0'])
        ->assertOk()
        ->assertJsonPath('item.someday', false)
        ->assertJsonPath('item.deadline', null);
    $this->patchJson("/api/items/{$dated->id}", ['someday' => '1'])
        ->assertOk()
        ->assertJsonPath('item.someday', true)
        ->assertJsonPath('item.deadline', null);

    $this->postJson('/api/items', ['title' => 'Nope', 'someday' => 'yes'])->assertUnprocessable()->assertJsonValidationErrors('someday');
    $this->patchJson("/api/items/{$note->id}", ['someday' => null])->assertUnprocessable()->assertJsonValidationErrors('someday');
});
