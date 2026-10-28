<?php

namespace App\Services;

use App\Enums\ItemStatus;
use App\Enums\LedgerReason;
use App\Exceptions\InsufficientTokensException;
use App\Models\FocusSession;
use App\Models\Item;
use App\Models\OwnedCosmetic;
use App\Models\Streak;
use App\Models\TokenLedger;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Single writer of the token ledger. Balance = SUM(delta); there is no mutable balance column.
 * Every public method opens its own transaction and row-locks the user.
 */
class TokenService
{
    private const EQUIP_COLUMNS = [
        'hair' => 'equipped_hair',
        'outfit' => 'equipped_outfit',
        'gear' => 'equipped_gear',
        'partner' => 'equipped_partner',
        'stage' => 'active_stage',
    ];

    public function balance(User $user): int
    {
        return $user->balance();
    }

    /**
     * Mark an item Done and pay out. Idempotent: an item already Done pays nothing.
     *
     * @return array{awarded:int, streak_bonus:int}
     */
    public function complete(Item $item, ?CarbonInterface $at = null): array
    {
        return DB::transaction(function () use ($item, $at) {
            $user = $this->lockUser($item->user_id);
            $item->refresh();

            if ($item->status === ItemStatus::Done && $item->completed_at !== null) {
                return ['awarded' => 0, 'streak_bonus' => 0];
            }

            $at = CarbonImmutable::instance($at ?? now());
            $cycle = $item->completion_cycle + 1;

            $base = $item->priority->reward();
            $early = ($item->deadline !== null && $at->toDateString() <= $item->deadline->toDateString())
                ? (int) config('locker.early_bonus') : 0;

            $this->record($user, $base, LedgerReason::ItemDone, $item, null, "item_done:{$item->id}:{$cycle}");
            if ($early > 0) {
                $this->record($user, $early, LedgerReason::EarlyBonus, $item, null, "early_bonus:{$item->id}:{$cycle}");
            }

            $item->forceFill([
                'status' => ItemStatus::Done,
                'completed_at' => $at,
                'reward_tokens' => $base + $early,
                'completion_cycle' => $cycle,
                'status_before_done' => $item->status === ItemStatus::InProgress ? 'in_progress' : 'not_started',
            ])->save();

            $streakBonus = $this->syncStreak($user, $item);

            return ['awarded' => $base + $early, 'streak_bonus' => $streakBonus];
        });
    }

    /**
     * Move an item away from Done and reverse what that completion paid (item + early bonus), plus any streak
     * bonus that is no longer earned. Refuses (rolls back) if that would push the balance below zero.
     */
    public function undo(Item $item, ItemStatus $newStatus): int
    {
        return DB::transaction(function () use ($item, $newStatus) {
            $user = $this->lockUser($item->user_id);
            $item->refresh();

            if ($item->status !== ItemStatus::Done) {
                $item->forceFill(['status' => $newStatus])->save();

                return 0;
            }

            $cycle = $item->completion_cycle;
            $paid = (int) TokenLedger::where('user_id', $user->id)
                ->whereIn('ref', ["item_done:{$item->id}:{$cycle}", "early_bonus:{$item->id}:{$cycle}"])
                ->sum('delta');

            if ($paid !== 0) {
                $this->record($user, -$paid, LedgerReason::ItemUndone, $item, null, "item_undone:{$item->id}:{$cycle}");
            }

            $item->forceFill(['status' => $newStatus, 'completed_at' => null, 'reward_tokens' => 0])->save();

            // A streak day only counts while an item completed that day is still Done.
            $streakReversed = -$this->syncStreak($user, $item);

            if ($user->balance() < 0) {
                // Rolls the whole transaction back: the tokens from this item were already spent.
                throw new InsufficientTokensException(-$user->balance(), $user->balance() + $paid + $streakReversed);
            }

            return $paid + $streakReversed;
        });
    }

    /** Buy a Locker item. Price comes from config only; never from the client. */
    public function purchase(User $user, string $category, string $key): int
    {
        $def = config("locker.items.{$category}.{$key}");
        if ($def === null) {
            throw new InvalidArgumentException('Unknown locker item.');
        }

        return DB::transaction(function () use ($user, $category, $key, $def) {
            $user = $this->lockUser($user->id);

            if (OwnedCosmetic::where(['user_id' => $user->id, 'category' => $category, 'key' => $key])->exists()) {
                throw new InvalidArgumentException('Already owned.');
            }

            $price = (int) $def['price'];
            $balance = $user->balance();
            if ($balance < $price) {
                throw new InsufficientTokensException($price - $balance, $balance);
            }

            if ($price > 0) {
                $this->record($user, -$price, LedgerReason::Purchase, null, "{$category}:{$key}", null);
            }
            OwnedCosmetic::create(['user_id' => $user->id, 'category' => $category, 'key' => $key]);

            return $user->balance();
        });
    }

