<?php

use App\Enums\ItemType;
use App\Models\Item;
use App\Models\MasterRecord;
use App\Models\User;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});
afterEach(fn () => Carbon::setTestNow());

it('requires authentication to add follow-ups', function () {
    $meeting = mine($this->user, ['type' => 'meeting', 'title' => 'Standup']);

    $this->postJson("/api/items/{$meeting->id}/follow-ups", [
        'items' => [['title' => 'Send notes']],
    ])->assertUnauthorized();

    expect(Item::count())->toBe(1);
});

it('creates linked task follow-ups and copies the parent case', function () {
    $case = MasterRecord::create([
        'user_id' => $this->user->id, 'code' => 'MR-9', 'title' => 'Class',
    ]);
    $meeting = mine($this->user, [
        'type' => 'meeting',
        'title' => 'Lecture recap',
        'master_record_id' => $case->id,
        'deadline' => '2026-10-20',
    ]);
    $foreign = MasterRecord::create([
        'user_id' => User::factory()->create()->id, 'code' => 'MR-X', 'title' => 'Not mine',
    ]);
    $this->actingAs($this->user);

    $res = $this->postJson("/api/items/{$meeting->id}/follow-ups", [
        'items' => [
            ['title' => 'Send notes to class', 'deadline' => '2026-11-01', 'priority' => 'medium', 'sector' => 'Banking', 'someday' => false],
            ['title' => 'Book the room', 'priority' => 'high'],
            ['title' => 'Ignore my type', 'type' => 'meeting', 'master_record_id' => $foreign->id],
        ],
    ])->assertCreated();

    expect(array_keys($res->json()))->toBe(['items', 'linked_to', 'balance', 'streak'])
        ->and($res->json('linked_to'))->toBe([
            'id' => $meeting->id,
            'number' => '0001',
            'title' => 'Lecture recap',
            'type' => 'meeting',
        ])
        ->and($res->json('balance'))->toBe(0)
        ->and($res->json('streak'))->toBe(0)
        ->and($res->json('items'))->toHaveCount(3);

    $notes = $res->json('items.0');
    $room = $res->json('items.1');
    $ignored = $res->json('items.2');

    expect($notes)->toMatchArray([
        'number' => '0002',
        'title' => 'Send notes to class',
        'type' => 'task',
        'status' => 'not_started',
        'priority' => 'medium',
        'sector' => 'Banking',
        'deadline' => '2026-11-01',
        'someday' => false,
        'done' => false,
        'sub_total' => 0,
        'master_record' => [
            'id' => $case->id,
            'code' => 'MR-9',
            'title' => 'Class',
            'session_date' => null,
            'student_count' => null,
        ],
    ])->and($room)->toMatchArray([
        'number' => '0003',
        'title' => 'Book the room',
        'type' => 'task',
        'priority' => 'high',
        'deadline' => null,
        'someday' => false,
        'sector' => null,
    ])->and($ignored)->toMatchArray([
        'type' => 'task',
        'master_record' => ['id' => $case->id, 'code' => 'MR-9', 'title' => 'Class', 'session_date' => null, 'student_count' => null],
    ]);

    $childIds = collect($res->json('items'))->pluck('id');
    $stored = Item::whereIn('id', $childIds)->get();
    expect($stored->every(fn (Item $item) => $item->type === ItemType::Task))->toBeTrue()
        ->and($stored->pluck('master_record_id')->unique()->values()->all())->toBe([$case->id])
        ->and(DB::table('item_links')->orderBy('id')->get(['item_id', 'linked_item_id'])->map(fn ($row) => [(int) $row->item_id, (int) $row->linked_item_id])->all())
        ->toBe($childIds->map(fn ($id) => [$meeting->id, $id])->all());

    $fromMeeting = collect($this->getJson("/api/items/{$meeting->id}")->assertOk()->json('linked'))->pluck('id')->sort()->values()->all();
    expect($fromMeeting)->toBe($childIds->sort()->values()->all());

    $fromChild = collect($this->getJson("/api/items/{$notes['id']}")->assertOk()->json('linked'))->pluck('id')->all();
    expect($fromChild)->toBe([$meeting->id]);
});

it('rejects follow-ups unless the parent is a meeting', function () {
    $this->actingAs($this->user);

    foreach (['task', 'ticket', 'request'] as $type) {
        $parent = mine($this->user, ['type' => $type, 'title' => $type]);
        $before = Item::count();

        $this->postJson("/api/items/{$parent->id}/follow-ups", [
            'items' => [['title' => 'Should not exist']],
        ])->assertUnprocessable()->assertExactJson([
            'message' => 'Follow-ups only work on Meeting items.',
        ]);

        expect(Item::count())->toBe($before)
            ->and(DB::table('item_links')->count())->toBe(0);
    }
});

