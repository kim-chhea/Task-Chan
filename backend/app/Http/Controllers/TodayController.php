<?php

namespace App\Http\Controllers;

use App\Enums\ItemStatus;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TodayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();
        $base = fn () => Item::where('user_id', $user->id);

        $relevant = $base()
            ->where(function ($q) use ($today) {
                $q->where('status', '!=', ItemStatus::Done->value)
                    ->orWhereDate('completed_at', $today);
            })
            ->orderByRaw('deadline is null')->orderBy('deadline')->orderBy('number')
            ->get();

        $isDueToday = fn (Item $i) => $i->deadline !== null && $i->deadline->toDateString() <= $today
            && ($i->status !== ItemStatus::Done || $i->completed_at?->toDateString() === $today);

        $dueToday = $relevant->filter($isDueToday)->values();
        $rest = $relevant->reject($isDueToday);
        $inProgress = $rest->where('status', ItemStatus::InProgress)->values();
        $comingUp = $rest->where('status', ItemStatus::NotStarted)->take(8)->values();

        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();
        $weekCounts = $base()->whereBetween('deadline', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get(['deadline'])->countBy(fn ($i) => $i->deadline->toDateString());

        $week = collect(range(0, 6))->map(function ($i) use ($weekStart, $weekCounts, $today) {
            $d = $weekStart->copy()->addDays($i);

            return [
                'dow' => substr($d->format('D'), 0, 1),
                'n' => $d->day,
                'date' => $d->toDateString(),
                'count' => $weekCounts[$d->toDateString()] ?? 0,
                'today' => $d->toDateString() === $today,
            ];
        });

        $res = fn ($c) => ItemResource::collection($c->load('masterRecord'))->resolve();

        return response()->json([
            'today' => $today,
            'groups' => [
                'due' => $res($dueToday),
                'in_progress' => $res($inProgress),
                'coming_up' => $res($comingUp),
            ],
            'progress' => [
                'done' => $dueToday->where('status', ItemStatus::Done)->count(),
                'total' => $dueToday->count(),
            ],
            'week' => $week,
            'weekRange' => $weekStart->format('j M').' – '.$weekEnd->format('j M'),
            'weekDone' => $base()->whereBetween('completed_at', [$weekStart, $weekEnd])->count(),
        ]);
    }
}