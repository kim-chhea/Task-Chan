<?php

namespace App\Http\Controllers;

use App\Http\Resources\ItemResource;
use App\Models\MasterRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        return response()->json([
            'record' => $masterRecord,
            'items' => ItemResource::collection($masterRecord->items()->orderByDesc('number')->get())->resolve(),
        ]);
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