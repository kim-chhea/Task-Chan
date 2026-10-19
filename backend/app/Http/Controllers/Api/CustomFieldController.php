<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomField;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomFieldController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $this->validated($request);
        abort_if(CustomField::where('user_id', $user->id)->count() >= 20, 422, 'You can have up to 20 custom fields.');

        $field = CustomField::create([
            ...$data,
            'user_id' => $user->id,
            'position' => (int) CustomField::where('user_id', $user->id)->max('position') + 1,
        ]);

        // A new field shows up as a column right away.
        // The column is stored as "cf:<id>" so it doesn't conflict with the built-in columns.
        $cols = $user->items_columns ?? ItemColumns::DEFAULT;
        $user->update(['items_columns' => [...$cols, "cf:{$field->id}"]]);

        return response()->json(['field' => $field->toDto(), 'columns' => $user->fresh()->items_columns], 201);
    }

    public function update(Request $request, CustomField $field): JsonResponse
    {
        $this->authorize('manage', $field);
        $data = $this->validated($request, $field);

        // The type is fixed after creation so stored values stay valid; only selects keep options.
        unset($data['type']);
        if ($field->type !== 'select') {
            unset($data['options']);
        }
        $field->update($data);

        return response()->json(['field' => $field->fresh()->toDto()]);
    }

    public function destroy(Request $request, CustomField $field): JsonResponse
    {
        $this->authorize('manage', $field);
        $user = $request->user();
        $key = (string) $field->id;

        // Drop the field's values from items and its column from the layout.
        Item::withTrashed()->where('user_id', $user->id)->whereNotNull('custom_values')->each(function (Item $item) use ($key) {
            $v = $item->custom_values ?? [];
            if (array_key_exists($key, $v)) {
                unset($v[$key]);
                $item->forceFill(['custom_values' => $v ?: null])->saveQuietly();
            }
        });
        $user->update(['items_columns' => array_values(array_diff($user->items_columns ?? ItemColumns::DEFAULT, ["cf:$key"]))]);
        $field->delete();

        return response()->json(['ok' => true, 'columns' => $user->fresh()->items_columns]);
    }

    private function validated(Request $request, ?CustomField $field = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('custom_fields')->where('user_id', $request->user()->id)->ignore($field?->id)],
            'type' => [$field ? 'sometimes' : 'required', Rule::in(CustomField::TYPES)],
            'options' => ['nullable', 'array', 'max:30'],
            'options.*' => ['string', 'max:40', 'distinct'],
        ]);
        $type = $field?->type ?? $data['type'];
        if ($type === 'select' && empty($data['options'])) {
            abort(422, 'A dropdown needs at least one option.');
        }
        if ($type !== 'select') {
            $data['options'] = null;
        }

        return $data;
    }
}
