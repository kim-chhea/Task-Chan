<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientTokensException;
use App\Http\Controllers\Controller;
use App\Models\OwnedCosmetic;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class LockerApiController extends Controller
{
    public function __construct(private TokenService $tokens) {}

    public function buy(Request $request): JsonResponse
    {
        [$category, $key] = $this->validated($request);

        try {
            // Buy and equip succeed or fail together.
            $balance = DB::transaction(function () use ($request, $category, $key) {
                $balance = $this->tokens->purchase($request->user(), $category, $key);
                $this->tokens->equip($request->user(), $category, $key);

                return $balance;
            });
        } catch (InsufficientTokensException $e) {
            return response()->json(['message' => $e->getMessage(), 'needed' => $e->needed, 'balance' => $e->balance], 422);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->state($request, $balance);
    }

    public function equip(Request $request): JsonResponse
    {
        [$category, $key] = $this->validated($request);

        try {
            $this->tokens->equip($request->user(), $category, $key);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->state($request);
    }

    public function mascot(Request $request): JsonResponse
    {
        $data = $request->validate(['mascot' => ['required', Rule::in(['kai', 'ren', 'sora', 'haru'])]]);
        $request->user()->update($data);

        return $this->state($request);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'category' => ['required', Rule::in(config('locker.categories'))],
            'key' => ['required', 'string', 'max:32'],
        ]);

        return [$data['category'], $data['key']];
    }

    private function state(Request $request, ?int $balance = null): JsonResponse
    {
        $user = $request->user()->fresh();

        return response()->json([
            'balance' => $balance ?? $user->balance(),
            'mascot' => $user->mascot,
            'equipped' => [
                'hair' => $user->equipped_hair,
                'outfit' => $user->equipped_outfit,
                'gear' => $user->equipped_gear,
                'partner' => $user->equipped_partner,
                'stage' => $user->active_stage,
            ],
            'owned' => OwnedCosmetic::where('user_id', $user->id)->get(['category', 'key'])
                ->map(fn ($o) => "{$o->category}:{$o->key}")->values(),
        ]);
    }
}