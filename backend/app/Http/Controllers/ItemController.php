<?php

namespace App\Http\Controllers;

use App\Enums\ItemStatus;
use App\Http\Controllers\Api\ItemColumns;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\MasterRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $term = $this->searchTerm($request);
        $userId = $request->user()->id;
        $filters = [
            'status' => $request->query('status', 'all'),
            'type' => $request->query('type', 'all'),
            'sector' => $request->query('sector', 'all'),
            'range' => $request->query('range', 'all'),
            'q' => $term,
        ];

        $q = Item::where('user_id', $userId)->with('masterRecord');
        if ($filters['status'] !== 'all') {
            $q->where('status', $filters['status']);
        }
        if ($filters['type'] !== 'all') {
            $q->where('type', $filters['type']);
        }
        if ($filters['sector'] !== 'all') {
            $q->where('sector', $filters['sector']);
        }
        if ($filters['range'] === '30') {
            $q->whereBetween('deadline', [now()->toDateString(), now()->addDays(30)->toDateString()]);
        }
        if ($term !== '') {
            $q->whereSearch($term);
        }

        $matched = (clone $q)->count();
        $items = $q->orderByRaw('deadline is null')->orderByDesc('number')->limit(500)->get();

        $all = Item::where('user_id', $userId)->get(['status', 'priority', 'deadline']);
        $openTokens = $all->where('status', '!=', ItemStatus::Done)->sum(fn (Item $i) => $i->rewardOn());

        return response()->json([
            'items' => ItemResource::collection($items)->resolve(),
            'filters' => $filters,
            'matched' => $matched,
            'total' => $all->count(),
            'openTokens' => $openTokens,
            'fields' => $request->user()->customFields->map->toDto()->values(),
            'columns' => $this->columns($request->user()),
            'sectors' => Item::where('user_id', $userId)->whereNotNull('sector')->distinct()->orderBy('sector')->pluck('sector'),
        ]);
    }

    public function show(Request $request, Item $item): JsonResponse
    {
        $this->authorize('manage', $item);
        $item->load(['masterRecord', 'subTasks', 'attachments']);
        $userId = $request->user()->id;

        $linkedIds = $item->links()->pluck('items.id')
            ->merge(\DB::table('item_links')->where('linked_item_id', $item->id)->pluck('item_id'))->unique();

        return response()->json([
            'item' => [
                ...(new ItemResource($item))->resolve(),
                'notes' => $item->notes,
                'sub_tasks' => $item->subTasks->map(fn ($s) => ['id' => $s->id, 'title' => $s->title, 'done' => $s->done]),
                'attachments' => $item->attachments->map(fn ($a) => [
                    'id' => $a->id, 'name' => $a->original_name, 'size' => $a->size, 'mime' => $a->mime,
                    'url' => route('attachments.download', $a, absolute: false),
                ]),
            ],
            'linked' => ItemResource::collection(Item::where('user_id', $userId)->whereIn('id', $linkedIds)->get())->resolve(),
            'linkable' => Item::where('user_id', $userId)->where('id', '!=', $item->id)->whereNotIn('id', $linkedIds)
                ->orderByDesc('number')->limit(100)->get(['id', 'number', 'title'])
                ->map(fn ($i) => ['id' => $i->id, 'number' => str_pad((string) $i->number, 4, '0', STR_PAD_LEFT), 'title' => $i->title]),
            'fields' => $request->user()->customFields->map->toDto()->values(),
            'cases' => MasterRecord::where('user_id', $userId)->orderBy('code')->get(['id', 'code', 'title']),
        ]);
    }

    /** Trimmed `q`, or 422 when it is not a string of at most 100 characters. */
    private function searchTerm(Request $request): string
    {
        $raw = $request->query('q', '');
        if (is_string($raw)) {
            $request->merge(['q' => trim($raw)]);
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        return trim((string) ($validated['q'] ?? ''));
    }

    /** Saved column layout, pruned of fields that no longer exist. */
    private function columns($user): array
    {
        $ids = $user->customFields->pluck('id')->map(fn ($id) => "cf:$id")->all();
        $allowed = [...ItemColumns::BUILTIN, ...$ids];

        return array_values(array_filter(
            $user->items_columns ?? ItemColumns::DEFAULT,
            fn ($c) => in_array($c, $allowed, true),
        ));
    }
}
