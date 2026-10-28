<?php

namespace App\Http\Controllers;

use App\Http\Resources\ItemResource;
use App\Models\Item;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $inbox = $this->items($userId)->inbox()->get();
        $someday = $this->items($userId)->someday()->get();
        $res = fn ($items) => ItemResource::collection($items)->resolve();

        return response()->json([
            'inbox' => $res($inbox),
            'someday' => $res($someday),
            'counts' => [
                'inbox' => $inbox->count(),
                'someday' => $someday->count(),
            ],
        ]);
    }

    /** This user's items, oldest number first. Inbox and Someday scopes narrow it. */
    private function items(int $userId): Builder
    {
        return Item::query()
            ->where('user_id', $userId)
            ->with('masterRecord')
            ->orderBy('number');
    }
}
