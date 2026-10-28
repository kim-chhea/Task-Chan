<?php

namespace App\Http\Controllers\Api;

use App\Enums\FocusSessionStatus;
use App\Enums\ItemStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\FocusSessionResource;
use App\Models\FocusSession;
use App\Models\Item;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FocusController extends Controller
{
    public function __construct(private TokenService $tokens) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_id' => ['sometimes', 'nullable', 'integer'],
            'minutes' => ['required', 'integer', Rule::in(config('locker.focus.presets'))],
        ]);

        $session = DB::transaction(function () use ($request, $data) {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            $itemId = $data['item_id'] ?? null;
            if ($itemId !== null) {
                $this->openItem($user->id, (int) $itemId);
            }

            $running = FocusSession::query()
                ->where('user_id', $user->id)
                ->where('status', FocusSessionStatus::Running)
                ->exists();
            if ($running) {
                $this->unprocessable('Finish or cancel your current Focus first.');
            }

            // Count completions since local midnight (APP_TIMEZONE, Asia/Bangkok).
            $completedToday = FocusSession::query()
                ->where('user_id', $user->id)
                ->where('status', FocusSessionStatus::Completed)
                ->whereBetween('completed_at', [now()->startOfDay(), now()->endOfDay()])
                ->count();
            if ($completedToday >= (int) config('locker.focus.daily_cap')) {
                $this->unprocessable('Daily Focus limit reached.');
            }

            $started = now();

            return FocusSession::create([
                'user_id' => $user->id,
                'item_id' => $itemId,
                'planned_minutes' => (int) $data['minutes'],
                'started_at' => $started,
                'ends_at' => $started->copy()->addMinutes((int) $data['minutes']),
                'status' => FocusSessionStatus::Running,
                'awarded_tokens' => 0,
            ]);
        });

        return $this->state($request, $session, 201);
    }

    public function active(Request $request): JsonResponse
    {
        $session = FocusSession::query()
            ->where('user_id', $request->user()->id)
            ->where('status', FocusSessionStatus::Running)
            ->latest('id')
            ->first();

        return response()->json([
            'session' => $session === null ? null : new FocusSessionResource($session->load('item')),
        ]);
    }

    public function complete(Request $request, FocusSession $session): JsonResponse
    {
        $this->authorize('manage', $session);

        if ($session->status !== FocusSessionStatus::Running) {
            return response()->json(['message' => 'This Focus is not running.'], 422);
        }

        $earliest = $session->ends_at->copy()->subSeconds((int) config('locker.focus.complete_grace_seconds'));
        if (now()->lt($earliest)) {
            return response()->json(['message' => 'Focus time is not finished yet.'], 422);
        }

        $awarded = DB::transaction(function () use ($session) {
            User::query()->whereKey($session->user_id)->lockForUpdate()->firstOrFail();
            $locked = FocusSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== FocusSessionStatus::Running) {
                $this->unprocessable('This Focus is not running.');
            }

            // Pays the timer bonus only. The linked item stays whatever status it already has.
            $amount = $this->tokens->awardFocus($locked);
            $locked->forceFill([
                'status' => FocusSessionStatus::Completed,
                'completed_at' => now(),
                'awarded_tokens' => $amount,
            ])->save();

            return $amount;
        });

        return $this->state($request, $session->fresh(), 200, ['awarded' => $awarded]);
    }

    public function cancel(Request $request, FocusSession $session): JsonResponse
    {
        $this->authorize('manage', $session);

        $session = DB::transaction(function () use ($session) {
            User::query()->whereKey($session->user_id)->lockForUpdate()->firstOrFail();
            $locked = FocusSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== FocusSessionStatus::Running) {
                $this->unprocessable('This Focus is not running.');
            }

            $locked->forceFill([
                'status' => FocusSessionStatus::Canceled,
                'canceled_at' => now(),
            ])->save();

            return $locked;
        });

        return $this->state($request, $session);
    }

    /** The item must belong to the user and still be open. Caller holds the user row lock. */
    private function openItem(int $userId, int $itemId): void
    {
        $item = Item::query()->whereKey($itemId)->lockForUpdate()->first();
        if ($item === null || $item->user_id !== $userId || $item->status === ItemStatus::Done) {
            $this->unprocessable('Focus only works on open items.');
        }
    }

    private function state(Request $request, FocusSession $session, int $status = 200, array $extra = []): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'session' => new FocusSessionResource($session->load('item')),
            'balance' => $user->balance(),
            'streak' => $user->streak?->active() ?? 0,
            ...$extra,
        ], $status);
    }

    private function unprocessable(string $message): never
    {
        throw new HttpResponseException(response()->json(['message' => $message], 422));
    }
}
