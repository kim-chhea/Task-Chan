<?php

namespace App\Http\Controllers;

use App\Models\OwnedCosmetic;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LockerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'owned' => OwnedCosmetic::where('user_id', $request->user()->id)->get(['category', 'key'])
                ->map(fn ($o) => "{$o->category}:{$o->key}")->values(),
            'categories' => config('locker.categories'),
            'rewards' => config('locker.rewards'),
            'earlyBonus' => config('locker.early_bonus'),
            'streakBonus' => config('locker.streak_bonus'),
            'streakLength' => config('locker.streak_length'),
        ]);
    }
}