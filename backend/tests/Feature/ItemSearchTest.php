<?php

use App\Enums\ItemStatus;
use App\Models\Item;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

function ownedItem(User $user, array $attrs = []): Item
{
    return Item::factory()->for($user)->create(['number' => Item::nextNumber($user->id), ...$attrs]);
}

it('lists the same items when q is omitted and echoes an empty filter', function () {
    $first = ownedItem($this->user, ['title' => 'Alpha ticket']);
    $second = ownedItem($this->user, ['title' => 'Beta task']);
    ownedItem(User::factory()->create(), ['title' => 'Someone else']);

    $res = $this->actingAs($this->user)->getJson('/api/items')->assertOk();

    expect($res->json('filters'))->toBe([
        'status' => 'all',
        'type' => 'all',
        'sector' => 'all',
        'range' => 'all',
        'q' => '',
    ])->and($res->json('matched'))->toBe(2)
        ->and($res->json('total'))->toBe(2)
        ->and(collect($res->json('items'))->pluck('id')->sort()->values()->all())
        ->toEqual(collect([$first->id, $second->id])->sort()->values()->all());
});

it('matches a title regardless of case and echoes the trimmed query', function () {
    $hit = ownedItem($this->user, ['title' => 'Alpha Report']);
    ownedItem($this->user, ['title' => 'Unrelated']);

    $res = $this->actingAs($this->user)
        ->getJson('/api/items?q='.urlencode('  alpha report  '))
        ->assertOk();

    expect($res->json('filters.q'))->toBe('alpha report')
        ->and($res->json('matched'))->toBe(1)
        ->and(collect($res->json('items'))->pluck('id')->all())->toBe([$hit->id]);
});

it('matches text stored inside notes json', function () {
    $hit = ownedItem($this->user, [
        'title' => 'Ticket from DGB',
        'notes' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'DGB needs a Confirmation Letter for March.']]],
        ],
    ]);
    ownedItem($this->user, [
        'title' => 'Other',
        'notes' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Nothing relevant']]],
        ],
    ]);

    $res = $this->actingAs($this->user)
        ->getJson('/api/items?q='.urlencode('confirmation letter'))
        ->assertOk();

    expect($res->json('filters.q'))->toBe('confirmation letter')
        ->and($res->json('matched'))->toBe(1)
        ->and(collect($res->json('items'))->pluck('id')->all())->toBe([$hit->id]);
});

it('applies q together with status', function () {
    $done = ownedItem($this->user, ['title' => 'Alpha report', 'status' => ItemStatus::Done]);
    ownedItem($this->user, ['title' => 'Alpha notes', 'status' => ItemStatus::NotStarted]);
    ownedItem($this->user, ['title' => 'Other done', 'status' => ItemStatus::Done]);

    $res = $this->actingAs($this->user)->getJson('/api/items?q=alpha&status=done')->assertOk();

    expect($res->json('filters.q'))->toBe('alpha')
        ->and($res->json('filters.status'))->toBe('done')
        ->and($res->json('matched'))->toBe(1)
        ->and(collect($res->json('items'))->pluck('id')->all())->toBe([$done->id]);
});

it('treats a blank or whitespace q as no text filter', function () {
    ownedItem($this->user, ['title' => 'One']);
    ownedItem($this->user, ['title' => 'Two']);

    foreach (['', '   '] as $q) {
        $res = $this->actingAs($this->user)->getJson('/api/items?q='.urlencode($q))->assertOk();

        expect($res->json('filters.q'))->toBe('')
            ->and($res->json('matched'))->toBe(2)
            ->and($res->json('items'))->toHaveCount(2);
    }
});

it('does not return another user\'s items through q', function () {
    ownedItem(User::factory()->create(), ['title' => 'Secret alpha']);
    ownedItem($this->user, ['title' => 'My beta']);

    $res = $this->actingAs($this->user)->getJson('/api/items?q=secret')->assertOk();

    expect($res->json('matched'))->toBe(0)
        ->and($res->json('items'))->toBe([])
        ->and($res->json('total'))->toBe(1);
});

it('rejects a q longer than 100 characters', function () {
    $this->actingAs($this->user)
        ->getJson('/api/items?q='.str_repeat('a', 101))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');

    $this->getJson('/api/items?q='.str_repeat('b', 100))
        ->assertOk()
        ->assertJsonPath('filters.q', str_repeat('b', 100));
});

it('treats percent and underscore in q as literal characters', function () {
    $percent = ownedItem($this->user, ['title' => '100% done']);
    ownedItem($this->user, ['title' => '1000 done']);
    $underscore = ownedItem($this->user, ['title' => 'file_name']);
    ownedItem($this->user, ['title' => 'filename']);

    $pct = $this->actingAs($this->user)->getJson('/api/items?q='.urlencode('100%'))->assertOk();
    expect($pct->json('matched'))->toBe(1)
        ->and(collect($pct->json('items'))->pluck('id')->all())->toBe([$percent->id]);

    $under = $this->getJson('/api/items?q='.urlencode('file_name'))->assertOk();
    expect($under->json('matched'))->toBe(1)
        ->and(collect($under->json('items'))->pluck('id')->all())->toBe([$underscore->id]);
});
