<?php

use App\Enums\FocusSessionStatus;
use App\Enums\ItemStatus;
use App\Enums\LedgerReason;
use App\Enums\Priority;
use App\Exceptions\InsufficientTokensException;
use App\Models\FocusSession;
use App\Models\Item;
use App\Models\OwnedCosmetic;
use App\Models\TokenLedger;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->tokens = app(TokenService::class);
    // Wednesday 7 Oct 2026, mid-week so streak days are easy to place.
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
});

afterEach(fn () => Carbon::setTestNow());

function makeItem(User $user, Priority $p = Priority::Medium, ?string $deadline = '2026-10-09'): Item
{
    return Item::factory()->for($user)->priority($p)->due($deadline)->create(['number' => Item::nextNumber($user->id)]);
}

it('awards priority tokens by level', function (Priority $p, int $base) {
    $item = makeItem($this->user, $p, null);
    $res = $this->tokens->complete($item);

    expect($res['awarded'])->toBe($base)
        ->and($this->user->balance())->toBe($base);
})->with([[Priority::Low, 5], [Priority::Medium, 10], [Priority::High, 15]]);

it('adds the early bonus when done on or before the deadline', function () {
    $this->tokens->complete(makeItem($this->user, Priority::High, '2026-10-07')); // on the day
    expect($this->user->balance())->toBe(20);

    $this->tokens->complete(makeItem($this->user, Priority::High, '2026-10-06')); // late
    expect($this->user->balance())->toBe(35);
});

it('does not award twice when completed twice', function () {
    $item = makeItem($this->user, Priority::High);
    $this->tokens->complete($item);
    $second = $this->tokens->complete($item->fresh());

    expect($second['awarded'])->toBe(0)
        ->and($this->user->balance())->toBe(20)
        ->and(TokenLedger::count())->toBe(2);
});

it('reverses exactly what was awarded on undo', function () {
    $item = makeItem($this->user, Priority::High);
    $this->tokens->complete($item);
    $reversed = $this->tokens->undo($item->fresh(), ItemStatus::InProgress);

    expect($reversed)->toBe(20)
        ->and($this->user->balance())->toBe(0)
        ->and($item->fresh()->status)->toBe(ItemStatus::InProgress)
        ->and($item->fresh()->reward_tokens)->toBe(0);
});

it('pays again after undo then re-complete, with a net balance of one award', function () {
    $item = makeItem($this->user, Priority::Medium);
    $this->tokens->complete($item);
    $this->tokens->undo($item->fresh(), ItemStatus::NotStarted);
    $this->tokens->complete($item->fresh());

    expect($this->user->balance())->toBe(15);
});

it('undo on an item that is not Done changes nothing', function () {
    $item = makeItem($this->user);
    expect($this->tokens->undo($item, ItemStatus::InProgress))->toBe(0)
        ->and(TokenLedger::count())->toBe(0);
});

it('blocks a purchase with insufficient funds and leaves state untouched', function () {
    expect(fn () => $this->tokens->purchase($this->user, 'hair', 'ginger'))
        ->toThrow(InsufficientTokensException::class);

    expect(OwnedCosmetic::where(['user_id' => $this->user->id, 'key' => 'ginger'])->exists())->toBeFalse()
        ->and(TokenLedger::count())->toBe(0);
});

it('spends tokens on purchase using the server price and grants ownership', function () {
    $this->tokens->complete(makeItem($this->user, Priority::High)); // +20
    foreach (range(1, 2) as $i) {
        $this->tokens->complete(makeItem($this->user, Priority::High));
    } // 60 total

    $balance = $this->tokens->purchase($this->user, 'hair', 'ginger');

    expect($balance)->toBe(0)
        ->and(OwnedCosmetic::where(['user_id' => $this->user->id, 'key' => 'ginger'])->exists())->toBeTrue()
        ->and(TokenLedger::where('reason', 'purchase')->first()->delta)->toBe(-60);
});

it('rejects buying something already owned and equipping something not owned', function () {
    expect(fn () => $this->tokens->purchase($this->user, 'hair', 'teal'))->toThrow(InvalidArgumentException::class);
    expect(fn () => $this->tokens->equip($this->user, 'hair', 'gold'))->toThrow(InvalidArgumentException::class);

    $this->tokens->equip($this->user, 'hair', 'midnight');
    expect($this->user->fresh()->equipped_hair)->toBe('midnight');
});

it('owns the free catalog on registration', function () {
    expect(OwnedCosmetic::where('user_id', $this->user->id)->count())->toBe(2 + 1 + 2 + 1 + 1);
});

it('pays the 50 token streak bonus once on the fifth consecutive working day', function () {
    // Mon 5 Oct .. Fri 9 Oct 2026
    foreach (['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'] as $d) {
        Carbon::setTestNow(Carbon::parse("$d 10:00", 'Asia/Bangkok'));
        $res = $this->tokens->complete(makeItem($this->user, Priority::Low, null));
        expect($res['streak_bonus'])->toBe(0);
    }

    Carbon::setTestNow(Carbon::parse('2026-10-09 10:00', 'Asia/Bangkok'));
    $item = makeItem($this->user, Priority::Low, null);
    $res = $this->tokens->complete($item);
    expect($res['streak_bonus'])->toBe(50);

    // another item the same day must not re-award
    $res2 = $this->tokens->complete(makeItem($this->user, Priority::Low, null));
    expect($res2['streak_bonus'])->toBe(0)
        ->and(TokenLedger::where('reason', 'streak_bonus')->count())->toBe(1)
        ->and($this->user->balance())->toBe(5 * 5 + 5 + 50);
});

