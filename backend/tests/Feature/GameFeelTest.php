<?php

use App\Enums\LedgerReason;
use App\Models\OwnedCosmetic;
use App\Models\TokenLedger;
use App\Models\User;
use App\Services\TokenService;

test('bootstrap rules include streak bonus and streak length from locker config', function () {
    $rules = $this->getJson('/api/bootstrap')->assertOk()->json('rules');

    expect($rules)->toHaveKeys(['rewards', 'early_bonus', 'streak_bonus', 'streak_length'])
        ->and($rules['streak_bonus'])->toBeInt()->toBe((int) config('locker.streak_bonus'))
        ->and($rules['streak_length'])->toBeInt()->toBe((int) config('locker.streak_length'));
});

test('review lists free defaults and one purchase as locker owned strings', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    OwnedCosmetic::create(['user_id' => $other->id, 'category' => 'outfit', 'key' => 'sky']);

    $price = (int) config('locker.items.hair.ginger.price');
    TokenLedger::create([
        'user_id' => $user->id,
        'delta' => $price,
        'reason' => LedgerReason::ItemDone,
        'balance_after' => $price,
    ]);
    app(TokenService::class)->purchase($user, 'hair', 'ginger');

    $owned = $this->actingAs($user)->getJson('/api/review')->assertOk()->json('owned');

    $free = [];
    foreach (config('locker.items') as $category => $items) {
        foreach ($items as $key => $def) {
            if (($def['price'] ?? 0) === 0) {
                $free[] = "{$category}:{$key}";
            }
        }
    }

    expect($owned)->toBeArray()
        ->and(array_is_list($owned))->toBeTrue()
        ->and($owned)->each->toBeString()
        ->and(collect($owned)->sort()->values()->all())->toEqual(collect([...$free, 'hair:ginger'])->sort()->values()->all())
        ->and($owned)->not->toContain('outfit:sky');
});
