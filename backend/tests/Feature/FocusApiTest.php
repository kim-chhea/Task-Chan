<?php

use App\Enums\FocusSessionStatus;
use App\Enums\ItemStatus;
use App\Enums\LedgerReason;
use App\Models\FocusSession;
use App\Models\Item;
use App\Models\TokenLedger;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 10:00', 'Asia/Bangkok'));
    $this->user = User::factory()->create();
});

afterEach(fn () => Carbon::setTestNow());

function openItem(User $user, array $attrs = []): Item
{
    return Item::factory()->for($user)->create(['number' => Item::nextNumber($user->id), ...$attrs]);
}

function finishFocus(int $id): void
{
    $session = FocusSession::query()->findOrFail($id);
    Carbon::setTestNow($session->ends_at->copy());
}

it('requires authentication', function () {
    $this->postJson('/api/focus/start', ['minutes' => 25])->assertUnauthorized();
    $this->getJson('/api/focus/active')->assertUnauthorized();
    $this->postJson('/api/focus/1/complete')->assertUnauthorized();
    $this->postJson('/api/focus/1/cancel')->assertUnauthorized();
});

it('starts a focus and pays the bonus when the timer ends without completing the item', function () {
    $item = openItem($this->user, ['title' => 'Write the brief', 'type' => 'task', 'status' => ItemStatus::InProgress]);

    $this->actingAs($this->user)->getJson('/api/focus/active')->assertOk()->assertJsonPath('session', null);

    $res = $this->postJson('/api/focus/start', ['item_id' => $item->id, 'minutes' => 25])->assertCreated();
    $res->assertJsonPath('session.item_id', $item->id)
        ->assertJsonPath('session.item.id', $item->id)
        ->assertJsonPath('session.item.number', '0001')
        ->assertJsonPath('session.item.title', 'Write the brief')
        ->assertJsonPath('session.item.type', 'task')
        ->assertJsonPath('session.planned_minutes', 25)
        ->assertJsonPath('session.status', 'running')
        ->assertJsonPath('session.awarded_tokens', 0)
        ->assertJsonPath('session.bonus', 10)
        ->assertJsonPath('balance', 0)
        ->assertJsonPath('streak', 0);

    $session = FocusSession::query()->findOrFail($res->json('session.id'));
    expect($session->ends_at->equalTo($session->started_at->copy()->addMinutes(25)))->toBeTrue()
        ->and(Carbon::parse($res->json('session.started_at'))->equalTo($session->started_at))->toBeTrue()
        ->and(TokenLedger::count())->toBe(0);

    $this->getJson('/api/focus/active')->assertOk()->assertJsonPath('session.id', $session->id);

    finishFocus($session->id);
    $done = $this->postJson("/api/focus/{$session->id}/complete")->assertOk();
    $done->assertJsonPath('awarded', 10)
        ->assertJsonPath('balance', 10)
        ->assertJsonPath('streak', 0)
        ->assertJsonPath('session.status', 'completed')
        ->assertJsonPath('session.awarded_tokens', 10)
        ->assertJsonPath('session.bonus', 10);

    expect($item->fresh()->status)->toBe(ItemStatus::InProgress)
        ->and($item->fresh()->completed_at)->toBeNull()
        ->and(TokenLedger::query()->where('reason', LedgerReason::ItemDone)->count())->toBe(0)
        ->and(TokenLedger::query()->where('reason', LedgerReason::FocusBonus)->count())->toBe(1)
        ->and(TokenLedger::query()->where('ref', "focus:{$session->id}")->value('delta'))->toBe(10);

    $this->getJson('/api/focus/active')->assertOk()->assertJsonPath('session', null);
    $this->postJson("/api/focus/{$session->id}/complete")->assertUnprocessable();
    expect($this->user->balance())->toBe(10);
});

it('rejects completion before the timer ends, including inside the grace window boundary', function () {
    $this->actingAs($this->user);
    $id = $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated()->json('session.id');
    $session = FocusSession::query()->findOrFail($id);
    $grace = (int) config('locker.focus.complete_grace_seconds');

    Carbon::setTestNow($session->ends_at->copy()->subSeconds($grace + 1));
    $this->postJson("/api/focus/{$id}/complete")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Focus time is not finished yet.');
    expect($session->fresh()->status)->toBe(FocusSessionStatus::Running)
        ->and($this->user->balance())->toBe(0)
        ->and(TokenLedger::count())->toBe(0);

    Carbon::setTestNow($session->ends_at->copy()->subSeconds($grace));
    $this->postJson("/api/focus/{$id}/complete")
        ->assertOk()
        ->assertJsonPath('awarded', 10)
        ->assertJsonPath('balance', 10);
});

it('cancels a running focus without paying', function () {
    $item = openItem($this->user);
    $this->actingAs($this->user);
    $id = $this->postJson('/api/focus/start', ['item_id' => $item->id, 'minutes' => 25])->assertCreated()->json('session.id');

    finishFocus($id);
    $res = $this->postJson("/api/focus/{$id}/cancel")->assertOk();
    $res->assertJsonPath('session.status', 'canceled')
        ->assertJsonPath('session.awarded_tokens', 0)
        ->assertJsonPath('balance', 0)
        ->assertJsonPath('streak', 0)
        ->assertJsonMissingPath('awarded');

    expect(TokenLedger::query()->where('reason', LedgerReason::FocusBonus)->count())->toBe(0)
        ->and($item->fresh()->status)->not->toBe(ItemStatus::Done)
        ->and(FocusSession::query()->find($id)->canceled_at)->not->toBeNull();

    $this->getJson('/api/focus/active')->assertJsonPath('session', null);
    $this->postJson("/api/focus/{$id}/cancel")->assertUnprocessable();
    $this->postJson("/api/focus/{$id}/complete")->assertUnprocessable();
    expect($this->user->balance())->toBe(0);
});

