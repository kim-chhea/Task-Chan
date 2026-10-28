<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Data every screen needs: who is logged in, token balance, equipped cosmetics, the catalog and the reward rules. */
class BootstrapController extends Controller
{
    public static function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
        ];
    }

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'auth' => ['user' => $user ? self::userPayload($user) : null],
            'canRegister' => ! User::query()->exists(),
            'game' => $user ? [
                'balance' => $user->balance(),
                'mascot' => $user->mascot,
                'equipped' => [
                    'hair' => $user->equipped_hair,
                    'outfit' => $user->equipped_outfit,
                    'gear' => $user->equipped_gear,
                    'partner' => $user->equipped_partner,
                    'stage' => $user->active_stage,
                ],
                'streak' => $user->streak?->active() ?? 0,
            ] : null,
            'catalog' => config('locker.items'),
            'rules' => [
                'rewards' => config('locker.rewards'),
                'early_bonus' => config('locker.early_bonus'),
                'streak_bonus' => (int) config('locker.streak_bonus'),
                'streak_length' => (int) config('locker.streak_length'),
            ],
        ]);
    }
}
