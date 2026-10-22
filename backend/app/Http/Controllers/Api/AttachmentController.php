<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function store(Request $request, Item $item): JsonResponse
    {
        $this->authorize('manage', $item);
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,png,jpg,jpeg,gif,webp,txt,md,csv,docx,xlsx,zip'],
        ], [
            'file.max' => 'The file must be 10 MB or smaller.',
            'file.mimes' => 'This file type is not allowed.',
        ]);

        $file = $request->file('file');
        $disk = config('filesystems.default');
        $path = $file->store("attachments/{$item->user_id}/{$item->id}", $disk);

        $att = $item->attachments()->create([
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($att, 201);
    }

    public function download(Attachment $attachment): StreamedResponse
    {
        $this->authorize('manage', $attachment->item);

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_name);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        $this->authorize('manage', $attachment->item);
        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();

        return response()->json(['ok' => true]);
    }
}