it('rejects a second focus while one is running', function () {
    $this->actingAs($this->user);
    $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated();

    $this->postJson('/api/focus/start', ['minutes' => 50])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Finish or cancel your current Focus first.');

    expect(FocusSession::count())->toBe(1);
});

it('rejects focus on an item that is not open for this user', function () {
    $done = openItem($this->user, ['priority' => 'low', 'deadline' => null]);
    $done->forceFill(['status' => ItemStatus::Done, 'completed_at' => now()])->save();
    $trashed = openItem($this->user);
    $trashed->delete();
    $theirs = openItem(User::factory()->create());

    $this->actingAs($this->user);

    foreach ([$done->id, $trashed->id, $theirs->id, 999999] as $itemId) {
        $this->postJson('/api/focus/start', ['item_id' => $itemId, 'minutes' => 25])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Focus only works on open items.');
    }

    expect(FocusSession::count())->toBe(0)->and($this->user->balance())->toBe(0);
});

it('hides another user\'s session and missing sessions', function () {
    $this->actingAs($this->user);
    $id = $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated()->json('session.id');
    $other = User::factory()->create();

    $this->actingAs($other);
    $this->postJson("/api/focus/{$id}/complete")->assertForbidden();
    $this->postJson("/api/focus/{$id}/cancel")->assertForbidden();
    $this->getJson('/api/focus/active')->assertOk()->assertJsonPath('session', null);
    $this->postJson('/api/focus/999999/complete')->assertNotFound();
    $this->postJson('/api/focus/999999/cancel')->assertNotFound();

    expect(FocusSession::query()->find($id)->status)->toBe(FocusSessionStatus::Running)
        ->and(TokenLedger::count())->toBe(0);
});

it('stops at the daily cap and resets the next local day', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-07 00:30', 'Asia/Bangkok'));
    $this->actingAs($this->user);

    foreach (range(1, 4) as $ignored) {
        FocusSession::create([
            'user_id' => $this->user->id,
            'planned_minutes' => 25,
            'started_at' => Carbon::parse('2026-10-06 22:00', 'Asia/Bangkok'),
            'ends_at' => Carbon::parse('2026-10-06 22:25', 'Asia/Bangkok'),
            'completed_at' => Carbon::parse('2026-10-06 23:30', 'Asia/Bangkok'),
            'status' => FocusSessionStatus::Completed,
            'awarded_tokens' => 10,
        ]);
    }

    $probe = $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated()->json('session.id');
    $this->postJson("/api/focus/{$probe}/cancel")->assertOk();

    foreach (range(1, 4) as $ignored) {
        $id = $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated()->json('session.id');
        finishFocus($id);
        $this->postJson("/api/focus/{$id}/complete")->assertOk();
    }

    $this->postJson('/api/focus/start', ['minutes' => 25])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Daily Focus limit reached.');
    expect($this->user->balance())->toBe(40)
        ->and(FocusSession::query()->where('status', FocusSessionStatus::Completed)->whereDate('completed_at', '2026-10-07')->count())->toBe(4);

    Carbon::setTestNow(Carbon::parse('2026-10-08 00:05', 'Asia/Bangkok'));
    $this->postJson('/api/focus/start', ['minutes' => 25])->assertCreated();
});

it('pays a free focus that is not attached to an item', function () {
    $this->actingAs($this->user);
    $res = $this->postJson('/api/focus/start', ['minutes' => 50, 'item_id' => null])->assertCreated();
    $res->assertJsonPath('session.item', null)
        ->assertJsonPath('session.item_id', null)
        ->assertJsonPath('session.planned_minutes', 50)
        ->assertJsonPath('session.bonus', 20)
        ->assertJsonPath('balance', 0);

    $id = $res->json('session.id');
    finishFocus($id);

    $this->postJson("/api/focus/{$id}/complete")
        ->assertOk()
        ->assertJsonPath('awarded', 20)
        ->assertJsonPath('balance', 20)
        ->assertJsonPath('session.item', null)
        ->assertJsonPath('session.awarded_tokens', 20);

    $row = TokenLedger::query()->where('ref', "focus:{$id}")->first();
    expect($row->reason)->toBe(LedgerReason::FocusBonus)
        ->and($row->item_id)->toBeNull()
        ->and($row->delta)->toBe(20);
});

it('rejects a length that is not a preset', function () {
    $this->actingAs($this->user);

    $this->postJson('/api/focus/start', [])->assertUnprocessable()->assertJsonValidationErrors('minutes');
    $this->postJson('/api/focus/start', ['minutes' => 15])->assertUnprocessable()->assertJsonValidationErrors('minutes');
    $this->postJson('/api/focus/start', ['minutes' => 40])->assertUnprocessable()->assertJsonValidationErrors('minutes');

    expect(FocusSession::count())->toBe(0)->and(TokenLedger::count())->toBe(0);
});
