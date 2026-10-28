<?php

namespace App\Http\Controllers\Api;

use App\Actions\ChangeItemStatus;
use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use App\Exceptions\InsufficientTokensException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Services\CustomValues;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ItemApiController extends Controller
{
    public function store(StoreItemRequest $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validated();

        $item = DB::transaction(function () use ($user, $request, $validated) {
            $attributes = [
                'user_id' => $user->id,
                'number' => Item::nextNumber($user->id),
                'title' => $request->string('title')->trim()->toString(),
                'type' => $request->input('type', ItemType::Task->value),
                'priority' => $request->input('priority', Priority::Medium->value),
                'sector' => $request->input('sector'),
                'deadline' => $request->input('deadline'),
                'master_record_id' => $request->input('master_record_id'),
                'received_at' => now()->toDateString(),
            ];
            if (array_key_exists('someday', $validated)) {
                $attributes['someday'] = $validated['someday'];
            }

            return Item::create($this->normalizeSomeday($attributes));
        });

        return $this->payload($item->fresh(), 201);
    }

    public function update(UpdateItemRequest $request, Item $item): JsonResponse
    {
        $data = $request->validated();
        if (array_key_exists('custom_values', $data)) {
            $data['custom_values'] = CustomValues::merge($request->user(), $data['custom_values'] ?? [], $item->custom_values ?? []) ?: null;
        }
        $item->update($this->normalizeSomeday($data));

        return $this->payload($item);
    }

    public function status(Request $request, Item $item, ChangeItemStatus $change): JsonResponse
    {
        $this->authorize('manage', $item);
        $data = $request->validate(['status' => ['required', Rule::in([...array_column(ItemStatus::cases(), 'value'), 'previous'])]]);

        // "previous" puts a Done item back where it was before it was completed.
        $to = $data['status'] === 'previous'
            ? ItemStatus::from($item->status_before_done ?? 'not_started')
            : ItemStatus::from($data['status']);

        try {
            $result = $change($item, $to);
        } catch (InsufficientTokensException $e) {
            return response()->json([
                'message' => "You have already spent tokens from this item. Earn {$e->needed} more to undo it.",
                'needed' => $e->needed,
                'balance' => $item->user->balance(),
            ], 422);
        }

        return $this->payload($item->fresh(), 200, $result);
    }

    public function destroy(Item $item): JsonResponse
    {
        $this->authorize('manage', $item);
        $item->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * A non-null deadline in this payload leaves Someday.
     * Parking (someday true) clears the deadline. A deadline sent alongside someday wins.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeSomeday(array $data): array
    {
        if (array_key_exists('someday', $data)) {
            $data['someday'] = filter_var($data['someday'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('deadline', $data) && $data['deadline'] !== null) {
            $data['someday'] = false;

            return $data;
        }

        if (($data['someday'] ?? false) === true) {
            $data['deadline'] = null;
        }

        return $data;
    }

    /** Every response carries the authoritative balance so the UI can reconcile. */
    private function payload(Item $item, int $status = 200, array $extra = []): JsonResponse
    {
        $item->load('masterRecord')->loadCount('subTasks');

        return response()->json([
            'item' => new ItemResource($item),
            'balance' => $item->user->balance(),
            'streak' => $item->user->streak?->active() ?? 0,
            ...$extra,
        ], $status);
    }
}