it('parks and schedules follow-ups with the someday rules and leaves undated ones in the inbox', function () {
    $meeting = mine($this->user, ['type' => 'meeting', 'title' => 'Planning', 'deadline' => '2026-10-20']);
    $this->actingAs($this->user);

    $res = $this->postJson("/api/items/{$meeting->id}/follow-ups", [
        'items' => [
            ['title' => 'Loose note'],
            ['title' => 'Later', 'someday' => true],
            ['title' => 'Schedule wins', 'someday' => true, 'deadline' => '2026-11-01'],
            ['title' => 'Explicit inbox', 'someday' => false],
        ],
    ])->assertCreated();

    expect($res->json('items.0'))->toMatchArray(['title' => 'Loose note', 'deadline' => null, 'someday' => false])
        ->and($res->json('items.1'))->toMatchArray(['title' => 'Later', 'deadline' => null, 'someday' => true])
        ->and($res->json('items.2'))->toMatchArray(['title' => 'Schedule wins', 'deadline' => '2026-11-01', 'someday' => false])
        ->and($res->json('items.3'))->toMatchArray(['title' => 'Explicit inbox', 'deadline' => null, 'someday' => false])
        ->and(Item::find($res->json('items.0.id'))->master_record_id)->toBeNull();

    $inbox = $this->getJson('/api/inbox')->assertOk();
    expect(collect($inbox->json('inbox'))->pluck('title')->all())->toBe(['Loose note', 'Explicit inbox'])
        ->and(collect($inbox->json('someday'))->pluck('title')->all())->toBe(['Later'])
        ->and(Item::find($res->json('items.0.id'))->isInbox())->toBeTrue()
        ->and(Item::find($res->json('items.1.id'))->isSomeday())->toBeTrue();
});

it('blocks follow-ups on another user\'s item', function () {
    $meeting = mine(User::factory()->create(), ['type' => 'meeting', 'title' => 'Theirs']);
    $this->actingAs($this->user);

    $this->postJson("/api/items/{$meeting->id}/follow-ups", [
        'items' => [['title' => 'Nope']],
    ])->assertForbidden();

    $this->postJson('/api/items/999999/follow-ups', [
        'items' => [['title' => 'Missing']],
    ])->assertNotFound();

    expect(Item::count())->toBe(1)
        ->and(DB::table('item_links')->count())->toBe(0);
});

it('rejects an empty follow-up list, a list over 20, and blank titles without creating any', function () {
    $meeting = mine($this->user, ['type' => 'meeting', 'title' => 'Standup']);
    $this->actingAs($this->user);

    $tooMany = [];
    for ($i = 1; $i <= 21; $i++) {
        $tooMany[] = ['title' => "Line {$i}"];
    }

    foreach ([
        [],
        ['items' => []],
        ['items' => $tooMany],
        ['items' => [['title' => '']]],
        ['items' => [['title' => '   ']]],
        ['items' => [['title' => 'Keep'], ['title' => '']]],
        ['items' => [['title' => 'Nope', 'someday' => 'yes']]],
        ['items' => [['title' => 'Nope', 'deadline' => '11/01/2026']]],
        ['items' => 'nope'],
    ] as $body) {
        $this->postJson("/api/items/{$meeting->id}/follow-ups", $body)->assertUnprocessable();
    }

    expect(Item::where('user_id', $this->user->id)->count())->toBe(1)
        ->and(DB::table('item_links')->count())->toBe(0);

    $twenty = [];
    for ($i = 1; $i <= 20; $i++) {
        $twenty[] = ['title' => "Ok {$i}"];
    }
    $this->postJson("/api/items/{$meeting->id}/follow-ups", ['items' => $twenty])->assertCreated();
    expect(Item::where('type', 'task')->count())->toBe(20)
        ->and(DB::table('item_links')->count())->toBe(20);
});

it('rolls back the whole follow-up batch when a later line fails', function () {
    $meeting = mine($this->user, ['type' => 'meeting', 'title' => 'Standup']);
    $this->actingAs($this->user);

    $dispatcher = Item::getEventDispatcher();
    Item::setEventDispatcher(new Dispatcher);
    $seen = 0;
    Item::creating(function () use (&$seen) {
        $seen++;
        if ($seen === 2) {
            throw new RuntimeException('stop the batch');
        }
    });

    try {
        $this->withoutExceptionHandling();
        expect(fn () => $this->postJson("/api/items/{$meeting->id}/follow-ups", [
            'items' => [
                ['title' => 'First'],
                ['title' => 'Second'],
            ],
        ]))->toThrow(RuntimeException::class);
    } finally {
        Item::setEventDispatcher($dispatcher);
    }

    expect($seen)->toBe(2)
        ->and(Item::withTrashed()->where('user_id', $this->user->id)->count())->toBe(1)
        ->and(DB::table('item_links')->count())->toBe(0);
});
