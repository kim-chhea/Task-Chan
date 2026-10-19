<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemLinkController extends Controller
{
    public function store(Request $request, Item $item): JsonResponse
    {
        $this->authorize('manage', $item);
        $data = $request->validate([
            'linked_item_id' => ['required', Rule::exists('items', 'id')->where('user_id', $request->user()->id)],
        ]);
        abort_if((int) $data['linked_item_id'] === $item->id, 422, 'Cannot link an item to itself.');

        $item->links()->syncWithoutDetaching([$data['linked_item_id']]);

        return response()->json(['ok' => true], 201);
    }

    public function destroy(Request $request, Item $item, Item $linked): JsonResponse
    {
        $this->authorize('manage', $item);
        $this->authorize('manage', $linked);
        $item->links()->detach($linked->id);
        $linked->links()->detach($item->id);

        return response()->json(['ok' => true]);
    }
}