it('resets the streak after a missed working day and skips weekends', function () {
    // Thu, Fri, then Mon is still consecutive (weekend ignored)
    foreach (['2026-10-08', '2026-10-09', '2026-10-12'] as $d) {
        Carbon::setTestNow(Carbon::parse("$d 10:00", 'Asia/Bangkok'));
        $this->tokens->complete(makeItem($this->user, Priority::Low, null));
    }
    expect($this->user->streak->current)->toBe(3);

    // Wed 14 Oct: Tue 13 missed -> restart at 1
    Carbon::setTestNow(Carbon::parse('2026-10-14 10:00', 'Asia/Bangkok'));
    $this->tokens->complete(makeItem($this->user, Priority::Low, null));
    expect($this->user->fresh()->streak->current)->toBe(1)
        ->and($this->user->fresh()->streak->best)->toBe(3);
});
it('cannot farm the streak bonus by completing and undoing items', function () {
    foreach (['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'] as $d) {
        Carbon::setTestNow(Carbon::parse("$d 10:00", 'Asia/Bangkok'));
        $item = makeItem($this->user, Priority::Low, null);
        $this->tokens->complete($item);
        $this->tokens->undo($item->fresh(), ItemStatus::NotStarted);
    }

    expect($this->user->balance())->toBe(0)
        ->and(TokenLedger::where('reason', 'streak_bonus')->sum('delta'))->toBe(0)
        ->and($this->user->streak->current)->toBe(0);
});

it('reverses a streak bonus when the item that completed the streak is undone, and re-pays it on re-complete', function () {
    $last = null;
    foreach (['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'] as $d) {
        Carbon::setTestNow(Carbon::parse("$d 10:00", 'Asia/Bangkok'));
        $last = makeItem($this->user, Priority::Low, null);
        $this->tokens->complete($last);
    }
    expect($this->user->balance())->toBe(25 + 50);

    $reversed = $this->tokens->undo($last->fresh(), ItemStatus::InProgress);
    expect($reversed)->toBe(5 + 50)->and($this->user->balance())->toBe(20);

    $this->tokens->complete($last->fresh());
    expect($this->user->balance())->toBe(75);
});

it('refuses to undo an item whose tokens were already spent', function () {
    $items = collect(range(1, 4))->map(fn () => makeItem($this->user, Priority::High, null));
    $items->each(fn ($i) => $this->tokens->complete($i)); // 60
    $this->tokens->purchase($this->user, 'hair', 'ginger'); // -60 => 0

    expect(fn () => $this->tokens->undo($items[0]->fresh(), ItemStatus::NotStarted))->toThrow(InsufficientTokensException::class);
    expect($items[0]->fresh()->status)->toBe(ItemStatus::Done)->and($this->user->balance())->toBe(0);
});

it('awards the configured focus bonus once per session', function (int $minutes, int $bonus) {
    $item = $minutes === 25 ? makeItem($this->user, Priority::Low, null) : null;
    $started = now();
    $session = FocusSession::create([
        'user_id' => $this->user->id,
        'item_id' => $item?->id,
        'planned_minutes' => $minutes,
        'started_at' => $started,
        'ends_at' => $started->copy()->addMinutes($minutes),
        'status' => FocusSessionStatus::Running,
        'awarded_tokens' => 0,
    ]);

    expect($this->tokens->awardFocus($session))->toBe($bonus)
        ->and($this->tokens->awardFocus($session->fresh()))->toBe($bonus)
        ->and($this->user->balance())->toBe($bonus);

    $rows = TokenLedger::query()->where('reason', LedgerReason::FocusBonus)->get();
    expect($rows)->toHaveCount(1)
        ->and($rows[0]->delta)->toBe($bonus)
        ->and($rows[0]->ref)->toBe("focus:{$session->id}")
        ->and($rows[0]->item_id)->toBe($item?->id)
        ->and($session->fresh()->status)->toBe(FocusSessionStatus::Running);
})->with([[25, 10], [50, 20]]);

it('refuses a focus length that is not a preset', function () {
    $started = now();
    $session = FocusSession::create([
        'user_id' => $this->user->id,
        'planned_minutes' => 15,
        'started_at' => $started,
        'ends_at' => $started->copy()->addMinutes(15),
        'status' => FocusSessionStatus::Running,
        'awarded_tokens' => 0,
    ]);

    expect(fn () => $this->tokens->awardFocus($session))->toThrow(InvalidArgumentException::class)
        ->and($this->user->balance())->toBe(0)
        ->and(TokenLedger::count())->toBe(0);
});

it('shows a streak of zero after a working day is missed', function () {
    $this->tokens->complete(makeItem($this->user, Priority::Low, null)); // Wed 7 Oct
    expect($this->user->fresh()->streak->active())->toBe(1);

    Carbon::setTestNow(Carbon::parse('2026-10-12 10:00', 'Asia/Bangkok')); // Mon, Thu/Fri gap -> broken
    expect($this->user->fresh()->streak->active())->toBe(0);
});
