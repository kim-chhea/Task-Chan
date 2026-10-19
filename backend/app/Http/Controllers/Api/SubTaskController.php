<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\SubTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubTaskController extends Controller
{
    public function store(Request $request, Item $item): JsonResponse
    {
        $this->authorize('manage', $item);
        $data = $request->validate(['title' => ['required', 'string', 'max:255']]);

        $sub = $item->subTasks()->create([
            'title' => $data['title'],
            'position' => (int) $item->subTasks()->max('position') + 1,
        ]);

        return response()->json($sub, 201);
    }

    public function update(Request $request, SubTask $subTask): JsonResponse
    {
        $this->authorize('manage', $subTask->item);
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'done' => ['sometimes', 'boolean'],
        ]);
        $subTask->update($data);

        return response()->json($subTask);
    }

    public function destroy(SubTask $subTask): JsonResponse
    {
        $this->authorize('manage', $subTask->item);
        $subTask->delete();

        return response()->json(['ok' => true]);
    }
}