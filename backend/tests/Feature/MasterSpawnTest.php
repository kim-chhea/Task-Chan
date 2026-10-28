<?php

use App\Enums\ItemType;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});
afterEach(fn () => Carbon::setTestNow());

function phase3Case(User $user, array $attrs = []): MasterRecord
{
    return MasterRecord::create([
        'user_id' => $user->id,
        'code' => 'MR-1',
        'title' => 'Exam session',
        ...$attrs,
    ]);
}

it('requires authentication to spawn from a case', function () {
    $case = phase3Case($this->user);

    $this->postJson("/api/master-records/{$case->id}/spawn", [
        'items' => [['title' => 'Grade papers']],
    ])->assertUnauthorized();

    expect(Item::count())->toBe(0);
});

it('spawns task children on the case without linking them', function () {
    $case = phase3Case($this->user);
    $other = phase3Case(User::factory()->create(), ['code' => 'MR-2', 'title' => 'Other']);
    $this->actingAs($this->user);

    $res = $this->postJson("/api/master-records/{$case->id}/spawn", [
        'items' => [
            ['title' => 'Grade papers', 'deadline' => '2026-11-01', 'priority' => 'high', 'sector' => 'Exams', 'someday' => true],
            ['title' => 'Loose checklist'],
            ['title' => 'Someday pile', 'someday' => true, 'type' => 'meeting', 'master_record_id' => $other->id],
        ],
    ])->assertCreated();

    expect(array_keys($res->json()))->toBe(['items', 'record', 'balance', 'streak'])
        ->and($res->json('record'))->toBe(['id' => $case->id, 'code' => 'MR-1', 'title' => 'Exam session'])
        ->and($res->json('balance'))->toBe(0)
        ->and($res->json('streak'))->toBe(0)
        ->and($res->json('items'))->toHaveCount(3)
        ->and($res->json('items.0'))->toMatchArray([
            'number' => '0001',
            'title' => 'Grade papers',
            'type' => 'task',
            'priority' => 'high',
            'sector' => 'Exams',
            'deadline' => '2026-11-01',
            'someday' => false,
            'master_record' => [
                'id' => $case->id,
                'code' => 'MR-1',
                'title' => 'Exam session',
                'session_date' => null,
                'student_count' => null,
            ],
        ])
        ->and($res->json('items.1'))->toMatchArray([
            'title' => 'Loose checklist',
            'type' => 'task',
            'deadline' => null,
            'someday' => false,
            'priority' => 'medium',
        ])
        ->and($res->json('items.2'))->toMatchArray([
            'title' => 'Someday pile',
            'type' => 'task',
            'deadline' => null,
            'someday' => true,
        ]);

    $ids = collect($res->json('items'))->pluck('id');
    $stored = Item::whereIn('id', $ids)->orderBy('number')->get();
    expect($stored)->toHaveCount(3)
        ->and($stored->every(fn (Item $item) => $item->type === ItemType::Task && $item->master_record_id === $case->id))->toBeTrue()
        ->and(DB::table('item_links')->count())->toBe(0);

    $inbox = $this->getJson('/api/inbox')->assertOk();
    expect(collect($inbox->json('inbox'))->pluck('title')->all())->toBe(['Loose checklist'])
        ->and(collect($inbox->json('someday'))->pluck('title')->all())->toBe(['Someday pile'])
        ->and($stored[1]->isInbox())->toBeTrue();
});

it('blocks spawn on another user\'s case', function () {
    $case = phase3Case(User::factory()->create());
    $this->actingAs($this->user);

    $this->postJson("/api/master-records/{$case->id}/spawn", [
        'items' => [['title' => 'Nope']],
    ])->assertForbidden();

    $this->postJson('/api/master-records/999999/spawn', [
        'items' => [['title' => 'Missing']],
    ])->assertNotFound();

    expect(Item::count())->toBe(0);
});

it('rejects more than 20 spawn lines and blank titles without creating any', function () {
    $case = phase3Case($this->user);
    $this->actingAs($this->user);

    $tooMany = [];
    for ($i = 1; $i <= 21; $i++) {
        $tooMany[] = ['title' => "Line {$i}"];
    }

    foreach ([
        ['items' => []],
        ['items' => $tooMany],
        ['items' => [['title' => ''], ['title' => 'Second']]],
        ['items' => [['title' => '   ']]],
    ] as $body) {
        $this->postJson("/api/master-records/{$case->id}/spawn", $body)->assertUnprocessable();
    }

    expect(Item::count())->toBe(0)
        ->and(DB::table('item_links')->count())->toBe(0);

    $twenty = [];
    for ($i = 1; $i <= 20; $i++) {
        $twenty[] = ['title' => "Pack {$i}"];
    }

    $this->postJson("/api/master-records/{$case->id}/spawn", ['items' => $twenty])
        ->assertCreated()
        ->assertJsonCount(20, 'items');

    expect(Item::where('master_record_id', $case->id)->count())->toBe(20)
        ->and(Item::where('master_record_id', $case->id)->where('type', 'task')->count())->toBe(20);
});
