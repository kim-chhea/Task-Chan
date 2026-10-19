<?php

namespace App\Http\Controllers;

use App\Enums\ItemStatus;
use App\Enums\LedgerReason;
use App\Models\Item;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        // ISO week, Mon–Sun, Asia/Bangkok (app timezone).
        $weekStart = CarbonImmutable::now()->startOfWeek();
        $weekEnd = $weekStart->endOfWeek();

        $done = Item::where('user_id', $user->id)->whereBetween('completed_at', [$weekStart, $weekEnd])
            ->orderBy('completed_at')->get();
        $open = Item::where('user_id', $user->id)->where('status', '!=', ItemStatus::Done->value)
            ->orderByRaw('deadline is null')->orderBy('deadline')->get();

        $fmt = fn (Item $i) => [
            'id' => $i->id,
            'number' => str_pad((string) $i->number, 4, '0', STR_PAD_LEFT),
            'title' => $i->title,
            'deadline' => $i->deadline?->toDateString(),
        ];

        // Net of undone completions; spending in the Locker is not "un-earning".
        $earned = max(0, (int) $user->ledger()->whereBetween('created_at', [$weekStart, $weekEnd])
            ->where('reason', '!=', LedgerReason::Purchase->value)->sum('delta'));

        return response()->json([
            'range' => $weekStart->format('j M').' – '.$weekEnd->format('j M Y'),
            'finished' => $done->count(),
            'earned' => $earned,
            'openCount' => $open->count(),
            'streak' => ['current' => $user->streak?->active() ?? 0, 'length' => (int) config('locker.streak_length')],
            'done' => $done->map(fn (Item $i) => [...$fmt($i), 'tokens' => $i->reward_tokens, 'day' => $i->completed_at->toDateString()]),
            'carry' => $open->map(fn (Item $i) => [...$fmt($i), 'tokens' => $i->rewardOn()]),
            'openTokens' => $open->sum(fn (Item $i) => $i->rewardOn()),
        ]);
    }
}