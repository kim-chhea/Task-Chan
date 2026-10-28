<?php

namespace App\Http\Controllers;

use App\Actions\CreateTaskBatch;
use App\Enums\ItemStatus;
use App\Http\Requests\TaskLines;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\MasterRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class MasterRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'records' => MasterRecord::where('user_id', $request->user()->id)->withCount('items')
                ->orderByDesc('session_date')->orderBy('code')->get(),
        ]);
    }

    public function show(MasterRecord $masterRecord): JsonResponse
    {
        $this->authorize('manage', $masterRecord);
        $items = $masterRecord->items()->orderByDesc('number')->get();

        return response()->json([
            'record' => $masterRecord,
            'items' => ItemResource::collection($items)->resolve(),
            'stats' => $this->stats($items),
        ]);
    }

    public function spawn(Request $request, MasterRecord $masterRecord, CreateTaskBatch $create): JsonResponse
    {
        $this->authorize('manage', $masterRecord);

        $created = $create($request->user(), TaskLines::validate($request), $masterRecord->id);

        return response()->json([
            'items' => $create->present($created),
            'record' => [
                'id' => $masterRecord->id,
                'code' => $masterRecord->code,
                'title' => $masterRecord->title,
            ],
            'balance' => $request->user()->balance(),
            'streak' => $request->user()->streak?->active() ?? 0,
        ], 201);
    }

    public function store(Request $request): JsonResponse
    {
        $record = $request->user()->masterRecords()->create($this->rules($request));

        return response()->json($record, 201);
    }

    public function update(Request $request, MasterRecord $masterRecord): JsonResponse
    {
        $this->authorize('manage', $masterRecord);
        $masterRecord->update($this->rules($request, $masterRecord));

        return response()->json($masterRecord->refresh());
    }

    public function destroy(MasterRecord $masterRecord): JsonResponse
    {
        $this->authorize('manage', $masterRecord);
        $masterRecord->delete();

        return response()->json(null, 204);
    }

    /**
     * @param  Collection<int, Item>  $items
     * @return array{total: int, open: int, done: int, next_deadline: ?string, open_tokens: int}
     */
    private function stats(Collection $items): array
    {
        $done = $items->filter(fn (Item $item) => $item->status === ItemStatus::Done)->count();
        $open = $items->reject(fn (Item $item) => $item->status === ItemStatus::Done);
        $nextDeadline = $open
            ->map(fn (Item $item) => $item->deadline?->toDateString())
            ->filter()
            ->sort()
            ->values()
            ->first();

        return [
            'total' => $items->count(),
            'open' => $items->count() - $done,
            'done' => $done,
            'next_deadline' => $nextDeadline,
            'open_tokens' => (int) $open->sum(fn (Item $item) => $item->rewardOn()),
        ];
    }

    private function rules(Request $request, ?MasterRecord $record = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:32', Rule::unique('master_records')->where('user_id', $request->user()->id)->ignore($record?->id)],
            'title' => ['required', 'string', 'max:255'],
            'session_date' => ['nullable', 'date_format:Y-m-d'],
            'student_count' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
