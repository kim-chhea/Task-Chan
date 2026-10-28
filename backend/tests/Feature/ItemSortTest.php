<?php

use App\Enums\ItemStatus;
use App\Models\Item;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

function sortedItem(User $user, array $attrs = []): Item
{
    return Item::factory()->for($user)->create(['number' => Item::nextNumber($user->id), ...$attrs]);
}

function itemTitles($response): array
{
    return collect($response->json('items'))->pluck('title')->all();
}

it('keeps the default order when sort is omitted and ignores dir', function () {
    sortedItem($this->user, ['number' => 1, 'title' => 'one', 'deadline' => '2026-01-01']);
    sortedItem($this->user, ['number' => 2, 'title' => 'two', 'deadline' => null]);
    sortedItem($this->user, ['number' => 10, 'title' => 'ten', 'deadline' => '2026-03-01']);

    foreach (['/api/items', '/api/items?dir=desc', '/api/items?dir=nope'] as $url) {
        $res = $this->actingAs($this->user)->getJson($url)->assertOk();

        expect($res->json('filters.sort'))->toBeNull()
            ->and($res->json('filters.dir'))->toBeNull()
            ->and(itemTitles($res))->toBe(['ten', 'one', 'two'])
            ->and($res->json('matched'))->toBe(3);
    }
});

it('sorts number numerically and does not treat that as the default order', function () {
    sortedItem($this->user, ['number' => 10, 'title' => 'ten', 'deadline' => null]);
    sortedItem($this->user, ['number' => 2, 'title' => 'two', 'deadline' => '2026-01-01']);
    sortedItem($this->user, ['number' => 3, 'title' => 'three', 'deadline' => '2026-02-01']);

    $asc = $this->actingAs($this->user)->getJson('/api/items?sort=number')->assertOk();
    expect($asc->json('filters.sort'))->toBe('number')
        ->and($asc->json('filters.dir'))->toBe('asc')
        ->and(itemTitles($asc))->toBe(['two', 'three', 'ten']);

    $desc = $this->getJson('/api/items?sort=number&dir=desc')->assertOk();
    expect($desc->json('filters.dir'))->toBe('desc')
        ->and(itemTitles($desc))->toBe(['ten', 'three', 'two']);
});

it('sorts text and enum columns by the stored string', function (string $column, array $values, array $asc) {
    foreach ($values as $value) {
        sortedItem($this->user, ['title' => (string) $value, $column => $value]);
    }

    $up = $this->actingAs($this->user)->getJson('/api/items?sort='.$column.'&dir=asc')->assertOk();
    expect(itemTitles($up))->toBe($asc)
        ->and($up->json('filters.sort'))->toBe($column)
        ->and($up->json('filters.dir'))->toBe('asc');

    $down = $this->getJson('/api/items?sort='.$column.'&dir=desc')->assertOk();
    expect(itemTitles($down))->toBe(array_reverse($asc))
        ->and($down->json('filters.dir'))->toBe('desc');
})->with([
    'title' => ['title', ['b', 'C', 'a'], ['a', 'b', 'C']],
    'type' => ['type', ['ticket', 'request', 'meeting', 'task'], ['meeting', 'request', 'task', 'ticket']],
    'status' => ['status', ['not_started', 'in_progress', 'done'], ['done', 'in_progress', 'not_started']],
    'priority' => ['priority', ['low', 'medium', 'high'], ['high', 'low', 'medium']],
    'sector' => ['sector', ['m', 'N', 'a'], ['a', 'm', 'N']],
]);

it('sorts deadlines with nulls last in both directions', function () {
    sortedItem($this->user, ['title' => 'later', 'deadline' => '2026-06-01']);
    sortedItem($this->user, ['title' => 'none', 'deadline' => null]);
    sortedItem($this->user, ['title' => 'sooner', 'deadline' => '2026-01-01']);

    $asc = $this->actingAs($this->user)->getJson('/api/items?sort=deadline&dir=asc')->assertOk();
    expect(itemTitles($asc))->toBe(['sooner', 'later', 'none']);

    $desc = $this->getJson('/api/items?sort=deadline&dir=desc')->assertOk();
    expect(itemTitles($desc))->toBe(['later', 'sooner', 'none']);
});

it('sorts received_at with nulls last in both directions', function () {
    sortedItem($this->user, ['title' => 'later', 'received_at' => '2026-06-01']);
    sortedItem($this->user, ['title' => 'none', 'received_at' => null]);
    sortedItem($this->user, ['title' => 'sooner', 'received_at' => '2026-01-01']);

    $asc = $this->actingAs($this->user)->getJson('/api/items?sort=received_at&dir=asc')->assertOk();
    expect(itemTitles($asc))->toBe(['sooner', 'later', 'none']);

    $desc = $this->getJson('/api/items?sort=received_at&dir=desc')->assertOk();
    expect(itemTitles($desc))->toBe(['later', 'sooner', 'none']);
});

it('applies filters and search together with sort', function () {
    sortedItem($this->user, ['title' => 'zeta report', 'status' => ItemStatus::Done, 'sector' => 'Banking']);
    sortedItem($this->user, ['title' => 'alpha report', 'status' => ItemStatus::Done, 'sector' => 'Banking']);
    sortedItem($this->user, ['title' => 'mid report', 'status' => ItemStatus::Done, 'sector' => 'Exams']);
    sortedItem($this->user, ['title' => 'alpha open', 'status' => ItemStatus::NotStarted, 'sector' => 'Banking']);

    $res = $this->actingAs($this->user)
        ->getJson('/api/items?q=report&status=done&sector=Banking&sort=title&dir=desc')
        ->assertOk();

    expect($res->json('filters'))->toBe([
        'status' => 'done',
        'type' => 'all',
        'sector' => 'Banking',
        'range' => 'all',
        'q' => 'report',
        'sort' => 'title',
        'dir' => 'desc',
    ])->and($res->json('matched'))->toBe(2)
        ->and(itemTitles($res))->toBe(['zeta report', 'alpha report']);
});

it('does not return another user\'s items when sorting', function () {
    sortedItem(User::factory()->create(), ['title' => 'aaa', 'number' => 1]);
    sortedItem($this->user, ['title' => 'zzz', 'number' => 1]);

    $res = $this->actingAs($this->user)->getJson('/api/items?sort=title&dir=asc')->assertOk();

    expect(itemTitles($res))->toBe(['zzz'])
        ->and($res->json('matched'))->toBe(1)
        ->and($res->json('total'))->toBe(1);
});

it('rejects an unknown sort, reward, and custom fields', function (string $sort) {
    $this->actingAs($this->user)
        ->getJson('/api/items?sort='.urlencode($sort))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('sort');
})->with(['nope', 'reward', 'cf:1', 'cf:12']);

it('rejects a bad direction when sort is set', function () {
    $this->actingAs($this->user)
        ->getJson('/api/items?sort=title&dir=up')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dir');
});

it('still rejects a q longer than 100 characters when sort is set', function () {
    $this->actingAs($this->user)
        ->getJson('/api/items?sort=title&q='.str_repeat('a', 101))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');
});

it('requires authentication to sort items', function () {
    $this->getJson('/api/items?sort=title')->assertUnauthorized();
});
