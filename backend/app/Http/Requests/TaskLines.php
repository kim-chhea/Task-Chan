<?php

namespace App\Http\Requests;

use App\Enums\Priority;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared `{ items: [1..20 lines] }` body for follow-ups and master spawn. */
class TaskLines
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function validate(Request $request): array
    {
        $items = $request->input('items');
        if (is_array($items)) {
            $request->merge([
                'items' => array_map(function ($line) {
                    if (is_array($line) && array_key_exists('title', $line) && is_string($line['title'])) {
                        $line['title'] = trim($line['title']);
                    }

                    return $line;
                }, $items),
            ]);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.title' => ['required', 'string', 'max:255'],
            'items.*.deadline' => ['nullable', 'date_format:Y-m-d'],
            'items.*.priority' => ['nullable', Rule::enum(Priority::class)],
            'items.*.sector' => ['nullable', 'string', 'max:80'],
            'items.*.someday' => ['sometimes', 'boolean'],
        ]);

        return array_values($validated['items']);
    }
}
