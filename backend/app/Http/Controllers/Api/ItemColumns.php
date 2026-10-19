<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Which columns the All items table shows, and in what order (saved per user). */
class ItemColumns extends Controller
{
    public const BUILTIN = ['number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'received_at', 'reward'];

    public const DEFAULT = ['number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'reward'];

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['columns' => ['required', 'array', 'max:40'], 'columns.*' => ['string']]);

        $allowed = [...self::BUILTIN, ...CustomField::where('user_id', $user->id)->pluck('id')->map(fn ($id) => "cf:$id")->all()];
        $cols = collect($data['columns'])->unique()->filter(fn ($c) => in_array($c, $allowed, true))->values();

        // The title is what you click to open an item, so it can never be hidden.
        if (! $cols->contains('title')) {
            $cols->prepend('title');
        }
        $user->update(['items_columns' => $cols->all()]);

        return response()->json(['columns' => $cols->all()]);
    }
}