    /**
     * Pay the Focus bonus for one session. Idempotent on ref "focus:{id}".
     * The amount comes from config for the session's preset, never from the client.
     */
    public function awardFocus(FocusSession $session): int
    {
        return DB::transaction(function () use ($session) {
            $user = $this->lockUser($session->user_id);
            $session->refresh();

            $ref = "focus:{$session->id}";
            $existing = TokenLedger::where('ref', $ref)->first();
            if ($existing !== null) {
                return (int) $existing->delta;
            }

            $bonuses = config('locker.focus.bonus_per_preset');
            if (! is_array($bonuses) || ! array_key_exists($session->planned_minutes, $bonuses)) {
                throw new InvalidArgumentException('Unknown focus length.');
            }

            $bonus = (int) $bonuses[$session->planned_minutes];
            $this->record($user, $bonus, LedgerReason::FocusBonus, $session->item, null, $ref);

            return $bonus;
        });
    }

    public function equip(User $user, string $category, string $key): void
    {
        $column = self::EQUIP_COLUMNS[$category] ?? null;
        if ($column === null || config("locker.items.{$category}.{$key}") === null) {
            throw new InvalidArgumentException('Unknown locker item.');
        }
        if (! OwnedCosmetic::where(['user_id' => $user->id, 'category' => $category, 'key' => $key])->exists()) {
            throw new InvalidArgumentException('Not owned.');
        }
        $user->forceFill([$column => $key])->save();
    }

    private function lockUser(int $id): User
    {
        return User::query()->whereKey($id)->lockForUpdate()->firstOrFail();
    }

    private function record(User $user, int $delta, LedgerReason $reason, ?Item $item, ?string $lockerKey, ?string $ref): TokenLedger
    {
        // Idempotency: a ref is written at most once (also enforced by a unique index).
        if ($ref !== null && ($existing = TokenLedger::where('ref', $ref)->first())) {
            return $existing;
        }

        return TokenLedger::create([
            'user_id' => $user->id,
            'delta' => $delta,
            'reason' => $reason,
            'item_id' => $item?->id,
            'locker_item_key' => $lockerKey,
            'balance_after' => $user->balance() + $delta,
            'ref' => $ref,
        ]);
    }

    /**
     * Rebuilds the streak from the items that are Done right now, then makes the ledger agree:
     * pays any streak cycle that is earned but unpaid and reverses any that is paid but no longer earned.
     * Because it derives everything from current data, complete-then-undo cannot farm the bonus.
     *
     * @return int net tokens added by streak bonuses in this call (negative when a bonus is reversed)
     */
    private function syncStreak(User $user, Item $item): int
    {
        $length = (int) config('locker.streak_length');
        $bonus = (int) config('locker.streak_bonus');

        $days = Item::query()->where('user_id', $user->id)->where('status', ItemStatus::Done->value)->whereNotNull('completed_at')
            ->pluck('completed_at')
            ->map(fn ($d) => CarbonImmutable::parse($d)->startOfDay())
            ->reject(fn ($d) => $d->isWeekend()) // working days only
            ->unique(fn ($d) => $d->toDateString())
            ->sortBy(fn ($d) => $d->timestamp)
            ->values();

        $current = 0;
        $best = 0;
        $last = null;
        $earned = [];
        foreach ($days as $day) {
            $consecutive = $last !== null && $last->equalTo($this->previousWorkday($day)) && $current < $length;
            $current = $consecutive ? $current + 1 : 1;
            if ($current === $length) {
                $start = $day;
                for ($i = 1; $i < $length; $i++) {
                    $start = $this->previousWorkday($start);
                }
                $earned["streak_bonus:{$user->id}:{$start->toDateString()}"] = true;
            }
            $best = max($best, $current);
            $last = $day;
        }

        Streak::updateOrCreate(['user_id' => $user->id], ['current' => $current, 'best' => $best, 'last_day' => $last?->toDateString()]);

        // Every ledger row for a cycle shares the base ref; "#n" suffixes keep refs unique across re-earns.
        $rows = TokenLedger::where('user_id', $user->id)->where('reason', LedgerReason::StreakBonus->value)->get();
        $bases = $rows->toBase()->map(fn ($r) => explode('#', $r->ref)[0])->merge(array_keys($earned))->unique();

        $net = 0;
        foreach ($bases as $base) {
            $mine = $rows->filter(fn ($r) => explode('#', $r->ref)[0] === $base);
            $paid = (int) $mine->sum('delta');
            $ref = $mine->isEmpty() ? $base : $base.'#'.$mine->count();

            if (isset($earned[$base]) && $paid === 0) {
                $this->record($user, $bonus, LedgerReason::StreakBonus, $item, null, $ref);
                $net += $bonus;
            } elseif (! isset($earned[$base]) && $paid > 0) {
                $this->record($user, -$paid, LedgerReason::StreakBonus, $item, null, $ref);
                $net -= $paid;
            }
        }

        return $net;
    }

    private function previousWorkday(CarbonImmutable $day): CarbonImmutable
    {
        $d = $day->subDay();
        while ($d->isWeekend()) {
            $d = $d->subDay();
        }

        return $d;
    }
}
