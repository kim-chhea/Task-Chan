<?php

namespace App\Http\Controllers\Api;

use App\Actions\ChangeItemStatus;
use App\Actions\CreateTaskBatch;
use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\Priority;
use App\Exceptions\InsufficientTokensException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\TaskLines;
use App\Http\Requests\UpdateItemRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Services\CustomValues;
use App\Support\Someday;
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

            return Item::create(Someday::normalize($attributes));
        });

        return $this->payload($item->fresh(), 201);
    }

    public function followUps(Request $request, Item $item, CreateTaskBatch $create): JsonResponse
    {
        $this->authorize('manage', $item);

        if ($item->type !== ItemType::Meeting) {
            return response()->json([
                'message' => 'Follow-ups only work on Meeting items.',
            ], 422);
        }

        $created = $create($request->user(), TaskLines::validate($request), $item->master_record_id, $item);

        return response()->json([
            'items' => $create->present($created),
            'linked_to' => [
                'id' => $item->id,
                'number' => str_pad((string) $item->number, 4, '0', STR_PAD_LEFT),
                'title' => $item->title,
                'type' => $item->type->value,
            ],
            'balance' => $request->user()->balance(),
            'streak' => $request->user()->streak?->active() ?? 0,
        ], 201);
    }

    public function update(UpdateItemRequest $request, Item $item): JsonResponse
    {
        $data = $request->validated();
        if (array_key_exists('custom_values', $data)) {
            $data['custom_values'] = CustomValues::merge($request->user(), $data['custom_values'] ?? [], $item->custom_values ?? []) ?: null;
        }
        $item->update(Someday::normalize($data));

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
